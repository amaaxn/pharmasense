from fastapi import APIRouter, Depends

from pharmasense.dependencies.auth import AuthenticatedUser, get_current_user
from pharmasense.schemas.common import ApiResponse

router = APIRouter(prefix="/api/clinicians", tags=["clinicians"])


@router.get("/{clinician_id}")
async def get_clinician(clinician_id: str, user: AuthenticatedUser = Depends(get_current_user)) -> ApiResponse[dict]:
    return ApiResponse.ok({"clinician_id": clinician_id})
