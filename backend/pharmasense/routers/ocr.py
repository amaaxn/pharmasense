"""OCR router — POST /api/ocr (Part 2A §6).

Routes to the appropriate OCR handler based on ``source_type`` and wraps the
result in the standard ``ApiResponse`` envelope.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from pharmasense.schemas.common import ApiResponse
from pharmasense.schemas.ocr import OcrRequest, OcrResponse
from pharmasense.services.ocr_service import OcrService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["ocr"])


def _get_ocr_service() -> OcrService:
    """Placeholder dependency — overridden in ``main.py`` with real wiring."""
    raise NotImplementedError("OcrService dependency not configured")


@router.post("/ocr", response_model=ApiResponse[OcrResponse])
async def process_ocr(
    request: OcrRequest,
    ocr_service: OcrService = Depends(_get_ocr_service),
) -> ApiResponse[OcrResponse]:
    logger.info("OCR request received: source_type=%s", request.source_type)

    match request.source_type:
        case "HANDWRITING":
            result = await ocr_service.process_handwriting(request)
        case "INSURANCE_CARD":
            result = await ocr_service.process_insurance_card(request)
        case "FORMULARY_PDF":
            result = await ocr_service.process_formulary_pdf(request)
        case _:
            raise HTTPException(status_code=400, detail=f"Unknown source_type: {request.source_type}")

    return ApiResponse(
        success=True,
        data=OcrResponse(
            source_type=request.source_type,
            result=result.model_dump(),
        ),
    )
