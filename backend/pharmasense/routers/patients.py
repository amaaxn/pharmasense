import uuid
from datetime import date
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException

from pharmasense.dependencies.auth import AuthenticatedUser, get_current_user, require_role
from pharmasense.schemas.common import ApiResponse
from pharmasense.services.supabase_client import SupabaseClient, get_supabase

router = APIRouter(prefix="/api/patients", tags=["patients"])


def _serialize(row: dict, email: str = "") -> dict:
    return {
        "patientId": row.get("id", ""),
        "email": email or row.get("email", ""),
        "firstName": row.get("first_name", ""),
        "lastName": row.get("last_name", ""),
        "dateOfBirth": row.get("date_of_birth", ""),
        "allergies": row.get("allergies") or [],
        "insurancePlan": row.get("insurance_plan") or None,
    }


async def _find_patient(supa: SupabaseClient, uid: str) -> dict | None:
    return await supa.select_one("patients", filters={"user_id": f"eq.{uid}"})


@router.get("")
async def list_patients(
    user: AuthenticatedUser = Depends(require_role("clinician")),
    supa: SupabaseClient = Depends(get_supabase),
) -> ApiResponse[list]:
    rows = await supa.select("patients")
    return ApiResponse.ok([_serialize(r) for r in rows])


@router.get("/{patient_id}")
async def get_patient(
    patient_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    supa: SupabaseClient = Depends(get_supabase),
) -> ApiResponse[dict]:
    try:
        uuid.UUID(patient_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid patient ID")

    row = await _find_patient(supa, patient_id)

    if row is None:
        # Auto-create a skeleton record on first login
        row = await supa.insert("patients", {
            "user_id": patient_id,
            "first_name": "",
            "last_name": "",
            "date_of_birth": date.today().isoformat(),
            "allergies": [],
            "current_medications": [],
            "insurance_plan": "",
            "insurance_member_id": "",
        })

    return ApiResponse.ok(_serialize(row, user.email))


@router.put("/{patient_id}")
async def update_patient(
    patient_id: str,
    body: dict[str, Any] = Body(...),
    user: AuthenticatedUser = Depends(get_current_user),
    supa: SupabaseClient = Depends(get_supabase),
) -> ApiResponse[dict]:
    if user.role != "clinician" and str(user.user_id) != patient_id:
        raise HTTPException(status_code=403, detail="Can only update your own profile")

    try:
        uuid.UUID(patient_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid patient ID")

    row = await _find_patient(supa, patient_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    updates: dict[str, Any] = {}
    if "firstName" in body:
        updates["first_name"] = body["firstName"]
    if "lastName" in body:
        updates["last_name"] = body["lastName"]
    if "allergies" in body:
        updates["allergies"] = body["allergies"]
    if "insurancePlan" in body:
        updates["insurance_plan"] = body["insurancePlan"]
    if "dateOfBirth" in body:
        updates["date_of_birth"] = body["dateOfBirth"]

    if updates:
        row = await supa.update("patients", filters={"user_id": f"eq.{patient_id}"}, data=updates)

    return ApiResponse.ok(_serialize(row, user.email))
