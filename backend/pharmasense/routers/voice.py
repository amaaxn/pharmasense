import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from pharmasense.dependencies.auth import AuthenticatedUser, get_current_user
from pharmasense.schemas.voice import TTSRequest, VoiceRequest, VoiceResponse
from pharmasense.services.voice_service import VoiceService

router = APIRouter(prefix="/api/voice", tags=["voice"])


@router.post("/generate")
async def generate_voice(
    request: VoiceRequest,
    user: AuthenticatedUser = Depends(get_current_user),
) -> VoiceResponse:
    service = VoiceService()
    return await service.generate_voice_pack(request)


@router.post("/tts")
async def text_to_speech(
    request: TTSRequest,
    user: AuthenticatedUser = Depends(get_current_user),
) -> StreamingResponse:
    service = VoiceService()
    audio_bytes = await service.synthesize_speech(request.text, request.language)
    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type="audio/mpeg",
        headers={"Content-Length": str(len(audio_bytes))},
    )


@router.get("/{voice_id}")
async def get_voice(
    voice_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
) -> VoiceResponse:
    return VoiceResponse(audio_url="", prescription_id=voice_id)
