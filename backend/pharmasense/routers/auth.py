from fastapi import APIRouter, Depends

from pharmasense.dependencies.auth import AuthenticatedUser, get_current_user
from pharmasense.schemas.common import ApiResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/profile")
async def get_profile(user: AuthenticatedUser = Depends(get_current_user)) -> ApiResponse[dict]:
    return ApiResponse.ok({
        "user_id": str(user.user_id),
        "email": user.email,
        "role": user.role,
    })


@router.put("/profile")
async def update_profile(user: AuthenticatedUser = Depends(get_current_user)) -> ApiResponse[dict]:
    return ApiResponse.ok({
        "user_id": str(user.user_id),
        "email": user.email,
        "role": user.role,
    })
