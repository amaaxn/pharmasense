from fastapi import APIRouter, Depends

from pharmasense.dependencies.auth import AuthenticatedUser, get_current_user
from pharmasense.schemas.common import ApiResponse

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("")
async def chat(user: AuthenticatedUser = Depends(get_current_user)) -> ApiResponse[dict]:
    return ApiResponse.ok({})
