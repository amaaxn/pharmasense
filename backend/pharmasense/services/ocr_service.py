"""OcrService — thin orchestration layer for OCR operations (Part 2A §5).

Delegates all image/PDF analysis to ``GeminiService``.  Does NOT call any
external OCR API directly.
"""

from __future__ import annotations

import logging
import re

from fastapi import HTTPException

from pharmasense.schemas.gemini import (
    FormularyExtractionOutput,
    HandwritingExtractionOutput,
    InsuranceCardOutput,
)
from pharmasense.schemas.ocr import OcrRequest
from pharmasense.services.gemini_service import GeminiService

logger = logging.getLogger(__name__)

_SUPPORTED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}
_SUPPORTED_PDF_TYPES = {"application/pdf"}
_DATA_URI_RE = re.compile(r"^data:[^;]+;base64,")


class OcrService:
    """Validates inputs, strips data-URI prefixes, and delegates to GeminiService."""

    def __init__(self, gemini_service: GeminiService) -> None:
        self._gemini = gemini_service

    # ------------------------------------------------------------------
    # Private helpers (§5.5 steps 1-2)
    # ------------------------------------------------------------------

    @staticmethod
    def _validate_and_clean(request: OcrRequest, allowed_mime_types: set[str]) -> tuple[str, str]:
        """Validate the request and return (cleaned_base64, mime_type)."""
        if not request.base64_data.strip():
            raise HTTPException(status_code=400, detail="base64_data must not be empty")

        if request.mime_type not in allowed_mime_types:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported mime_type '{request.mime_type}' for {request.source_type}. "
                       f"Supported: {sorted(allowed_mime_types)}",
            )

        base64_data = _DATA_URI_RE.sub("", request.base64_data)
        return base64_data, request.mime_type

    # ------------------------------------------------------------------
    # Public methods (§5.3)
    # ------------------------------------------------------------------

    async def process_handwriting(self, request: OcrRequest) -> HandwritingExtractionOutput:
        base64_data, mime_type = self._validate_and_clean(request, _SUPPORTED_IMAGE_TYPES)
        logger.info("Processing handwriting OCR (%s)", mime_type)
        return await self._gemini.extract_from_handwriting(
            base64_data=base64_data, mime_type=mime_type
        )

    async def process_insurance_card(self, request: OcrRequest) -> InsuranceCardOutput:
        base64_data, mime_type = self._validate_and_clean(request, _SUPPORTED_IMAGE_TYPES)
        logger.info("Processing insurance card OCR (%s)", mime_type)
        return await self._gemini.extract_from_insurance_card(
            base64_data=base64_data, mime_type=mime_type
        )

    async def process_formulary_pdf(self, request: OcrRequest) -> FormularyExtractionOutput:
        base64_data, mime_type = self._validate_and_clean(
            request, _SUPPORTED_IMAGE_TYPES | _SUPPORTED_PDF_TYPES
        )
        logger.info("Processing formulary PDF extraction (%s)", mime_type)
        return await self._gemini.extract_from_formulary_pdf(
            base64_data=base64_data, mime_type=mime_type
        )
