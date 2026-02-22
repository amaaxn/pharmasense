"""Chat router — POST /api/chat (Part 2A §7).

Provides the "Talk to the Prescription" conversational interface.
The chat response is NOT persisted by the backend (§7.4).
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from pharmasense.schemas.chat import ChatRequest, ChatResponse
from pharmasense.schemas.common import ApiResponse
from pharmasense.services.gemini_service import GeminiService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["chat"])


def _get_gemini_service() -> GeminiService:
    from pharmasense.config import settings

    return GeminiService(settings)


async def _get_visit_context(visit_id: str) -> dict[str, Any]:
    """Placeholder that returns visit context for the chat prompt.

    When the DB / repository layer is wired (Part 2B+), this will query:
      - visits table  → visit_reason, visit_notes
      - prescriptions → list of prescriptions for this visit
      - patients      → allergies
      - formulary     → relevant formulary entries for the patient's plan

    For now it returns empty defaults so the router is structurally complete.
    """
    logger.warning("visit context lookup not yet wired — using empty defaults for visit %s", visit_id)
    return {
        "visit_reason": "",
        "visit_notes": "",
        "prescriptions": [],
        "patient_allergies": [],
        "formulary_context": [],
        "preferred_language": "en",
    }


@router.post("/chat", response_model=ApiResponse[ChatResponse])
async def chat(
    request: ChatRequest,
    gemini: GeminiService = Depends(_get_gemini_service),
) -> ApiResponse[ChatResponse]:
    logger.info("Chat request for visit %s", request.visit_id)

    ctx = await _get_visit_context(request.visit_id)

    history = [{"sender": m.sender, "text": m.text} for m in request.history]

    reply = await gemini.chat(
        visit_reason=ctx["visit_reason"],
        visit_notes=ctx["visit_notes"],
        prescriptions=ctx["prescriptions"],
        patient_allergies=ctx["patient_allergies"],
        formulary_context=ctx["formulary_context"],
        message_history=history,
        latest_question=request.message,
        preferred_language=ctx["preferred_language"],
    )

    return ApiResponse(
        success=True,
        data=ChatResponse(reply=reply, visit_id=request.visit_id),
    )
