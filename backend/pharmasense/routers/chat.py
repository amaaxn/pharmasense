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
from pharmasense.services.supabase_client import SupabaseClient, get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["chat"])


def _get_gemini_service() -> GeminiService:
    from pharmasense.config import settings

    return GeminiService(settings)


async def _get_visit_context(visit_id: str, supa: SupabaseClient) -> dict[str, Any]:
    """Fetch visit context from in-memory store and Supabase for the chat prompt."""
    import uuid as _uuid
    from pharmasense.routers.prescriptions import _get_shared_store

    visit_reason = ""
    visit_notes = ""
    patient_allergies: list[str] = []
    prescriptions: list[dict[str, Any]] = []

    try:
        visits = await supa.select("visits", filters={"id": f"eq.{visit_id}"}, limit=1)
        if visits:
            visit = visits[0]
            visit_reason = visit.get("chief_complaint", "") or ""
            visit_notes = visit.get("notes", "") or ""

            patient_id = visit.get("patient_id")
            if patient_id:
                patients = await supa.select(
                    "patients",
                    filters={"id": f"eq.{patient_id}"},
                    limit=1,
                )
                if patients:
                    allergies_raw = patients[0].get("allergies", [])
                    if isinstance(allergies_raw, list):
                        patient_allergies = allergies_raw
                    elif isinstance(allergies_raw, str):
                        import json as _json
                        try:
                            patient_allergies = _json.loads(allergies_raw)
                        except Exception:
                            patient_allergies = [allergies_raw] if allergies_raw else []
    except Exception as exc:
        logger.warning("Failed to load visit/patient from Supabase for %s: %s", visit_id, exc)

    # In-memory store (populated during current server session)
    try:
        store = _get_shared_store()
        vid = _uuid.UUID(visit_id)
        in_memory = store.list_by_visit(vid)
        if in_memory:
            for rx in in_memory:
                rx_status = rx.get("status", "")
                for item_dict in rx.get("items", []):
                    if isinstance(item_dict, dict):
                        primary = item_dict.get("primary", item_dict)
                    else:
                        primary = item_dict
                    if isinstance(primary, dict):
                        prescriptions.append({
                            "drug_name": primary.get("drug_name", ""),
                            "generic_name": primary.get("generic_name", ""),
                            "dosage": primary.get("dosage", ""),
                            "frequency": primary.get("frequency", ""),
                            "duration": primary.get("duration", ""),
                            "route": primary.get("route", "oral"),
                            "status": rx_status,
                        })
    except Exception as exc:
        logger.warning("Failed to load in-memory prescriptions for %s: %s", visit_id, exc)

    # Supabase fallback if in-memory had nothing
    if not prescriptions:
        try:
            rx_rows = await supa.select(
                "prescriptions",
                filters={"visit_id": f"eq.{visit_id}"},
            )
            for rx in rx_rows:
                rx_id = rx.get("id")
                status = rx.get("status", "")
                items = await supa.select(
                    "prescription_items",
                    filters={"prescription_id": f"eq.{rx_id}"},
                )
                for item in items:
                    prescriptions.append({
                        "drug_name": item.get("drug_name", ""),
                        "generic_name": item.get("generic_name", ""),
                        "dosage": item.get("dosage", ""),
                        "frequency": item.get("frequency", ""),
                        "duration": item.get("duration", ""),
                        "route": item.get("route", "oral"),
                        "status": status,
                        "tier": item.get("tier"),
                        "copay": float(item.get("copay", 0) or 0),
                        "is_covered": item.get("is_covered", True),
                    })
        except Exception as exc:
            logger.warning("Failed to load prescriptions from Supabase for %s: %s", visit_id, exc)

    logger.info(
        "Chat context for visit %s: reason=%s, notes_len=%d, rx_count=%d, allergies=%s",
        visit_id, visit_reason[:50], len(visit_notes), len(prescriptions), patient_allergies,
    )

    return {
        "visit_reason": visit_reason,
        "visit_notes": visit_notes,
        "prescriptions": prescriptions,
        "patient_allergies": patient_allergies,
        "formulary_context": [],
        "preferred_language": "en",
    }


@router.post("/chat", response_model=ApiResponse[ChatResponse])
async def chat(
    request: ChatRequest,
    gemini: GeminiService = Depends(_get_gemini_service),
    supa: SupabaseClient = Depends(get_supabase),
) -> ApiResponse[ChatResponse]:
    logger.info("Chat request for visit %s", request.visit_id)

    ctx = await _get_visit_context(request.visit_id, supa)

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
