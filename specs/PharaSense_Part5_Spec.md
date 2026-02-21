# PharmaSense V2 — Part 5: Patient Experience — Patient Pack, Accessibility, ElevenLabs Voice
### Depends on: Part 1 (Schema, Auth), Part 2A (GeminiService §4.6 Patient Instructions Prompt), Part 2B (PrescriptionService §4.6 Approval Flow, Receipt Builder), Part 3 (Design System, i18n, Accessibility), Part 4 (Visit Detail, Receipt Link)

This document specifies every patient-facing feature: the Patient Understanding Mode ("patient pack"), the Coverage-Aware Safety Receipt display, cost shock prevention, ElevenLabs voice integration, medication pronunciation, PDF generation, and the patient profile / prescriptions / visits pages.

> **Track alignment:**
> - **Best Health and Accessibility Hack** (Main): Patient Understanding Mode, plain-language 6th-grade instructions, "what to avoid" list, side effect triage, daily schedule, dyslexia font, high contrast, screen reader support
> - **Best AI/ML Immersion Hack** (Side): Gemini generates patient instructions in the patient's language; grounded in prescription context
> - **Best Use of ElevenLabs** (MLH): Voice pack after approval — how to take, what to avoid, when to seek help — in selected language

> **V1 problems addressed:**
> - No patient understanding mode — prescriptions showed only medication/dosage/frequency
> - Copay info embedded as raw text in notes (`|| COPAY_INFO: ... ||`) → structured coverage display from the rules engine
> - No voice output → ElevenLabs integration for multilingual audio
> - No PDF export of patient-friendly summary
> - Insurance card OCR called Gemini directly from frontend → all AI calls proxied through backend

---

## 1. Patient Understanding Mode — "Patient Pack"

### 1.1 What It Is

After a clinician approves a prescription, the system generates a **patient pack**: a single-screen summary that tells the patient everything they need to know about their medication in plain language. This is the signature deliverable for the Health and Accessibility track.

### 1.2 Data Source

The patient pack is generated during prescription approval (Part 2B, Section 4.6). The backend calls `gemini_service.generate_patient_instructions()` (Part 2A, Section 4.6), which returns a `PatientInstructionsOutput` (Pydantic model):


This is persisted in `prescriptions.patient_instructions` (JSONB column) and included in the `PrescriptionReceipt` response.

### 1.3 Component: `PatientPack.tsx`

**File:** `frontend/src/components/patient/PatientPack.tsx`

**Props:**


### 1.4 Layout


### 1.5 Section Components

Each section of the patient pack is a separate component for reusability:

| Component | File | Props | Purpose |
|---|---|---|---|
| `MedicationSchedule` | `patient/MedicationSchedule.tsx` | `schedule: string` | "Today's Schedule" section |
| `AvoidList` | `patient/AvoidList.tsx` | `items: string[]` | "What to Avoid" section |
| `SideEffectTriage` | `patient/SideEffectTriage.tsx` | `normal: string[], seekHelp: string[]` | Two-column side effect display |
| `VoicePlayer` | `patient/VoicePlayer.tsx` | `audioUrl: string \| null, onGenerate: () => void, isGenerating: boolean` | Audio playback/generation button |

### 1.6 MedicationSchedule Component

**File:** `frontend/src/components/patient/MedicationSchedule.tsx`

**Props:**


**Rendering:**
- Display the `schedule` string in a highlighted card with `bg-accent-blue/10 border border-accent-blue/30`.
- Parse the text for time-of-day keywords and prepend icons:
  - "morning" → ☀️
  - "afternoon" → 🌤️
  - "evening" / "night" / "dinner" → 🌙
  - "bedtime" → 🛏️
- If no keywords match, render the text plain.
- Font: `text-body-lg` for readability.

### 1.7 AvoidList Component

**File:** `frontend/src/components/patient/AvoidList.tsx`

**Props:**


**Rendering:**
- Unordered list with `🚫` prefix icon on each item.
- Each item in a card row: `bg-accent-red/5 border-l-4 border-accent-red/40 p-3 rounded-lg`.
- Font: `text-body`.

### 1.8 SideEffectTriage Component

**File:** `frontend/src/components/patient/SideEffectTriage.tsx`

**Props:**


**Rendering:**

Two-column layout on `md+`, stacked on mobile:

| Left Column | Right Column |
|---|---|
| Header: "Normal (usually harmless)" | Header: "Seek Help Immediately" |
| Background: `bg-accent-green/5` | Background: `bg-accent-red/5` |
| Border: `border-l-4 border-accent-green` | Border: `border-l-4 border-accent-red` |
| Icon per item: `😌` | Icon per item: `🚨` |

This visual contrast is intentional — it makes the triage decision instant for the patient.

---

## 2. Coverage-Aware Safety Receipt — Display Component

### 2.1 Component: `PrescriptionReceipt.tsx`

**File:** `frontend/src/components/prescription/PrescriptionReceipt.tsx`

**Props:**


### 2.2 Layout

The receipt is a full-page or expandable view that displays the complete `PrescriptionReceipt` data structure from Part 1, Section 7.1.


### 2.3 Sections

**Medication header:** Name, generic name, dosage, frequency, duration, approver, date.

**Coverage section:** Uses the `CoverageBar` component from Part 4, expanded with the `reason` text.

**Safety checks section:** Same expandable checklist as `SafetyBadge` from Part 4, but always expanded in the receipt view.

**Alternatives considered:** If `receipt.alternatives` is non-empty, render each as a row:
- Medication name
- Copay (formatted with `formatCurrency`)
- Coverage status badge
- Reason text

If no alternatives: "No alternatives considered — this was the optimal choice."

**Reasoning section:** Two tabs or two blocks:
- "For Clinician" — `receipt.reasoning.clinicianSummary` in standard text.
- "For Patient" — `receipt.reasoning.patientExplanation` in `text-body-lg` with `bg-accent-purple/5` background (AI-generated indicator).

**Patient pack toggle:** `<Button variant="secondary" onClick={onTogglePatientPack}>` — expands to show the full `PatientPack` component inline below the receipt.

---

## 3. Cost Shock Prevention

### 3.1 Savings Card Component

**File:** `frontend/src/components/prescription/SavingsCard.tsx`

**Purpose:** When a cheaper covered alternative exists, display a prominent savings callout.

**Props:**


### 3.2 Layout

Rendered inside the `PrescriptionCard` (Part 4) and the `PrescriptionReceipt` when applicable:


### 3.3 Display Logic

Show the savings card when:
1. The current prescription has `estimatedCopay > 0`.
2. At least one alternative has a lower copay.
3. The difference is ≥ $5/month.

Calculate savings: `currentCopay - cheapestAlternativeCopay`.
Show annual projection: `monthlySavings * 12`.

**i18n keys used:**
- `coverage.savings` → "This alternative saves about"
- `coverage.perMonth` → "per month"

### 3.4 Prior Auth Indicator

Below the savings card, show a prior auth status line:

| Condition | Display |
|---|---|
| `priorAuthRequired === false` | `✓ Prior authorization: Not required` (green) |
| `priorAuthRequired === true` | `⚠ Prior authorization likely required` (amber) + reason text |

---

## 4. ElevenLabs Voice Integration

### 4.1 Architecture


### 4.2 Backend: `VoiceService`

**File:** `backend/pharmasense/services/voice_service.py`

**Dependencies:** `httpx` for ElevenLabs API, `boto3` for DigitalOcean Spaces, `prescription_repository`, `analytics_service`. Load API keys from settings.


### 4.3 Public Method

`generate_voice_pack(request: VoiceRequest) -> VoiceResponse` — async. Build script from patient instructions, call ElevenLabs, upload to Spaces, update prescription, emit analytics.


### 4.4 Voice Script Builder

`_build_voice_script(request: VoiceRequest) -> str` — constructs a natural spoken-language script from the patient instructions. Fetch prescription and patient instructions from DB; concatenate greeting, how_to_take, daily_schedule, what_to_avoid, seek_help sections. Use language (`en`/`es`) for localized intro text.


### 4.5 ElevenLabs API Call

`_call_elevenlabs(text: str, language: str) -> bytes` — use `httpx.post` to `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}` with `xi-api-key` header, JSON body `{"text": text, "model_id": "eleven_multilingual_v2", "voice_settings": {...}}`, accept `application/octet-stream`. Return response bytes.


**Key configuration:**
- Model: `eleven_multilingual_v2` — supports English + Spanish natively.
- Voice settings: stability 0.5, similarity 0.75 — balanced between consistent and natural.
- Output format: MP3 (default).

### 4.6 Voice Router

**File:** `backend/pharmasense/routers/voice.py`


### 4.7 Request/Response DTOs

Pydantic: `VoiceRequest(prescription_id: str, text: str, language: Literal["en","es"])`, `VoiceResponse(audio_url: str, prescription_id: str)`.


### 4.8 Frontend: `VoicePlayer.tsx`

**File:** `frontend/src/components/patient/VoicePlayer.tsx`

**Props:**


**States:**
- Not generated: Show `<Button>🔊 Listen to Instructions</Button>`.
- Generating: Show button with spinner + "Generating voice..."
- Ready: Show audio player.

**Audio player when `audioUrl` is available:**


**Implementation:**
- Use the native HTML5 `<audio>` element with custom controls.
- Play/pause button with toggle icon.
- Progress bar showing current time / duration.
- Playback speed selector: 0.75x, 1x, 1.25x, 1.5x.
- "Regenerate in {other language}" button if the user switches language.
- ARIA: `aria-label="Voice instructions audio player"`, play button has `aria-label="Play"` / `aria-label="Pause"`.

### 4.9 Medication Name Pronunciation Button

On every prescription card and in the patient pack, next to the medication name, render a small speaker icon button:


**Behavior:**
1. On click, call `POST /api/voice/generate` with `{ prescriptionId: "pronunciation", text: medicationName, language }`.
2. Play the returned audio immediately (short clip, ~2 seconds).
3. Cache the audio URL in component state to avoid re-generation on repeated clicks.
4. Use a short, snappy animation on the icon while generating.

This is a lightweight ElevenLabs call — the text is just the medication name (e.g., "Metformin"), producing a 1–2 second clip. These can be cached aggressively.

---

## 5. Storage Service — DigitalOcean Spaces

### 5.1 File Location


### 5.2 Implementation


### 5.3 S3 Client Configuration

In `config/settings.py` or a dedicated `storage` module: create `boto3.client("s3", endpoint_url=..., region_name=..., aws_access_key_id=..., aws_secret_access_key=...)`. Use environment variables for credentials.


---

## 6. PDF Generation — Patient Pack PDF

### 6.1 Backend Endpoint

`POST /api/prescriptions/{id}/pdf` — generates and returns a PDF of the patient pack.

### 6.2 PDF Contents

Generated server-side using OpenPDF. The PDF includes:

| Section | Content |
|---|---|
| Header | PharmaSense logo, "Prescription Summary", date |
| Medication | Name, generic, dosage, frequency, duration |
| Coverage | Status, tier, copay, plan name |
| Plain Summary | `plainLanguageSummary` from patient instructions |
| How to Take | `howToTake` text |
| Today's Schedule | `dailySchedule` text |
| What to Avoid | Bulleted list from `whatToAvoid` |
| Side Effects | Two-column table: Normal vs Seek Help |
| Safety Checks | Pass/fail status for each check |
| Approved By | Clinician name and date |
| QR Code | URL to the digital receipt (for re-access) |

### 6.3 PDF Generation Service

**File:** `backend/pharmasense/services/pdf_service.py`. Use ReportLab: `Document`, `SimpleDocTemplate`, `Paragraph`, `Table`. Build sections (header, medication, coverage, plain summary, how to take, schedule, what to avoid, side effects, safety checks, QR code). Return `bytes`. Optionally upload to Spaces and return URL.


### 6.4 Frontend PDF Button

The "Download PDF" button calls `POST /api/prescriptions/{id}/pdf` (or `GET` if backend returns redirect). Backend generates PDF with ReportLab, returns `StreamingResponse` with `media_type="application/pdf"` and `headers={"Content-Disposition": "attachment; filename=..."}`.


Alternatively, the backend uploads the PDF to DigitalOcean Spaces and returns a URL. The frontend opens the URL in a new tab.

---

## 7. Patient Profile Page — `PatientProfilePage.tsx`

### 7.1 Layout


### 7.2 Key Changes from V1

| Feature | V1 | V2 |
|---|---|---|
| Allergies storage | Keys of `medical_history` JSONB | Dedicated `allergies TEXT[]` column |
| Insurance OCR | Frontend calls Gemini directly | `POST /api/ocr` with `sourceType: "INSURANCE_CARD"` |
| Profile picture | Supabase Storage direct upload | Backend-proxied upload to DigitalOcean Spaces (or keep Supabase Storage) |
| Medical history | Flat key-value JSON | Structured JSONB with condition name + description + date |
| Language preference | Saved to `patients.preferred_language` | Same, plus drives the `uiStore.language` |

### 7.3 Insurance Card OCR Flow (V2)

1. Patient clicks "Scan Insurance Card" or uploads a photo.
2. If using camera: open webcam capture via `react-webcam`, take photo, get base64.
3. If using file upload: read file as base64.
4. Call `POST /api/ocr` with `{ base64Data, mimeType: "image/jpeg", sourceType: "INSURANCE_CARD" }`.
5. Backend routes to `OcrService.processInsuranceCard()` → `GeminiService.extractFromInsuranceCard()`.
6. Returns `InsuranceCardOutput` with provider, policyNumber, groupNumber, etc.
7. Populate insurance form fields with extracted values.
8. Show "Review and Save" prompt — patient confirms before saving.
9. On save, call `PUT /api/patients/{id}` with updated `insuranceDetails` JSONB.

### 7.4 Allergy Management

**Display:** Tag list with remove buttons.

**Add:** Input field with "Add" button. On submit, call `PUT /api/patients/{id}` appending to the `allergies` array.

**Remove:** Click `✕` on a tag → confirmation dialog → call `PUT /api/patients/{id}` removing from the `allergies` array.

**Cross-reference with extraction:** If the backend's extraction panel (Part 4) detects new allergies, they can be auto-suggested here with "Add to profile?" prompts.

---

## 8. Patient Prescriptions Page — `PatientPrescriptionsPage.tsx`

### 8.1 Layout


### 8.2 Key Changes from V1

| Feature | V1 | V2 |
|---|---|---|
| Copay display | Extracted from notes with regex | `prescription.estimatedCopay` + `prescription.coverageStatus` from DB |
| Actions | Only reminder bell | Receipt, voice, reminder, chat — 4 actions per prescription |
| Coverage info | Not visible | Coverage badge with tier and copay on every card |

### 8.3 Action Behaviors

| Action | Behavior |
|---|---|
| View Receipt | Navigate to a modal/page showing `<PrescriptionReceipt>` for this prescription. Fetches via `GET /api/prescriptions/{id}/receipt`. |
| Listen | If `audioUrl` exists, play it. If not, show "Generate" button which calls `POST /api/voice/generate`. |
| Reminder | Open `<ReminderModal>` (Section 9). |
| Chat | Navigate to `/visit/{visitId}/chat` for the visit associated with this prescription. |

---

## 9. Medication Reminder Modal — `ReminderModal.tsx`

### 9.1 Component

**File:** `frontend/src/components/shared/ReminderModal.tsx`

**Props:**


### 9.2 Layout


### 9.3 Smart Defaults

Parse the `frequency` string to suggest default times:

| Frequency | Defaults |
|---|---|
| "once daily" / "daily" | Morning: 08:00 |
| "twice daily" | Morning: 08:00, Evening: 18:00 |
| "three times daily" | Morning: 08:00, Afternoon: 13:00, Evening: 18:00 |
| "at bedtime" | Night: 21:00 |
| "as needed" | No default — user chooses |

### 9.4 Save Flow

1. Convert local time(s) to UTC.
2. Call backend endpoint or Supabase directly to save reminder(s).
3. Show success state with green checkmark.
4. Auto-close after 1.5 seconds.

---

## 10. Patient Visits Page — `PatientVisitsPage.tsx`

### 10.1 Layout


Each card links to `/visit/{visitId}` where the full visit detail (Part 4, Section 14) is displayed.

---

## 11. Demo Script Integration Points (Steps 5–6)

| Demo Step | Component | What the Judge Sees |
|---|---|---|
| 5. Patient pack appears | `PatientPack` | Plain-language instructions, schedule, avoid list, side effects triage — all visible at once |
| 5. Play ElevenLabs voice | `VoicePlayer` | Click play → natural voice reads medication instructions aloud |
| 5. Language switch | `AccessibilityToolbar` | Toggle to Spanish → pack text is in Spanish, voice regenerates in Spanish |
| Extra: PDF download | PDF button | Click → professional PDF downloads instantly |
| Extra: Savings card | `SavingsCard` | "This alternative saves $55/month" — visible on the prescription card |

---

## 12. Part 5 Acceptance Criteria

| # | Criterion | Verification |
|---|---|---|
| 1 | Patient pack renders all 6 sections | All sections visible: summary, how to take, schedule, avoid, side effects, safety |
| 2 | Side effect triage shows two-column layout | Normal (green) on left, Seek Help (red) on right |
| 3 | Plain language summary is ≤ 6th grade reading level | Verify with Flesch-Kincaid readability tool |
| 4 | Prescription receipt displays all fields | Coverage, safety checks, alternatives, reasoning, instructions all populated |
| 5 | Savings card appears when cheaper alternative exists | Card shows monthly and annual savings |
| 6 | Prior auth indicator displays correctly | "Not required" (green) or "Required" (amber) per prescription |
| 7 | ElevenLabs voice generates successfully | Click Listen → audio plays within 5 seconds |
| 8 | Voice plays in selected language | Switch to Spanish → re-generate → audio in Spanish |
| 9 | Audio uploaded to DigitalOcean Spaces | Check Spaces bucket → `voice-packs/{id}.mp3` exists |
| 10 | Prescription `audio_url` updated after generation | DB column is non-null after voice generation |
| 11 | Medication pronunciation button plays name | Click speaker icon next to "Metformin" → hears "Metformin" |
| 12 | PDF downloads with all patient pack sections | Open PDF → all 6 sections present and formatted |
| 13 | Insurance card OCR populates form fields | Upload card photo → provider, policy, group filled in |
| 14 | Insurance save requires manual confirmation | OCR fills fields → "Review and Save" button, not auto-save |
| 15 | Allergy management: add and remove | Add "Latex" → appears in tag list. Click ✕ → removed after confirmation |
| 16 | Patient prescriptions page shows coverage | Each card shows tier, copay, coverage status |
| 17 | Patient prescriptions page has 4 actions | Receipt, Listen, Reminder, Chat buttons on every card |
| 18 | Reminder modal suggests smart defaults | "Twice daily" prescription → morning 08:00 + evening 18:00 pre-filled |
| 19 | Voice player has playback speed control | Change to 1.5x → audio plays faster |
| 20 | All patient-facing text supports Spanish | Toggle to ES → all labels, pack sections, receipt sections in Spanish |
| 21 | Screen reader announces voice player state | Play → "Playing voice instructions". Pause → "Paused". |
| 22 | `VOICE_PACK_GENERATED` analytics event emitted | Check `analytics_events` table → row exists after voice generation |

---

## Continues in Part 6

**Part 6 — Analytics (Snowflake), Deployment (DigitalOcean), and Demo Script** covers:
- Snowflake analytics pipeline: event streaming, de-identified data model
- Analytics dashboard: copay savings, safety blocks, time saved, adherence risk
- DigitalOcean deployment: Droplet provisioning, Docker Compose, Spaces, SSL
- Seed data reset button
- 3-minute demo script with exact sequence
- Final QA checklist for every track
