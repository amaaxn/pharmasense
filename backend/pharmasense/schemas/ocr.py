"""OCR request / response DTOs (Part 2A §5.4, §6.1)."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class OcrRequest(BaseModel):
    base64_data: str = Field(min_length=1, description="Base64-encoded image or PDF data")
    mime_type: str = Field(description="e.g. image/png, image/jpeg, application/pdf")
    source_type: Literal["HANDWRITING", "INSURANCE_CARD", "FORMULARY_PDF"]


class OcrResponse(BaseModel):
    source_type: str
    result: dict[str, Any] = Field(description="Parsed output from the appropriate Gemini extraction")
