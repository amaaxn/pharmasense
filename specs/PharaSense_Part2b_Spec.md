# PharmaSense V2 — Part 2B: Deterministic Rules Engine, Formulary Service, and Prescription Orchestration
### Depends on: Part 1 (Schema, Auth, API Conventions), Part 2A (GeminiService, OCR, Prompts)

This document specifies the deterministic safety layer that sits between Gemini's AI output and the final prescription decision. It covers the rules engine, formulary lookups, the prescription orchestration service that ties everything together, and the analytics event pipeline.

> **This is the layer that transforms PharmaSense from "Gemini recommends" to "PharmaSense enforces safety and coverage constraints, then explains the tradeoffs."** Every judge-facing track benefits from this layer existing and being visible in the UI.

> **V1 problems addressed:**
> - Validation was limited to exact case-insensitive allergy name matching
> - Duplicate therapy check was commented out
> - Drug interaction check was a `TODO` placeholder
> - No formulary coverage lookup existed in the backend
> - No dose range validation existed
> - No concept of "blocking" — all issues were warnings

---

## 1. Rules Engine Service — Architecture

### 1.1 File Location

**File:** `backend/pharmasense/services/rules_engine_service.py`

### 1.2 Design Principle

The `RulesEngineService` is **purely deterministic**. It does not call any AI model. It operates on structured data from the database (formulary entries, drug interactions, dose ranges, patient records) and returns a list of safety check results with pass/fail/warning status.

The rules engine runs **after** Gemini returns recommendations and **before** the results are shown to the clinician. This ensures the clinician sees Gemini's suggestions already annotated with safety and coverage status.

### 1.3 Dependencies

Inject repositories (or SQLAlchemy session) via constructor. Use dataclasses or Pydantic for `RulesEngineInput`, `SafetyCheckResult`, `RulesEngineOutput`, `CoverageResult`, `AlternativeSuggestion`.

### 1.4 Public Interface

**The single public method:** `evaluate(input: RulesEngineInput) -> RulesEngineOutput`


---

## 2. Safety Check Implementations

### 2.1 Allergy Check

**Logic:** Compare the proposed medication name against the patient's allergy list. Use case-insensitive matching with substring matching to catch drug class allergies.


**Drug class allergy mapping:** Implement `_is_drug_class_allergy_match` with a module-level `DRUG_CLASS_MAP: dict[str, set[str]]` for common cross-reactivity.


### 2.2 Drug Interaction Check

**Logic:** For each proposed medication, check against all of the patient's current medications using the `drug_interactions` table.


**Interaction severity → blocking rule:**

| Severity | Status | Blocking | UI Treatment |
|---|---|---|---|
| `SEVERE` | `FAIL` | `true` | Red BLOCKED badge; prescription cannot be approved until clinician overrides |
| `MODERATE` | `WARNING` | `false` | Orange WARNING badge; prescription can be approved with acknowledgment |
| `MILD` | `WARNING` | `false` | Yellow INFO badge; informational only |

### 2.3 Dose Range Sanity Check

**Logic:** Extract the numeric dose from the proposed dosage string and compare against the `dose_ranges` table.


**Dose parsing helper:** `_parse_dose_to_mg(dosage: str) -> float | None` — use `re` to extract numeric value and unit; convert g→mg, mcg→mg.

**Repository/DAO method required:** `find_by_medication_name(name: str) -> DoseRange | None` — case-insensitive match on `medication_name`.

### 2.4 Duplicate Therapy Check

**Logic:** Check if the patient already has an active prescription for the same medication or the same drug class.


---

## 3. Formulary Service

### 3.1 File Location

**File:** `backend/pharmasense/services/formulary_service.py`

### 3.2 Purpose

`FormularyService` handles insurance formulary lookups, coverage determinations, alternative suggestions, and formulary data ingestion from PDF extraction.

### 3.3 Public Methods

`lookup_coverage(medication_name, generic_name, plan_name)`, `find_alternatives(medication_name, plan_name, max_results)`, `import_extracted_formulary(extraction, plan_name)`.

### 3.4 Coverage Lookup Logic


### 3.5 Alternative Suggestions


### 3.6 Formulary Ingestion from PDF Extraction


### 3.7 Required Repository Methods


---

## 4. Prescription Service — The Orchestrator

### 4.1 File Location

**File:** `backend/pharmasense/services/prescription_service.py`

### 4.2 Purpose

`PrescriptionService` is the central orchestrator that ties the AI layer (`GeminiService`) to the safety layer (`RulesEngineService`) and the coverage layer (`FormularyService`). It manages the full lifecycle of a prescription: recommendation → validation → approval/rejection → receipt generation.

### 4.3 Dependencies

Inject `gemini_service`, `rules_engine_service`, `formulary_service`, repositories (prescription, safety_check, visit, patient), `analytics_service` via constructor or FastAPI dependency.

### 4.4 Public Methods

| Method | Input | Output | Description |
|---|---|---|---|
| `generate_recommendations(...)` | `RecommendationRequest` | `RecommendationResponse` | Full pipeline: Gemini → Rules → Coverage → annotated options |
| `validate_prescriptions(...)` | `ValidationRequest` | `ValidationResponse` | Standalone rules engine check |
| `approve_prescription(...)` | `PrescriptionApprovalRequest` | `PrescriptionReceipt` | Approve and generate receipt |
| `reject_prescription(...)` | `PrescriptionRejectionRequest` | `None` | Mark as rejected with reason |
| `get_receipt(...)` | `UUID prescription_id` | `PrescriptionReceipt` | Fetch existing receipt |
| `generate_patient_pack(...)` | `UUID prescription_id` | `PatientInstructionsOutput` | Generate patient instructions for approved Rx |

### 4.5 Recommendation Pipeline — Detailed Flow

This is the most important method. It orchestrates the complete recommendation flow.

**`generateRecommendations(RecommendationRequest request)` — step by step:**


**Implementation:**


### 4.6 Prescription Approval Flow

**`approvePrescription(PrescriptionApprovalRequest request)` — step by step:**


**PrescriptionApprovalRequest:** Pydantic model with `prescription_id: UUID`, `confirmed_safety_review: bool`, `comment: str | None`.


**Implementation:**


### 4.7 Prescription Rejection Flow


### 4.8 Receipt Builder

The receipt is built from an approved prescription and its related data. This implements the "Coverage-Aware Safety Receipt" — PharmaSense's signature feature.


---

## 5. Prescription Router

### 5.1 Endpoint Implementation

**File:** `backend/pharmasense/routers/prescriptions.py`. Use FastAPI `APIRouter` with prefix `/api/prescriptions`. Each endpoint delegates to `prescription_service` and returns `ApiResponse`-wrapped data.


---

## 6. Analytics Event Service

### 6.1 File Location

**File:** `backend/pharmasense/services/analytics_service.py`

### 6.2 Purpose

Captures de-identified events for every prescription action. Events are stored locally in the `analytics_events` table and optionally synced to Snowflake (covered in Part 6).

### 6.3 Implementation

`emit(event_type: AnalyticsEventType, data: dict)` — create `AnalyticsEvent` model, save via SQLAlchemy, optionally trigger async Snowflake sync (background task or `asyncio.create_task`).


### 6.4 Events Emitted by the Prescription Pipeline

| Event Type | When | Data Fields |
|---|---|---|
| `RECOMMENDATION_GENERATED` | After Step 5 of recommendation pipeline | visitId, totalOptions, blockedCount, warningCount |
| `OPTION_BLOCKED` | For each blocked recommendation | visitId, medication, reason |
| `OPTION_APPROVED` | After prescription approval | prescriptionId, medication, copay, visitId |
| `OPTION_REJECTED` | After prescription rejection | prescriptionId, medication, reason |
| `VOICE_PACK_GENERATED` | After ElevenLabs audio generation (Part 5) | prescriptionId, language, durationSeconds |
| `PATIENT_PACK_VIEWED` | When patient views their pack (Part 5) | prescriptionId, patientId |

---

## 7. Required SQLAlchemy Models — Supplement to Part 1

Part 1 defined the database schema. Here are the SQLAlchemy model specifications for the new tables introduced by the rules engine. Use declarative base, `Mapped`, `mapped_column`, and appropriate relationships.

### 7.1 DrugInteraction Model

Table `drug_interactions`: `id`, `drug_a`, `drug_b`, `severity`, `description`, `source`, `created_at`.

### 7.2 DoseRange Model

Table `dose_ranges`: `id`, `medication_name`, `min_dose_mg`, `max_dose_mg`, `unit`, `frequency`, `population`, `source`, `created_at`.

### 7.3 FormularyEntry Model

Table `formulary_entries`: `id`, `plan_name`, `medication_name`, `generic_name`, `tier`, `copay`, `covered`, `prior_auth_required`, `quantity_limit`, `step_therapy_required`, `alternatives_json`, `created_at`.

### 7.4 SafetyCheck Model

Table `safety_checks`: `id`, `prescription_id` (FK), `check_type`, `status`, `medication_name`, `details`, `blocking`, `created_at`.

### 7.5 AnalyticsEvent Model

Table `analytics_events`: `id`, `event_type`, `event_data` (JSONB), `created_at`.


---

## 8. Seed Data Requirements — Supplement to Part 1

### 8.1 Dose Ranges Seed Data

`seed/seed-dose-ranges.sql` must include at least 15 common medications:

| Medication | Min (mg) | Max (mg) | Frequency | Population |
|---|---|---|---|---|
| Metformin | 500 | 2550 | daily total | adult |
| Lisinopril | 5 | 40 | once daily | adult |
| Amoxicillin | 250 | 3000 | daily total | adult |
| Atorvastatin | 10 | 80 | once daily | adult |
| Omeprazole | 20 | 40 | once daily | adult |
| Ibuprofen | 200 | 3200 | daily total | adult |
| Losartan | 25 | 100 | once daily | adult |
| Amlodipine | 2.5 | 10 | once daily | adult |
| Sertraline | 25 | 200 | once daily | adult |
| Metoprolol | 25 | 400 | daily total | adult |
| Gabapentin | 300 | 3600 | daily total | adult |
| Levothyroxine | 0.025 | 0.3 | once daily | adult |
| Prednisone | 5 | 60 | once daily | adult |
| Warfarin | 1 | 10 | once daily | adult |
| Ciprofloxacin | 250 | 1500 | daily total | adult |

---

## 9. Complete Data Flow Diagram


---

## 10. Testing Strategy

### 10.1 RulesEngineService Unit Tests

These tests do not require Gemini or a database. Mock the repositories.

| Test Case | Input | Expected Outcome |
|---|---|---|
| Allergy exact match | Patient allergic to "Penicillin", proposed: "Penicillin V" | ALLERGY FAIL, blocking=true |
| Allergy class match | Patient allergic to "penicillin", proposed: "Amoxicillin" | ALLERGY FAIL, blocking=true (via drug class map) |
| Allergy no match | Patient allergic to "Penicillin", proposed: "Ciprofloxacin" | ALLERGY PASS |
| No allergies | Patient has empty allergy list | ALLERGY PASS |
| Severe interaction | Patient on Warfarin, proposed: Aspirin | INTERACTION FAIL, blocking=true |
| Moderate interaction | Patient on Lisinopril, proposed: Ibuprofen (NSAIDs) | INTERACTION WARNING, blocking=false |
| No interaction | Patient on Metformin, proposed: Amoxicillin | INTERACTION PASS |
| Dose too high | Atorvastatin 120mg (max 80mg) | DOSE_RANGE FAIL, blocking=true |
| Dose too low | Metformin 100mg (min 500mg) | DOSE_RANGE WARNING, blocking=false |
| Dose in range | Lisinopril 20mg (range 5-40) | DOSE_RANGE PASS |
| Dose unparseable | Dosage string "two tablets" | DOSE_RANGE WARNING, "Could not parse" |
| Duplicate exact | Patient on Lisinopril, proposed: Lisinopril | DUPLICATE_THERAPY WARNING |
| Duplicate class | Patient on Atorvastatin, proposed: Simvastatin | DUPLICATE_THERAPY WARNING (both statins) |
| No duplicate | Patient on Metformin, proposed: Lisinopril | DUPLICATE_THERAPY PASS |
| Coverage found | Metformin in DEMO_PLAN, Tier 1, $5 | COVERED, copay=$5 |
| Coverage not found | "ExperimentalDrug" not in any plan | UNKNOWN, alternatives suggested |
| Coverage prior auth | Eliquis in DEMO_PLAN, Tier 3, PA required | PRIOR_AUTH_REQUIRED |

### 10.2 PrescriptionService Integration Tests

These tests require Gemini (can be mocked) and a test database.

| Test Case | Expected |
|---|---|
| Full recommendation pipeline with clean patient | 3 options returned, all RECOMMENDED |
| Patient with penicillin allergy, Gemini suggests amoxicillin | Amoxicillin option is BLOCKED |
| Patient on warfarin, Gemini suggests aspirin | Aspirin option is BLOCKED with SEVERE interaction |
| Approve RECOMMENDED prescription | Status → APPROVED, receipt generated, patient instructions populated |
| Approve BLOCKED prescription | `SafetyBlockError` (or `HTTPException(422)`) thrown |
| Approve without confirmed_safety_review | `ValidationError` or `HTTPException(400)` thrown |
| Reject prescription | Status → REJECTED, analytics event emitted |

---

## 11. Part 2B Acceptance Criteria

| # | Criterion | Verification |
|---|---|---|
| 1 | Allergy check catches exact name match | Unit test passes |
| 2 | Allergy check catches drug class cross-reactivity | "penicillin" allergy blocks "amoxicillin" |
| 3 | Drug interaction check queries both directions | (Warfarin, Aspirin) and (Aspirin, Warfarin) both match |
| 4 | SEVERE interactions are blocking | `hasBlockingFailure` is true |
| 5 | MODERATE interactions are warnings | `hasBlockingFailure` is false, checks contain WARNING |
| 6 | Dose range check parses "500mg", "0.5g", "250 mcg" correctly | `parseDoseToMg` returns correct values |
| 7 | Dose exceeding max is blocking | blocking=true on FAIL |
| 8 | Duplicate therapy detects same-class drugs | Two statins detected as duplicate |
| 9 | Formulary lookup returns coverage for known drug | Metformin → COVERED, Tier 1, copay from seed |
| 10 | Formulary lookup returns UNKNOWN for missing drug | Unknown drug → UNKNOWN with alternatives |
| 11 | Alternative suggestions return cheaper covered options | Alternatives sorted by copay ascending |
| 12 | Full pipeline: Gemini → Rules → Coverage → DB persist | `POST /api/prescriptions/recommend` returns annotated options with safety checks and coverage |
| 13 | Blocked prescription cannot be approved | `POST /api/prescriptions/approve` returns 422 for blocked Rx |
| 14 | Approved prescription generates receipt | Receipt contains coverage, safety checks, alternatives, patient instructions |
| 15 | Analytics events emitted for all actions | `analytics_events` table has rows for recommendation, approve, reject, block |
| 16 | Formulary PDF ingestion persists to database | Upload PDF → `formulary_entries` rows created |

---

## Continues in Part 3

**Part 3: Frontend Shell, Design System, Routing, and State Management** covers:
- Tailwind design system tokens, color palette, typography
- Accessibility system: WCAG 2.1 AA, skip links, ARIA, dyslexia font, high-contrast, large type
- Language toggle (English/Spanish i18n)
- Zustand stores: visitStore, prescriptionStore, uiStore
- Component library: buttons, cards, modals, badges
- Responsive layout and navigation
- Framer Motion animation patterns
