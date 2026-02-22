from fastapi import APIRouter, Depends, HTTPException

from pharmasense.dependencies.auth import AuthenticatedUser, get_current_user, require_role
from pharmasense.schemas.common import ApiResponse

router = APIRouter(prefix="/api/patients", tags=["patients"])


@router.get("")
async def list_patients(user: AuthenticatedUser = Depends(require_role("clinician"))) -> ApiResponse[list]:
    return ApiResponse.ok([])


@router.get("/{patient_id}")
async def get_patient(patient_id: str, user: AuthenticatedUser = Depends(get_current_user)) -> ApiResponse[dict]:
    return ApiResponse.ok({"patient_id": patient_id})


@router.put("/{patient_id}")
async def update_patient(patient_id: str, user: AuthenticatedUser = Depends(get_current_user)) -> ApiResponse[dict]:
    if user.role != "patient" or str(user.user_id) != patient_id:
        raise HTTPException(status_code=403, detail="Patients can only update their own profile")
    return ApiResponse.ok({"patient_id": patient_id})
