"""Visits router — /api/visits (Part 1 §6.3, Part 6 §1.1)."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from pharmasense.dependencies.auth import AuthenticatedUser, get_current_user, require_role
from pharmasense.schemas.common import ApiResponse
from pharmasense.schemas.prescription_ops import AnalyticsEventType
from pharmasense.services.analytics_service import AnalyticsService
from pharmasense.services.supabase_client import SupabaseClient, get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/visits", tags=["visits"])


class CreateVisitRequest(BaseModel):
    patient_id: str
    chief_complaint: str | None = None
    notes: str | None = None
    current_medications: list[str] = []
    allergies: list[str] = []
    diagnosis: str | None = None


class CompleteVisitRequest(BaseModel):
    duration_minutes: float | None = None
    prescriptions_count: int = 0


def _analytics() -> AnalyticsService:
    return AnalyticsService(session=None)


@router.post("")
async def create_visit(
    request: CreateVisitRequest,
    user: AuthenticatedUser = Depends(require_role("clinician")),
    supa: SupabaseClient = Depends(get_supabase),
) -> ApiResponse[dict]:
    # Find clinician row
    clinician = await supa.select_one("clinicians", filters={"user_id": f"eq.{user.user_id}"})
    if not clinician:
        raise Exception("Clinician record not found")

    # Find patient row (frontend sends the patient table primary key as patient_id)
    patient = await supa.select_one("patients", filters={"id": f"eq.{request.patient_id}"})
    if not patient:
        raise Exception("Patient not found")

    row = await supa.insert("visits", {
        "patient_id": patient["id"],
        "clinician_id": clinician["id"],
        "status": "in_progress",
        "chief_complaint": request.chief_complaint,
        "notes": request.notes or "",
    })

    visit_id = row.get("id", "")
    _analytics().emit(
        AnalyticsEventType.VISIT_CREATED,
        {"visitId": visit_id, "patientId": request.patient_id},
        user_id=str(user.user_id),
    )
    return ApiResponse.ok({
        "id": visit_id,
        "patientId": request.patient_id,
        "clinicianId": str(user.user_id),
        "status": "in_progress",
        "notes": request.notes or "",
        "extractedData": None,
        "createdAt": row.get("created_at", ""),
    })


@router.get("")
async def list_visits(
    patient_id: str | None = None,
    user: AuthenticatedUser = Depends(get_current_user),
    supa: SupabaseClient = Depends(get_supabase),
) -> ApiResponse[list]:
    if user.role == "clinician":
        clinician = await supa.select_one("clinicians", filters={"user_id": f"eq.{user.user_id}"})
        if not clinician:
            return ApiResponse.ok([])
        filters: dict = {"clinician_id": f"eq.{clinician['id']}"}
        if patient_id:
            filters["patient_id"] = f"eq.{patient_id}"
        rows = await supa.select("visits", filters=filters, order="created_at.desc")
    else:
        patient = await supa.select_one("patients", filters={"user_id": f"eq.{user.user_id}"})
        if not patient:
            return ApiResponse.ok([])
        rows = await supa.select("visits", filters={"patient_id": f"eq.{patient['id']}"}, order="created_at.desc")

    # Batch-count approved prescriptions per visit
    prescription_counts: dict[str, int] = {}
    if rows:
        id_list = ",".join(r["id"] for r in rows)
        try:
            prx_rows = await supa.select(
                "prescriptions",
                columns="visit_id",
                filters={"visit_id": f"in.({id_list})", "status": "eq.approved"},
            )
            for prx in prx_rows:
                vid = str(prx.get("visit_id", ""))
                prescription_counts[vid] = prescription_counts.get(vid, 0) + 1
        except Exception:
            pass  # non-fatal; fall back to no count

    return ApiResponse.ok([{
        "id": r["id"],
        "patientId": r.get("patient_id", ""),
        "status": r.get("status", ""),
        "reason": r.get("chief_complaint", ""),
        "notes": r.get("notes", ""),
        "createdAt": r.get("created_at", ""),
        "prescriptionCount": prescription_counts.get(r["id"]) or None,
    } for r in rows])


@router.get("/{visit_id}")
async def get_visit(
    visit_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    supa: SupabaseClient = Depends(get_supabase),
) -> ApiResponse[dict]:
    row = await supa.select_one("visits", filters={"id": f"eq.{visit_id}"})
    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Visit not found")
    return ApiResponse.ok({
        "id": row["id"],
        "status": row.get("status", ""),
        "chiefComplaint": row.get("chief_complaint", ""),
        "notes": row.get("notes", ""),
        "extractedData": row.get("extracted_data"),
        "createdAt": row.get("created_at", ""),
    })


class UpdateVisitRequest(BaseModel):
    status: str | None = None
    notes: str | None = None
    chief_complaint: str | None = None


@router.put("/{visit_id}")
async def update_visit(
    visit_id: str,
    request: UpdateVisitRequest,
    user: AuthenticatedUser = Depends(require_role("clinician")),
    supa: SupabaseClient = Depends(get_supabase),
) -> ApiResponse[dict]:
    updates: dict = {}
    if request.status is not None:
        updates["status"] = request.status.lower()
    if request.notes is not None:
        updates["notes"] = request.notes
    if request.chief_complaint is not None:
        updates["chief_complaint"] = request.chief_complaint
    if updates:
        await supa.update("visits", filters={"id": f"eq.{visit_id}"}, data=updates)
    return ApiResponse.ok({"id": visit_id, "status": updates.get("status", "updated")})


@router.post("/{visit_id}/complete")
async def complete_visit(
    visit_id: str,
    request: CompleteVisitRequest,
    user: AuthenticatedUser = Depends(require_role("clinician")),
    supa: SupabaseClient = Depends(get_supabase),
) -> ApiResponse[dict]:
    await supa.update("visits", filters={"id": f"eq.{visit_id}"}, data={"status": "completed"})
    _analytics().emit(
        AnalyticsEventType.VISIT_COMPLETED,
        {"visitId": visit_id, "clinicianId": str(user.user_id),
         "durationMinutes": request.duration_minutes,
         "prescriptionsCount": request.prescriptions_count},
        user_id=str(user.user_id),
    )
    return ApiResponse.ok({"id": visit_id, "status": "completed"})


@router.get("/{visit_id}/prescriptions")
async def list_visit_prescriptions(
    visit_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    supa: SupabaseClient = Depends(get_supabase),
) -> ApiResponse[list]:
    """Return prescriptions for a visit as PrescriptionSummary objects."""
    import uuid as _uuid
    from pharmasense.routers.prescriptions import _get_shared_store

    summaries: list[dict] = []

    # Try in-memory store first (populated during the current server session)
    store = _get_shared_store()
    try:
        vid = _uuid.UUID(visit_id)
    except ValueError:
        return ApiResponse.ok([])

    in_memory = store.list_by_visit(vid)
    logger.info("list_visit_prescriptions: visit=%s in_memory=%d", visit_id, len(in_memory))
    if in_memory:
        for rx in in_memory:
            rx_id = str(rx.get("id", ""))
            rx_status = rx.get("status", "")
            for item_dict in rx.get("items", []):
                primary = item_dict.get("primary", {}) if isinstance(item_dict, dict) else {}
                if not primary:
                    continue
                summaries.append({
                    "prescriptionId": rx_id,
                    "drugName": primary.get("drug_name", "Unknown"),
                    "genericName": primary.get("generic_name", ""),
                    "dosage": primary.get("dosage", ""),
                    "frequency": primary.get("frequency", ""),
                    "duration": primary.get("duration", ""),
                    "status": rx_status,
                    "isCovered": primary.get("is_covered"),
                    "estimatedCopay": primary.get("estimated_copay"),
                    "tier": primary.get("tier"),
                })
    else:
        # Fall back to Supabase (persisted across server restarts)
        try:
            prx_rows = await supa.select(
                "prescriptions", filters={"visit_id": f"eq.{visit_id}"}
            )
            logger.info("list_visit_prescriptions: supabase found %d prescription rows", len(prx_rows))
            for prx in prx_rows:
                prx_id = str(prx.get("id", ""))
                items = await supa.select(
                    "prescription_items",
                    filters={"prescription_id": f"eq.{prx_id}"},
                )
                for item in items:
                    summaries.append({
                        "prescriptionId": prx_id,
                        "drugName": item.get("drug_name", "Unknown"),
                        "genericName": item.get("generic_name", ""),
                        "dosage": item.get("dosage", ""),
                        "frequency": item.get("frequency", ""),
                        "duration": item.get("duration", ""),
                        "status": prx.get("status", ""),
                        "isCovered": item.get("is_covered"),
                        "estimatedCopay": (
                            float(item["copay"]) if item.get("copay") is not None else None
                        ),
                        "tier": item.get("tier"),
                    })
        except Exception as exc:
            logger.warning("Failed to load prescriptions from Supabase: %s", exc)

    return ApiResponse.ok(summaries)


@router.post("/{visit_id}/extract")
async def extract_visit(
    visit_id: str,
    user: AuthenticatedUser = Depends(require_role("clinician")),
) -> ApiResponse[dict]:
    return ApiResponse.ok({"id": visit_id})
