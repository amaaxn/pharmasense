# PharmaSense V2 — Part 2A: GeminiService, Prompt Engineering, and OCR Pipeline
### Depends on: Part 1 (Architecture, Schema, Auth)

This document specifies every detail needed to implement the AI layer of PharmaSense V2: the centralized `gemini_service` module, all prompt templates, the OCR pipeline for handwriting/insurance cards/PDFs, and the structured JSON output contract between Gemini and the rules engine.

> **Pythonic design:** All DTOs use Pydantic models; services are plain Python modules/classes; HTTP calls use `httpx` (async).

> **V1 problems addressed:**
> - Gemini API key was exposed in the frontend via `VITE_GEMINI_API_KEY`
> - Prompts used delimiter-based text parsing (`---RECOMMENDATION---`) instead of JSON schema enforcement
> - OCR used a separate Google Cloud Vision dependency; V2 consolidates to Gemini Vision
> - No retry logic; no output validation; no schema rejection
> - `LlmServiceImpl` was a placeholder returning mock responses

---

## 1. GeminiService — Core Architecture

### 1.1 File Location

**File:** `backend/pharmasense/services/gemini_service.py`

This is a module/class. It is the **single point of contact** for all Gemini API calls in the entire application. No other service or router calls the Gemini API directly.

### 1.2 Dependencies

Use `httpx.AsyncClient` with timeout (e.g., 60s read) for LLM calls. Inject via FastAPI dependency or constructor. Load `GEMINI_API_KEY` and `GEMINI_MODEL` from settings (pydantic-settings).

### 1.3 Configuration

In `config/settings.py`, define `gemini_api_key: str` and `gemini_model: str = "gemini-1.5-flash"`. Pass to `GeminiService` constructor or use dependency injection.


### 1.4 Core Methods — Public Interface

`GeminiService` exposes these public methods (async). Each method internally builds a specific prompt, calls Gemini via `httpx`, validates the output with Pydantic, and returns a typed model.

| Method | Input | Output | Used By |
|---|---|---|---|
| `generate_recommendations(...)` | Visit notes, patient context, formulary data | `GeminiRecommendationOutput` (Pydantic) | `prescription_service` |
| `extract_from_handwriting(...)` | Base64 image data | `HandwritingExtractionOutput` (Pydantic) | `ocr_service` |
| `extract_from_insurance_card(...)` | Base64 image data | `InsuranceCardOutput` (Pydantic) | `ocr_service` |
| `extract_from_formulary_pdf(...)` | Base64 PDF data | `FormularyExtractionOutput` (Pydantic) | `ocr_service` |
| `extract_structured_data(...)` | Free-text visit notes | `StructuredExtractionOutput` (Pydantic) | `visit_service` |
| `generate_patient_instructions(...)` | Approved prescription, patient profile | `PatientInstructionsOutput` (Pydantic) | `prescription_service` |
| `chat(...)` | Message history, visit context, latest question | `str` (plain text response) | `chat` router |

---

## 2. Gemini HTTP Call Layer

### 2.1 Request Envelope

Every Gemini API call follows this structure. Build it as a Python `dict` or Pydantic model:


For **image inputs** (OCR), the `parts` array includes an `inlineData` element:


For **chat** (conversational, not structured JSON), omit `responseMimeType` so the model returns natural language:


### 2.2 API URL Construction

`f"{GEMINI_BASE_URL}{model_name}:generateContent?key={api_key}"` — use `httpx.post(url, json=body)`.


### 2.3 Response Parsing

The Gemini REST API response has this structure. Implement a private helper `_extract_text_from_response(response: dict) -> str` that navigates `candidates[0].content.parts[0].text`. Check `promptFeedback.blockReason` first; if non-null, raise `SafetyBlockError`.


### 2.4 Retry with Validation

This is the central private method that all public methods delegate to. Use `tenacity` or a simple loop with `asyncio.sleep`. On `ValidationError` (Pydantic or custom), retry. On `SafetyBlockError`, do not retry (re-raise immediately).


### 2.5 Output Validation

After parsing the JSON into a Pydantic model, validate it against business constraints before returning. Implement a private method `_validate_output(output, operation_name)` that checks e.g. `recommendations` non-empty, `medication` non-blank, etc. Raise `ValidationError` on failure.


### 2.6 Model Output Rejection

When validation fails, the retry loop in Section 2.4 catches the `ValidationException` and retries. If all retries are exhausted, the operation fails with a descriptive error. This means:

- **Attempt 0:** Call Gemini, parse JSON, validate. If validation fails → retry.
- **Attempt 1:** Call Gemini again (same prompt), parse, validate. If validation fails → retry.
- **Attempt 2:** Final attempt. If validation fails → throw `RuntimeException` to caller.

The caller (e.g., `prescription_service`) catches this and raises `HTTPException` with an appropriate status and message.

---

## 3. Gemini Output DTOs (Pydantic Models)

All output types are Pydantic models in `schemas/gemini.py`. Every field matches what the Gemini prompt instructs the model to output. Use `model_validate` for parsing from JSON.

### 3.1 GeminiRecommendationOutput


### 3.2 HandwritingExtractionOutput


### 3.3 InsuranceCardOutput


### 3.4 FormularyExtractionOutput


### 3.5 StructuredExtractionOutput


### 3.6 PatientInstructionsOutput


---

## 4. Prompt Engineering — Complete Prompt Templates

Every prompt follows a consistent structure: **Role → Context → Task → Constraints → Output Schema → Examples (when beneficial)**.

> **Critical V1 fix:** V1 used delimiter-based text output (`---RECOMMENDATION---`) and regex parsing. V2 uses `responseMimeType: "application/json"` to force Gemini to output valid JSON, and validates against Pydantic schemas after parsing.

### 4.1 Prescription Recommendation Prompt

**Method:** `generateRecommendations(...)`

**Trigger:** Called by `PrescriptionService` when a clinician requests recommendations for a visit.

**Inputs to the prompt builder:**

| Parameter | Type | Source |
|---|---|---|
| `visitReason` | String | Visit record |
| `visitNotes` | String | Visit record (may include transcribed handwriting) |
| `symptoms` | List<String> | Extracted from notes or manual entry |
| `allergies` | List<String> | Patient record (`patients.allergies` column) |
| `currentMedications` | List<String> | From patient's active prescriptions |
| `medicalHistory` | JSONB String | Patient record |
| `insurancePlanName` | String | From patient's insurance_details |
| `formularyData` | List<FormularyEntry> | Queried from `formulary_entries` table for the patient's plan |

**Full prompt template:**


**Generation config for this prompt:**

| Parameter | Value | Rationale |
|---|---|---|
| `temperature` | 0.2 | Low creativity; factual, formulary-grounded output |
| `topP` | 0.8 | Focused sampling |
| `maxOutputTokens` | 4096 | Enough for 3 detailed recommendations |
| `responseMimeType` | `application/json` | Force valid JSON output |

### 4.2 Handwritten Notes OCR + Extraction Prompt

**Method:** `extractFromHandwriting(...)`

**Trigger:** Called by `OcrService` when a clinician submits a handwritten note image (from drawing canvas or camera).

**Full prompt template:**


**Generation config:**

| Parameter | Value | Rationale |
|---|---|---|
| `temperature` | 0.1 | Maximum fidelity to the source image |
| `maxOutputTokens` | 4096 | Handwriting can be dense |
| `responseMimeType` | `application/json` | Structured extraction |

**Input construction:** This prompt uses the multimodal format with `inlineData`. Build the request dict with `parts` containing `{"text": prompt}` and `{"inlineData": {"mimeType": mime_type, "data": base64_data}}`.


### 4.3 Insurance Card Parsing Prompt

**Method:** `extractFromInsuranceCard(...)`

**Trigger:** Called by `OcrService` when a patient uploads a photo of their insurance card.

**Full prompt template:**


**Generation config:**

| Parameter | Value |
|---|---|
| `temperature` | 0.1 |
| `maxOutputTokens` | 2048 |
| `responseMimeType` | `application/json` |

### 4.4 Formulary PDF Extraction Prompt

**Method:** `extractFromFormularyPdf(...)`

**Trigger:** Called by `OcrService` when a clinician or admin uploads a formulary/plan PDF document.

**Full prompt template:**


**Generation config:**

| Parameter | Value | Rationale |
|---|---|---|
| `temperature` | 0.1 | Maximum fidelity to the source document |
| `maxOutputTokens` | 8192 | Formularies can have many entries |
| `responseMimeType` | `application/json` | Structured extraction |

**Note:** For PDF input, convert the PDF to base64 and use `mimeType: "application/pdf"` in the `inlineData`. Gemini 1.5 Flash supports PDF input natively.

### 4.5 Structured Data Extraction from Free-Text Notes

**Method:** `extractStructuredData(...)`

**Trigger:** Called by `VisitService` when the clinician's typed notes need to be parsed into structured fields for the recommendation engine.

**Full prompt template:**


**Generation config:**

| Parameter | Value |
|---|---|
| `temperature` | 0.1 |
| `maxOutputTokens` | 2048 |
| `responseMimeType` | `application/json` |

### 4.6 Patient Instructions Generation Prompt

**Method:** `generatePatientInstructions(...)`

**Trigger:** Called by `PrescriptionService` after a prescription is approved, to generate the patient understanding pack.

**Inputs to the prompt builder:**

| Parameter | Source |
|---|---|
| `medication` | Approved prescription record |
| `dosage` | Approved prescription record |
| `frequency` | Approved prescription record |
| `duration` | Approved prescription record |
| `patientAllergies` | Patient record |
| `currentMedications` | Patient's active prescriptions |
| `language` | Patient's `preferred_language` (default: `"en"`) |

**Full prompt template:**


**Generation config:**

| Parameter | Value | Rationale |
|---|---|---|
| `temperature` | 0.3 | Slightly more natural language for patient readability |
| `maxOutputTokens` | 2048 | Patient instructions are concise |
| `responseMimeType` | `application/json` | Structured output for UI components |

### 4.7 Post-Prescription Chat Prompt

**Method:** `chat(...)`

**Trigger:** Called by `ChatController` when a user sends a message in the "Talk to the Prescription" chat.

**This is the only prompt that does NOT use `responseMimeType: "application/json"` — it returns natural language.**

**Inputs to the prompt builder:**

| Parameter | Source |
|---|---|
| `visitReason` | Visit record |
| `visitNotes` | Visit record |
| `prescriptions` | List of prescriptions for this visit |
| `patientAllergies` | Patient record |
| `formularyContext` | Relevant formulary entries |
| `messageHistory` | Last 10 messages in the conversation |
| `latestQuestion` | The user's current message |
| `preferredLanguage` | Patient's preferred language |

**System context prompt (injected as the first "user" message):**


**Message history construction:**

The chat endpoint receives the full message history. Build the Gemini `contents` array as alternating `user` and `model` messages (Python list of dicts with `role` and `parts`).


**Generation config for chat:**

| Parameter | Value | Rationale |
|---|---|---|
| `temperature` | 0.4 | Slightly more conversational than structured prompts |
| `maxOutputTokens` | 2048 | Concise answers |
| `responseMimeType` | *omitted* | Natural language response |

---

## 5. OCR Service

### 5.1 File Location

**File:** `backend/pharmasense/services/ocr_service.py`

### 5.2 Architecture

`OcrService` is a thin orchestration layer. It does **not** call any OCR API directly. Instead, it delegates to `GeminiService` for all OCR operations, taking advantage of Gemini 1.5's native multimodal capabilities.

> **V1 change:** V1 used a separate Google Cloud Vision API dependency (`ImageAnnotatorClient`) for OCR, then a separate Gemini call for parsing. V2 consolidates both into a single Gemini call that reads the image and extracts structured data in one step.

### 5.3 Public Methods

`process_handwriting(request: OcrRequest)`, `process_insurance_card(request: OcrRequest)`, `process_formulary_pdf(request: OcrRequest)` — each returns the corresponding Pydantic output model.

### 5.4 OcrRequest DTO

Pydantic model: `base64_data: str`, `mime_type: str`, `source_type: Literal["HANDWRITING", "INSURANCE_CARD", "FORMULARY_PDF"]`.


### 5.5 Implementation Logic

Each method in `OcrService` follows this pattern:

1. **Validate input:** Ensure `base64Data` is non-empty and `mimeType` is supported.
2. **Strip data URI prefix:** If `base64Data` starts with `data:image/...;base64,`, strip the prefix.
3. **Delegate to GeminiService:** Call the appropriate method.
4. **Return the typed output.**


### 5.6 Formulary Ingestion Flow

When `process_formulary_pdf` returns a `FormularyExtractionOutput`, the calling router (`/api/ocr`) must also persist the extracted drugs into the `formulary_entries` table via `formulary_service.import_extracted_formulary()`.


---

## 6. OCR Router

### 6.1 Endpoint Specification

**File:** `backend/pharmasense/routers/ocr.py`

| Method | Path | Request Body | Response | Description |
|---|---|---|---|---|
| `POST` | `/api/ocr` | `OcrRequest` | `ApiResponse[OcrResponse]` | Route to appropriate OCR handler based on `source_type` |

### 6.2 Routing Logic

Use a Python `match`/`if` on `request.source_type` and delegate to `ocr_service.process_handwriting`, `process_insurance_card`, or `process_formulary_pdf`. Return `ApiResponse` wrapper.


---

## 7. Chat Router

### 7.1 Endpoint Specification

**File:** `backend/pharmasense/routers/chat.py`

| Method | Path | Request Body | Response | Description |
|---|---|---|---|---|
| `POST` | `/api/chat` | `ChatRequest` | `ApiResponse[ChatResponse]` | Send a message, get AI response |

### 7.2 ChatRequest DTO

Pydantic: `visit_id: str`, `message: str`, `history: list[ChatMessageDto]` where `ChatMessageDto` has `sender: str`, `text: str`.

### 7.3 ChatResponse DTO

Pydantic: `reply: str`, `visit_id: str`.


### 7.4 Implementation Flow


The chat response is NOT stored in the database by the backend. Chat persistence is optional; if desired, store in the `visits.extracted_data` JSONB field or a dedicated `chat_messages` field.

---

## 8. Safety Settings — Shared Configuration

All Gemini calls use these safety settings. Implement as a reusable helper `_build_safety_settings() -> list[dict]` in `gemini_service`:


The threshold `BLOCK_MEDIUM_AND_ABOVE` is appropriate for a healthcare context. It blocks genuinely harmful content while allowing clinical discussion of drugs, dosages, and side effects.

---

## 9. Generation Config Builder

Implement a reusable helper `_build_generation_config(temperature, max_output_tokens, response_mime_type=None) -> dict`:


Summary of generation configs per operation:

| Operation | Temperature | Max Tokens | Response MIME |
|---|---|---|---|
| Prescription recommendations | 0.2 | 4096 | `application/json` |
| Handwriting OCR | 0.1 | 4096 | `application/json` |
| Insurance card OCR | 0.1 | 2048 | `application/json` |
| Formulary PDF extraction | 0.1 | 8192 | `application/json` |
| Structured note extraction | 0.1 | 2048 | `application/json` |
| Patient instructions | 0.3 | 2048 | `application/json` |
| Chat | 0.4 | 2048 | *none* (natural language) |

---

## 10. Error Handling Within GeminiService

### 10.1 Exception Types

| Exception | When Thrown | HTTP Result |
|---|---|---|
| `SafetyBlockException` | Gemini's `promptFeedback.blockReason` is non-null | 422 `SAFETY_BLOCKED` |
| `ValidationException` | Parsed JSON fails schema validation | 400 `VALIDATION_FAILED` (after retries exhausted) |
| `RuntimeException` | Network error, timeout, Gemini 5xx | 500 `INTERNAL_ERROR` (after retries exhausted) |

### 10.2 Logging

Every Gemini call logs:
- **DEBUG:** The full prompt (truncated to 500 chars) and operation name
- **INFO:** Success with response time in milliseconds
- **WARN:** Retry attempts with attempt number and error reason
- **ERROR:** Final failure after all retries exhausted, with full exception


---

## 11. Part 2A Acceptance Criteria

Before proceeding to Part 2B, verify:

| # | Criterion | Verification |
|---|---|---|
| 1 | `GeminiService` has all 7 public methods | Unit test stubs call each method |
| 2 | Recommendation prompt returns valid `GeminiRecommendationOutput` | Send test visit data; parse response into Pydantic model |
| 3 | Output validation rejects empty recommendations | Pass in a mock empty response; confirm `ValidationError` |
| 4 | Retry logic fires on schema violation | Mock a bad first response, valid second response; confirm success on retry |
| 5 | Handwriting OCR returns structured extraction | Upload a test handwriting image; confirm `HandwritingExtractionOutput` fields populated |
| 6 | Insurance card OCR returns structured card data | Upload a test insurance card image; confirm `InsuranceCardOutput` |
| 7 | Formulary PDF extraction returns drug list | Upload a test formulary PDF; confirm `FormularyExtractionOutput` |
| 8 | Formulary ingestion persists to database | After PDF extraction, confirm rows in `formulary_entries` table |
| 9 | Chat returns context-grounded natural language | Send a question about a test visit; confirm response references visit data |
| 10 | Safety block exception thrown when Gemini blocks content | Trigger a blocked request; confirm `SafetyBlockError` (custom exception) |
| 11 | Patient instructions generated in Spanish | Set language to `"es"`; confirm output in Spanish |
| 12 | All API keys remain server-side only | Confirm no `VITE_GEMINI_API_KEY` in frontend code |

---

## Continues in Part 2B

**Part 2B: Deterministic Rules Engine, Formulary Service, and Prescription Orchestration** covers:
- `RulesEngineService`: allergy blacklist, drug interaction lookup, dose range sanity, formulary coverage, duplicate therapy
- `FormularyService`: coverage lookups, alternative suggestions, copay comparison
- `PrescriptionService`: the orchestrator that chains Gemini → Rules → Coverage → Safety Receipt
- Safety blocking flow: how check failures produce BLOCKED status
- Prescription approval and rejection workflow
- Analytics event emission for every prescription action
