from fastapi import APIRouter, Depends

from pharmasense.dependencies.auth import AuthenticatedUser, get_current_user
from pharmasense.schemas.voice import VoiceRequest, VoiceResponse
from pharmasense.services.voice_service import VoiceService

router = APIRouter(prefix="/api/voice", tags=["voice"])


@router.post("/generate")
async def generate_voice(
    request: VoiceRequest,
    user: AuthenticatedUser = Depends(get_current_user),
) -> VoiceResponse:
    service = VoiceService()
    return await service.generate_voice_pack(request)


@router.get("/{voice_id}")
async def get_voice(
    voice_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
) -> VoiceResponse:
    return VoiceResponse(audio_url="", prescription_id=voice_id)
