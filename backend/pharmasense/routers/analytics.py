from fastapi import APIRouter, Depends

from pharmasense.dependencies.auth import AuthenticatedUser, require_role
from pharmasense.schemas.common import ApiResponse

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary")
async def analytics_summary(user: AuthenticatedUser = Depends(require_role("clinician"))) -> ApiResponse[dict]:
    return ApiResponse.ok({})


@router.get("/copay-savings")
async def copay_savings(user: AuthenticatedUser = Depends(require_role("clinician"))) -> ApiResponse[dict]:
    return ApiResponse.ok({})


@router.get("/safety-blocks")
async def safety_blocks(user: AuthenticatedUser = Depends(require_role("clinician"))) -> ApiResponse[dict]:
    return ApiResponse.ok({})


@router.get("/time-saved")
async def time_saved(user: AuthenticatedUser = Depends(require_role("clinician"))) -> ApiResponse[dict]:
    return ApiResponse.ok({})
