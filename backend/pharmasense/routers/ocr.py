from fastapi import APIRouter, Depends

from pharmasense.dependencies.auth import AuthenticatedUser, require_role
from pharmasense.schemas.common import ApiResponse

router = APIRouter(prefix="/api/ocr", tags=["ocr"])


@router.post("")
async def run_ocr(user: AuthenticatedUser = Depends(require_role("clinician"))) -> ApiResponse[dict]:
    return ApiResponse.ok({})
