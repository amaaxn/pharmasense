from typing import Optional

from pydantic import BaseModel


class VoiceRequest(BaseModel):
    prescription_id: str
    text: Optional[str] = None
    language: Optional[str] = "en"


class VoiceResponse(BaseModel):
    audio_url: str
    prescription_id: str


class TTSRequest(BaseModel):
    text: str
    language: str = "en"
