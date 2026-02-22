"""GeminiService — single point of contact for all Gemini API calls.

Implements:
  - Section 1: Core architecture (7 public methods)
  - Section 2: HTTP call layer (request building, response parsing, retry, validation)
  - Section 4: Prompt engineering (via prompts module)
  - Section 8: Shared safety settings
  - Section 9: Generation config builder
  - Section 10: Error handling & logging
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Any, TypeVar

import httpx
from pydantic import BaseModel
from pydantic import ValidationError as PydanticValidationError

from pharmasense.config.settings import Settings
from pharmasense.exceptions import SafetyBlockError, ValidationError
from pharmasense.schemas.gemini import (
    FormularyExtractionOutput,
    GeminiRecommendationOutput,
    HandwritingExtractionOutput,
    InsuranceCardOutput,
    PatientInstructionsOutput,
    StructuredExtractionOutput,
)
from pharmasense.services.prompts import (
    build_chat_system_context,
    build_formulary_pdf_prompt,
    build_handwriting_prompt,
    build_insurance_card_prompt,
    build_patient_instructions_prompt,
    build_recommendation_prompt,
    build_structured_extraction_prompt,
)

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

MAX_RETRIES = 3
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/"


class GeminiService:
    """Centralised Gemini API client.  All other services delegate here."""

    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None):
        self._api_key = settings.gemini_api_key
        self._model = settings.gemini_model
        self._base_url = getattr(settings, "gemini_base_url", GEMINI_BASE_URL)
        self._client = client or httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0))

    async def close(self) -> None:
        await self._client.aclose()

    # ------------------------------------------------------------------
    # Section 8 — Safety settings (shared across all calls)
    # ------------------------------------------------------------------

    @staticmethod
    def _build_safety_settings() -> list[dict[str, str]]:
        categories = [
            "HARM_CATEGORY_HARASSMENT",
            "HARM_CATEGORY_HATE_SPEECH",
            "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            "HARM_CATEGORY_DANGEROUS_CONTENT",
        ]
        return [
            {"category": cat, "threshold": "BLOCK_MEDIUM_AND_ABOVE"}
            for cat in categories
        ]

    # ------------------------------------------------------------------
    # Section 9 — Generation config builder
    # ------------------------------------------------------------------

    @staticmethod
    def _build_generation_config(
        temperature: float,
        max_output_tokens: int,
        response_mime_type: str | None = None,
    ) -> dict[str, Any]:
        cfg: dict[str, Any] = {
            "temperature": temperature,
            "topP": 0.8,
            "maxOutputTokens": max_output_tokens,
        }
        if response_mime_type:
            cfg["responseMimeType"] = response_mime_type
        return cfg

    # ------------------------------------------------------------------
    # Section 2.2 — URL construction
    # ------------------------------------------------------------------

    def _build_url(self) -> str:
        return f"{self._base_url}{self._model}:generateContent?key={self._api_key}"

    # ------------------------------------------------------------------
    # Section 2.1 — Request envelope builders
    # ------------------------------------------------------------------

    @staticmethod
    def _build_text_request(
        prompt: str,
        generation_config: dict[str, Any],
        safety_settings: list[dict[str, str]],
    ) -> dict[str, Any]:
        return {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": generation_config,
            "safetySettings": safety_settings,
        }

    @staticmethod
    def _build_multimodal_request(
        prompt: str,
        base64_data: str,
        mime_type: str,
        generation_config: dict[str, Any],
        safety_settings: list[dict[str, str]],
    ) -> dict[str, Any]:
        return {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {"inlineData": {"mimeType": mime_type, "data": base64_data}},
                    ]
                }
            ],
            "generationConfig": generation_config,
            "safetySettings": safety_settings,
        }

    @staticmethod
    def _build_chat_request(
        contents: list[dict[str, Any]],
        generation_config: dict[str, Any],
        safety_settings: list[dict[str, str]],
    ) -> dict[str, Any]:
        return {
            "contents": contents,
            "generationConfig": generation_config,
            "safetySettings": safety_settings,
        }

    # ------------------------------------------------------------------
    # Section 2.3 — Response parsing
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_text_from_response(response: dict[str, Any]) -> str:
        feedback = response.get("promptFeedback", {})
        block_reason = feedback.get("blockReason")
        if block_reason:
            raise SafetyBlockError(f"Blocked by Gemini safety filter: {block_reason}")

        try:
            parts = response["candidates"][0]["content"]["parts"]
            # Thinking models may include a thought-only part first; find the text part
            for part in parts:
                if "text" in part and part["text"].strip():
                    return part["text"]
            raise RuntimeError("No text content found in Gemini response parts")
        except (KeyError, IndexError, TypeError) as exc:
            raise RuntimeError(
                f"Unexpected Gemini response structure: {exc}"
            ) from exc

    # ------------------------------------------------------------------
    # Section 2.5 — Output validation (business constraints)
    # ------------------------------------------------------------------

    @staticmethod
    def _validate_output(output: BaseModel, operation: str) -> None:
        """Apply business-rule validation beyond Pydantic schema checks."""

        if isinstance(output, GeminiRecommendationOutput):
            if not output.recommendations:
                raise ValidationError("recommendations", "must not be empty", operation)
            for rec in output.recommendations:
                if not rec.medication.strip():
                    raise ValidationError("medication", "must not be blank", operation)
                if not rec.dosage.strip():
                    raise ValidationError("dosage", "must not be blank", operation)

        elif isinstance(output, HandwritingExtractionOutput):
            if not output.raw_text.strip():
                raise ValidationError("raw_text", "must not be blank", operation)

        elif isinstance(output, InsuranceCardOutput):
            if not output.plan_name.strip() and not output.member_id.strip():
                raise ValidationError(
                    "plan_name/member_id",
                    "at least one identifier must be present",
                    operation,
                )

        elif isinstance(output, FormularyExtractionOutput):
            if not output.entries:
                raise ValidationError("entries", "must not be empty", operation)
            for entry in output.entries:
                if not entry.drug_name.strip():
                    raise ValidationError("drug_name", "must not be blank", operation)

        elif isinstance(output, StructuredExtractionOutput):
            if not output.visit_reason.strip() and not output.symptoms:
                raise ValidationError(
                    "visit_reason/symptoms",
                    "at least visit_reason or symptoms must be present",
                    operation,
                )

        elif isinstance(output, PatientInstructionsOutput):
            if not output.medication_name.strip():
                raise ValidationError("medication_name", "must not be blank", operation)
            if not output.how_to_take.strip():
                raise ValidationError("how_to_take", "must not be blank", operation)

    # ------------------------------------------------------------------
    # Section 2.4 / 2.6 — Retry loop with validation
    # ------------------------------------------------------------------

    async def _call_with_retry(
        self,
        body: dict[str, Any],
        output_type: type[T],
        operation: str,
    ) -> T:
        """Central retry loop.  Retries on ValidationError; propagates SafetyBlockError."""

        last_error: Exception | None = None

        for attempt in range(MAX_RETRIES):
            try:
                logger.debug(
                    "Gemini [%s] attempt %d — prompt (truncated): %.500s",
                    operation,
                    attempt,
                    json.dumps(body.get("contents", ""))[:500],
                )

                start = time.monotonic()
                resp = await self._client.post(self._build_url(), json=body)
                resp.raise_for_status()
                elapsed_ms = (time.monotonic() - start) * 1000

                raw_text = self._extract_text_from_response(resp.json())
                parsed = json.loads(raw_text)
                output = output_type.model_validate(parsed)
                self._validate_output(output, operation)

                logger.info("Gemini [%s] succeeded in %.0f ms", operation, elapsed_ms)
                return output

            except SafetyBlockError:
                raise

            except (ValidationError, PydanticValidationError) as exc:
                last_error = exc
                logger.warning(
                    "Gemini [%s] attempt %d validation failed: %s",
                    operation,
                    attempt,
                    exc,
                )
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(1.0 * (attempt + 1))

            except (httpx.HTTPStatusError, httpx.RequestError, json.JSONDecodeError) as exc:
                last_error = exc
                logger.warning(
                    "Gemini [%s] attempt %d network/parse error: %s",
                    operation,
                    attempt,
                    exc,
                )
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(2.0 * (attempt + 1))

        logger.error(
            "Gemini [%s] failed after %d attempts: %s",
            operation,
            MAX_RETRIES,
            last_error,
        )
        raise RuntimeError(
            f"Gemini {operation} failed after {MAX_RETRIES} attempts: {last_error}"
        ) from last_error

    async def _call_plain_text(
        self,
        body: dict[str, Any],
        operation: str,
    ) -> str:
        """Like _call_with_retry but returns raw text (used by chat)."""

        last_error: Exception | None = None

        for attempt in range(MAX_RETRIES):
            try:
                logger.debug(
                    "Gemini [%s] attempt %d — prompt (truncated): %.500s",
                    operation,
                    attempt,
                    json.dumps(body.get("contents", ""))[:500],
                )

                start = time.monotonic()
                resp = await self._client.post(self._build_url(), json=body)
                resp.raise_for_status()
                elapsed_ms = (time.monotonic() - start) * 1000

                text = self._extract_text_from_response(resp.json())
                logger.info("Gemini [%s] succeeded in %.0f ms", operation, elapsed_ms)
                return text

            except SafetyBlockError:
                raise

            except (httpx.HTTPStatusError, httpx.RequestError) as exc:
                last_error = exc
                logger.warning(
                    "Gemini [%s] attempt %d error: %s", operation, attempt, exc
                )
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(2.0 * (attempt + 1))

        logger.error(
            "Gemini [%s] failed after %d attempts: %s",
            operation,
            MAX_RETRIES,
            last_error,
        )
        raise RuntimeError(
            f"Gemini {operation} failed after {MAX_RETRIES} attempts: {last_error}"
        ) from last_error

    # ==================================================================
    # Section 1.4 — Public interface (7 methods)
    # ==================================================================

    async def generate_recommendations(
        self,
        *,
        visit_reason: str,
        visit_notes: str,
        symptoms: list[str],
        allergies: list[str],
        current_medications: list[str],
        medical_history: str,
        insurance_plan_name: str,
        formulary_data: list[dict[str, Any]],
    ) -> GeminiRecommendationOutput:
        prompt = build_recommendation_prompt(
            visit_reason=visit_reason,
            visit_notes=visit_notes,
            symptoms=symptoms,
            allergies=allergies,
            current_medications=current_medications,
            medical_history=medical_history,
            insurance_plan_name=insurance_plan_name,
            formulary_data=formulary_data,
        )
        body = self._build_text_request(
            prompt,
            self._build_generation_config(0.2, 4096, "application/json"),
            self._build_safety_settings(),
        )
        return await self._call_with_retry(body, GeminiRecommendationOutput, "generate_recommendations")

    async def extract_from_handwriting(
        self,
        *,
        base64_data: str,
        mime_type: str = "image/png",
    ) -> HandwritingExtractionOutput:
        prompt = build_handwriting_prompt()
        body = self._build_multimodal_request(
            prompt,
            base64_data,
            mime_type,
            self._build_generation_config(0.1, 4096, "application/json"),
            self._build_safety_settings(),
        )
        return await self._call_with_retry(body, HandwritingExtractionOutput, "extract_from_handwriting")

    async def extract_from_insurance_card(
        self,
        *,
        base64_data: str,
        mime_type: str = "image/png",
    ) -> InsuranceCardOutput:
        prompt = build_insurance_card_prompt()
        body = self._build_multimodal_request(
            prompt,
            base64_data,
            mime_type,
            self._build_generation_config(0.1, 2048, "application/json"),
            self._build_safety_settings(),
        )
        return await self._call_with_retry(body, InsuranceCardOutput, "extract_from_insurance_card")

    async def extract_from_formulary_pdf(
        self,
        *,
        base64_data: str,
        mime_type: str = "application/pdf",
    ) -> FormularyExtractionOutput:
        prompt = build_formulary_pdf_prompt()
        body = self._build_multimodal_request(
            prompt,
            base64_data,
            mime_type,
            self._build_generation_config(0.1, 8192, "application/json"),
            self._build_safety_settings(),
        )
        return await self._call_with_retry(body, FormularyExtractionOutput, "extract_from_formulary_pdf")

    async def extract_structured_data(
        self,
        *,
        visit_notes: str,
    ) -> StructuredExtractionOutput:
        prompt = build_structured_extraction_prompt(visit_notes=visit_notes)
        body = self._build_text_request(
            prompt,
            self._build_generation_config(0.1, 2048, "application/json"),
            self._build_safety_settings(),
        )
        return await self._call_with_retry(body, StructuredExtractionOutput, "extract_structured_data")

    async def generate_patient_instructions(
        self,
        *,
        medication: str,
        dosage: str,
        frequency: str,
        duration: str,
        patient_allergies: list[str],
        current_medications: list[str],
        language: str = "en",
    ) -> PatientInstructionsOutput:
        prompt = build_patient_instructions_prompt(
            medication=medication,
            dosage=dosage,
            frequency=frequency,
            duration=duration,
            patient_allergies=patient_allergies,
            current_medications=current_medications,
            language=language,
        )
        body = self._build_text_request(
            prompt,
            self._build_generation_config(0.3, 2048, "application/json"),
            self._build_safety_settings(),
        )
        return await self._call_with_retry(body, PatientInstructionsOutput, "generate_patient_instructions")

    async def chat(
        self,
        *,
        visit_reason: str,
        visit_notes: str,
        prescriptions: list[dict[str, Any]],
        patient_allergies: list[str],
        formulary_context: list[dict[str, Any]],
        message_history: list[dict[str, str]],
        latest_question: str,
        preferred_language: str = "en",
    ) -> str:
        system_context = build_chat_system_context(
            visit_reason=visit_reason,
            visit_notes=visit_notes,
            prescriptions=prescriptions,
            patient_allergies=patient_allergies,
            formulary_context=formulary_context,
            preferred_language=preferred_language,
        )

        contents: list[dict[str, Any]] = [
            {"role": "user", "parts": [{"text": system_context}]},
            {"role": "model", "parts": [{"text": "Understood. I'm ready to help with questions about this visit and its prescriptions."}]},
        ]

        for msg in message_history:
            role = "user" if msg.get("sender", "").lower() in ("user", "patient") else "model"
            contents.append({"role": role, "parts": [{"text": msg.get("text", "")}]})

        contents.append({"role": "user", "parts": [{"text": latest_question}]})

        body = self._build_chat_request(
            contents,
            self._build_generation_config(0.4, 2048),
            self._build_safety_settings(),
        )
        return await self._call_plain_text(body, "chat")
