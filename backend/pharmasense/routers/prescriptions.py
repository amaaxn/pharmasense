"""Prescription router — /api/prescriptions (Part 2B §5).

Each endpoint delegates to ``PrescriptionService`` and wraps the result in
the standard ``ApiResponse`` envelope.
"""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from pharmasense.config import settings
from pharmasense.exceptions import (
    ResourceNotFoundError,
    SafetyBlockError,
    ValidationError,
)
from pharmasense.schemas.common import ApiResponse
from pharmasense.schemas.formulary_service import FormularyEntryData
from pharmasense.schemas.gemini import PatientInstructionsOutput
from pharmasense.schemas.prescription_ops import (
    PrescriptionApprovalRequest,
    PrescriptionRejectionRequest,
)
from pharmasense.schemas.receipt import PrescriptionReceipt
from pharmasense.schemas.recommendation import (
    RecommendationRequest,
    RecommendationResponse,
)
from pharmasense.schemas.rules_engine import DoseRangeData, DrugInteractionData
from pharmasense.schemas.validation import (
    ValidationRequest,
    ValidationResponse,
)
from pharmasense.services.analytics_service import AnalyticsService
from pharmasense.services.formulary_service import FormularyService
from pharmasense.services.supabase_client import SupabaseClient, get_supabase
from pharmasense.services.gemini_service import GeminiService
from pharmasense.services.prescription_service import PrescriptionService
from pharmasense.services.rules_engine_service import RulesEngineService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/prescriptions", tags=["prescriptions"])

_gemini = GeminiService(settings)
_rules = RulesEngineService()
_formulary_svc = FormularyService()

_shared_store: Any = None


def _get_shared_store():
    from pharmasense.services.prescription_service import _InMemoryPrescriptionStore

    global _shared_store
    if _shared_store is None:
        _shared_store = _InMemoryPrescriptionStore()
    return _shared_store


def _get_prescription_service() -> PrescriptionService:
    analytics = AnalyticsService(session=None)
    return PrescriptionService(
        gemini_service=_gemini,
        rules_engine=_rules,
        formulary_service=_formulary_svc,
        analytics_service=analytics,
        store=_get_shared_store(),
    )


async def _load_formulary(supa: SupabaseClient) -> list[FormularyEntryData]:
    rows = await supa.select("formulary_entries")
    return [
        FormularyEntryData(
            drug_name=r["medication_name"],
            generic_name=r.get("generic_name", ""),
            plan_name=r.get("plan_name", ""),
            tier=r["tier"],
            copay=float(r.get("copay", 0)),
            is_covered=r.get("covered", True),
            requires_prior_auth=r.get("prior_auth_required", False),
            quantity_limit=r.get("quantity_limit", ""),
            step_therapy_required=r.get("step_therapy_required", False),
        )
        for r in rows
    ]


async def _load_interactions(supa: SupabaseClient) -> list[DrugInteractionData]:
    rows = await supa.select("drug_interactions")
    return [
        DrugInteractionData(
            drug_a=r["drug_a"],
            drug_b=r["drug_b"],
            severity=r["severity"],
            description=r["description"],
        )
        for r in rows
    ]


async def _load_dose_ranges(supa: SupabaseClient) -> list[DoseRangeData]:
    rows = await supa.select("dose_ranges")
    return [
        DoseRangeData(
            medication_name=r["medication_name"],
            min_dose_mg=r["min_dose_mg"],
            max_dose_mg=r["max_dose_mg"],
            unit=r.get("unit", "mg"),
            frequency=r.get("frequency", "once daily"),
        )
        for r in rows
    ]


# ---------------------------------------------------------------------------
# POST /api/prescriptions/recommend
# ---------------------------------------------------------------------------

@router.post("/recommend", response_model=ApiResponse[RecommendationResponse])
async def recommend(
    request: RecommendationRequest,
    svc: PrescriptionService = Depends(_get_prescription_service),
    supa: SupabaseClient = Depends(get_supabase),
) -> ApiResponse[RecommendationResponse]:
    logger.info("Recommendation request for visit %s", request.visit_id)
    try:
        formulary = await _load_formulary(supa)
        interactions = await _load_interactions(supa)
        dose_ranges = await _load_dose_ranges(supa)
        result = await svc.generate_recommendations(
            request,
            formulary=formulary,
            drug_interactions=interactions,
            dose_ranges=dose_ranges,
        )
        return ApiResponse(success=True, data=result)
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# POST /api/prescriptions/validate
# ---------------------------------------------------------------------------

@router.post("/validate", response_model=ApiResponse[ValidationResponse])
async def validate(
    request: ValidationRequest,
    svc: PrescriptionService = Depends(_get_prescription_service),
    supa: SupabaseClient = Depends(get_supabase),
) -> ApiResponse[ValidationResponse]:
    logger.info("Validation request for visit %s", request.visit_id)
    try:
        formulary = await _load_formulary(supa)
        interactions = await _load_interactions(supa)
        dose_ranges = await _load_dose_ranges(supa)
        result = await svc.validate_prescriptions(
            request,
            drug_interactions=interactions,
            dose_ranges=dose_ranges,
            formulary=formulary,
        )
        return ApiResponse(success=True, data=result)
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# POST /api/prescriptions/approve
# ---------------------------------------------------------------------------

@router.post("/approve", response_model=ApiResponse[PrescriptionReceipt])
async def approve(
    request: PrescriptionApprovalRequest,
    svc: PrescriptionService = Depends(_get_prescription_service),
    supa: SupabaseClient = Depends(get_supabase),
) -> ApiResponse[PrescriptionReceipt]:
    logger.info("Approval request for prescription %s", request.prescription_id)
    try:
        receipt = await svc.approve_prescription(request)
        # Persist to Supabase so prescription counts + details survive server restarts
        try:
            logger.info("Persisting prescription %s to Supabase", receipt.prescription_id)
            await supa.upsert("prescriptions", {
                "id": str(receipt.prescription_id),
                "visit_id": str(receipt.visit_id),
                "patient_id": str(receipt.patient_id),
                "clinician_id": str(receipt.clinician_id),
                "status": "approved",
                "approved_at": receipt.issued_at.isoformat(),
            }, on_conflict="id")
            # Write each recommended drug as a prescription_item row
            rx_data = _get_shared_store().get_prescription(request.prescription_id)
            logger.info("rx_data found: %s, items: %d", rx_data is not None, len(rx_data.get("items", [])) if rx_data else 0)
            if rx_data:
                for item_dict in rx_data.get("items", []):
                    primary = item_dict.get("primary", {}) if isinstance(item_dict, dict) else {}
                    if not primary:
                        continue
                    await supa.insert("prescription_items", {
                        "prescription_id": str(receipt.prescription_id),
                        "drug_name": primary.get("drug_name", "Unknown"),
                        "generic_name": primary.get("generic_name", ""),
                        "dosage": primary.get("dosage", ""),
                        "frequency": primary.get("frequency", ""),
                        "duration": primary.get("duration", ""),
                        "route": primary.get("route", "oral"),
                        "tier": primary.get("tier"),
                        "copay": primary.get("estimated_copay"),
                        "is_covered": bool(primary.get("is_covered", True)),
                    })
        except Exception as exc:
            logger.warning("Failed to persist prescription to Supabase: %s", exc)
        return ApiResponse(success=True, data=receipt)
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except SafetyBlockError as exc:
        raise HTTPException(status_code=422, detail=exc.reason) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# POST /api/prescriptions/reject
# ---------------------------------------------------------------------------

@router.post("/reject", response_model=ApiResponse[None])
async def reject(
    request: PrescriptionRejectionRequest,
    svc: PrescriptionService = Depends(_get_prescription_service),
) -> ApiResponse[None]:
    logger.info("Rejection request for prescription %s", request.prescription_id)
    try:
        await svc.reject_prescription(request)
        return ApiResponse(success=True, data=None)
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# GET /api/prescriptions/{prescription_id}/receipt
# ---------------------------------------------------------------------------

@router.get("/{prescription_id}/receipt", response_model=ApiResponse[PrescriptionReceipt])
async def get_receipt(
    prescription_id: UUID,
    svc: PrescriptionService = Depends(_get_prescription_service),
) -> ApiResponse[PrescriptionReceipt]:
    logger.info("Receipt request for prescription %s", prescription_id)
    try:
        receipt = await svc.get_receipt(prescription_id)
        return ApiResponse(success=True, data=receipt)
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# POST /api/prescriptions/{prescription_id}/patient-pack
# ---------------------------------------------------------------------------

@router.post(
    "/{prescription_id}/patient-pack",
    response_model=ApiResponse[PatientInstructionsOutput],
)
async def generate_patient_pack(
    prescription_id: UUID,
    svc: PrescriptionService = Depends(_get_prescription_service),
) -> ApiResponse[PatientInstructionsOutput]:
    logger.info("Patient pack request for prescription %s", prescription_id)
    try:
        pack = await svc.generate_patient_pack(prescription_id)
        return ApiResponse(success=True, data=pack)
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# POST /api/prescriptions/{prescription_id}/pdf
# ---------------------------------------------------------------------------

@router.post("/{prescription_id}/pdf")
async def download_prescription_pdf(
    prescription_id: UUID,
    svc: PrescriptionService = Depends(_get_prescription_service),
) -> Response:
    logger.info("PDF request for prescription %s", prescription_id)
    try:
        from pharmasense.services.pdf_service import PdfService

        receipt = await svc.get_receipt(prescription_id)
        instructions = await svc.generate_patient_pack(prescription_id)
        pdf_bytes = PdfService().generate(receipt, instructions)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="prescription_{prescription_id}.pdf"'
            },
        )
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
