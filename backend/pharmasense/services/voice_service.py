"""ElevenLabs voice generation service."""

from __future__ import annotations

import logging
import os
from uuid import UUID

from pharmasense.schemas.prescription_ops import AnalyticsEventType
from pharmasense.schemas.voice import VoiceRequest, VoiceResponse
from pharmasense.services.analytics_service import AnalyticsService
from pharmasense.services.storage_service import StorageService

logger = logging.getLogger(__name__)

SILENT_MP3 = (
    b"\xff\xfb\x90\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
    b"\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
)


class VoiceService:
    def __init__(self) -> None:
        self._api_key = os.getenv("ELEVENLABS_API_KEY", "")
        self._voice_id = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
        self._storage = StorageService()
        self._analytics = AnalyticsService()

    async def generate_voice_pack(self, request: VoiceRequest) -> VoiceResponse:
        script = await self._build_voice_script(request)
        audio_bytes = await self._call_elevenlabs(script, request.language or "en")

        key = self._storage.generate_key("voice-packs", "mp3")
        audio_url = await self._storage.upload(audio_bytes, key)

        logger.info(
            "Voice pack generated for prescription %s (%d bytes)",
            request.prescription_id,
            len(audio_bytes),
        )

        self._analytics.emit(
            AnalyticsEventType.VOICE_PACK_GENERATED,
            {
                "prescriptionId": request.prescription_id,
                "language": request.language or "en",
                "audioUrl": audio_url,
            },
        )

        return VoiceResponse(
            audio_url=audio_url,
            prescription_id=request.prescription_id,
        )

    async def _build_voice_script(self, request: VoiceRequest) -> str:
        if request.text:
            return request.text

        lang = request.language or "en"

        try:
            rx_id = UUID(request.prescription_id)
            instructions = await self._fetch_patient_instructions(rx_id)
            if instructions:
                return self._format_instructions_script(instructions, lang)
        except (ValueError, Exception):
            logger.debug(
                "Could not fetch patient instructions for %s, using generic script",
                request.prescription_id,
            )

        if lang == "es":
            return (
                "Aquí están las instrucciones para su medicamento. "
                "Por favor consulte a su médico para más detalles."
            )
        return (
            "Here are the instructions for your medication. "
            "Please consult your doctor for more details."
        )

    async def _fetch_patient_instructions(self, prescription_id: UUID):
        """Try to fetch patient instructions via PrescriptionService."""
        try:
            from pharmasense.routers.prescriptions import _get_prescription_service

            svc = _get_prescription_service()
            return await svc.generate_patient_pack(prescription_id)
        except Exception:
            return None

    def _format_instructions_script(self, instructions, lang: str) -> str:
        """Build a natural spoken script from PatientInstructionsOutput."""
        parts: list[str] = []

        if lang == "es":
            parts.append(f"Información sobre su medicamento: {instructions.medication_name}.")
            parts.append(f"Este medicamento es para: {instructions.purpose}.")
            parts.append(f"Cómo tomarlo: {instructions.how_to_take}.")
            if instructions.what_to_avoid:
                avoid = ", ".join(instructions.what_to_avoid)
                parts.append(f"Debe evitar: {avoid}.")
            if instructions.when_to_seek_help:
                seek = ", ".join(instructions.when_to_seek_help)
                parts.append(f"Busque ayuda médica inmediata si experimenta: {seek}.")
        else:
            parts.append(f"Information about your medication: {instructions.medication_name}.")
            parts.append(f"This medication is for: {instructions.purpose}.")
            parts.append(f"How to take it: {instructions.how_to_take}.")
            if instructions.what_to_avoid:
                avoid = ", ".join(instructions.what_to_avoid)
                parts.append(f"You should avoid: {avoid}.")
            if instructions.when_to_seek_help:
                seek = ", ".join(instructions.when_to_seek_help)
                parts.append(f"Seek immediate medical help if you experience: {seek}.")

        return " ".join(parts)

    async def _call_elevenlabs(self, text: str, language: str) -> bytes:
        if not self._api_key:
            logger.warning("No ElevenLabs API key configured, returning silent audio")
            return SILENT_MP3

        try:
            import httpx

            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"https://api.elevenlabs.io/v1/text-to-speech/{self._voice_id}",
                    headers={
                        "xi-api-key": self._api_key,
                        "Accept": "application/octet-stream",
                        "Content-Type": "application/json",
                    },
                    json={
                        "text": text,
                        "model_id": "eleven_multilingual_v2",
                        "voice_settings": {
                            "stability": 0.5,
                            "similarity_boost": 0.75,
                        },
                    },
                    timeout=30.0,
                )
                resp.raise_for_status()
                return resp.content
        except Exception:
            logger.exception("ElevenLabs API call failed, returning silent audio")
            return SILENT_MP3
