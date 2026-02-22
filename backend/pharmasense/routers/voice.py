from fastapi import APIRouter, Depends

from pharmasense.dependencies.auth import AuthenticatedUser, get_current_user
from pharmasense.schemas.common import ApiResponse

router = APIRouter(prefix="/api/voice", tags=["voice"])


@router.post("/generate")
async def generate_voice(user: AuthenticatedUser = Depends(get_current_user)) -> ApiResponse[dict]:
    return ApiResponse.ok({})


@router.get("/{voice_id}")
async def get_voice(voice_id: str, user: AuthenticatedUser = Depends(get_current_user)) -> ApiResponse[dict]:
    return ApiResponse.ok({"voice_id": voice_id})
