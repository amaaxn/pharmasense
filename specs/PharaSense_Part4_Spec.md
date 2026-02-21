# PharmaSense V2 — Part 4: Clinician Workflow — Live Cockpit, Visit Creation, and Prescription Recommendations
### Depends on: Part 1 (Schema, Auth, API), Part 2A (Gemini, OCR), Part 2B (Rules Engine, PrescriptionService), Part 3 (Design System, Stores, Components)

This document specifies the clinician-facing workflow from dashboard through visit creation, the Live Cockpit, the Three-Lane Review, the approval flow, and the "Talk to the Prescription" chat. This is the primary demo path and the most judge-visible surface area.

> **V1 problems addressed:**
> - Single-column form layout with no live feedback → three-panel Live Cockpit with real-time updates
> - Recommendations displayed as a flat list → Three-Lane Review (Best Covered / Cheapest / Clinical Backup)
> - Approval was a simple button → one-click approve with mandatory safety review checkbox
> - No visible safety checks → "Safety Passed" badge with expandable checklist
> - No coverage visibility at decision time → CoverageBar with tier, copay, and prior auth status on every card
> - Copay extracted via a second Gemini call after approval → copay determined by the rules engine during recommendation
> - No real-time reaction to note changes → live extraction + instant re-recommendation on allergy detection

---

## 1. Clinician Dashboard — `ClinicianDashboardPage.tsx`

### 1.1 Page Layout


### 1.2 Specification

**Grid:** `grid grid-cols-1 lg:grid-cols-3 gap-6`
- Left column (`lg:col-span-1`): Patient list
- Right column (`lg:col-span-2`): Recent visits

**Patient cards:** Each card is a `<Card hoverable>` linking to `/clinician/patient/{patientId}`. Display:
- Avatar (profile picture or initial fallback)
- Username
- Allergy count badge (red if > 0)
- Active prescription count

**Recent visit cards:** Each card links to `/visit/{visitId}`. Display:
- Patient name + relative time (via `date-fns formatDistanceToNow`)
- Visit reason (truncated to 60 chars)
- Prescription count + completion status

**"+ New Visit" button:** Primary button in the header, navigates to `/clinician/add-visit`.

### 1.3 Data Fetching

Call `GET /api/visits?limit=10` for recent visits and `GET /api/patients` for the patient list. Fetch on mount via `visitStore.fetchVisits()`.

---

## 2. Live Clinician Cockpit — `AddVisitPage.tsx`

This is the centerpiece of the clinician experience and the primary demo surface.

### 2.1 Page Structure — Three-Panel Layout


### 2.2 Responsive Behavior

| Breakpoint | Layout |
|---|---|
| `< 768px` (mobile) | Single column, stacked: Notes → Extraction → Recommendations |
| `768px – 1279px` (tablet) | Two columns: Notes (left) + Recommendations (right); Extraction collapses into an expandable section above Recommendations |
| `≥ 1280px` (desktop) | Three columns as shown above |

**Tailwind grid:**


### 2.3 Component Hierarchy


---

## 3. Patient Search — `PatientSearchBar`

### 3.1 Specification

**File:** `frontend/src/components/clinician/PatientSearchBar.tsx`

**Props:**


**Behavior:**

1. Render an `<Input>` with a search icon and placeholder "Search patients by name...".
2. On input change, debounce 300ms (use `useDebounce` hook from Part 3).
3. Call `GET /api/patients?search={query}` via `patientsApi.search(query)`.
4. Show results in a dropdown below the input (absolute positioned, `z-30`).
5. Each result shows: avatar, username, allergy count badge.
6. Clicking a result calls `onSelect(patient)` and closes the dropdown.
7. When a patient is selected, replace the search input with a **SelectedPatientChip**: a pill showing the patient name, allergy badges, and an `×` button to clear.
8. The `×` button calls `onClear()`.
9. ARIA: `role="combobox"`, `aria-expanded`, `aria-controls` pointing to the results list. Results list uses `role="listbox"`, each result is `role="option"`.

### 3.2 Selected Patient Chip

When a patient is selected, display a chip below the search bar:


- Shows patient name and all allergies inline.
- Red allergy badges if allergies exist.
- Clear button (`✕`) resets patient selection and clears all downstream state (extraction, recommendations).

---

## 4. Notes Capture — Left Panel

### 4.1 Component: `NotesCapture.tsx`

**File:** `frontend/src/components/clinician/NotesCapture.tsx`

**Props:**


### 4.2 Text Input

- A `<TextArea>` component occupying the full panel width.
- Minimum height: 300px. Grows with content (`min-h-[300px] resize-y`).
- Placeholder: "Type visit notes here, or draw on a tablet..."
- Monospace font for clinical note readability: `font-mono text-sm`.
- On every keystroke, call `onNotesChange(value)`.

### 4.3 Drawing Trigger

Below the textarea, render:


- `<Button variant="secondary">` with pencil icon.
- On click, calls `onDrawRequest()` which:
  1. Generates a UUID channel ID.
  2. Stores it in `visitStore.drawingChannelId`.
  3. Opens the `QrCodeModal`.

### 4.4 QR Code Modal

**Component:** `frontend/src/components/drawing/QrCodeModal.tsx`

**Props:**


**Content:**
- Title: "Draw on Your Tablet"
- QR code rendered via `react-qr-code`, encoding the URL: `{window.location.origin}/draw/{channelId}`
- Clickable URL text below QR code (for same-device use).
- Animated "Waiting for drawing..." indicator with a `pulse-gentle` animation.
- When drawing is received (via Supabase real-time), the modal auto-closes and calls `onDrawingReceived()`.

### 4.5 Drawing Preview

After a drawing is received:
- Show a thumbnail of the drawing (base64 image, `max-h-[200px]`).
- Below the thumbnail, show the transcribed text that was appended to notes (highlighted with `bg-accent-purple/10 border-l-2 border-accent-purple` to indicate AI-generated content).
- A `<Badge variant="ai">Transcribed via AI</Badge>` label.

### 4.6 Supabase Real-time Subscription

In `AddVisitPage`, subscribe to the drawing channel when a channel ID is set:


**`processDrawing(base64)` flow:**
1. Set `isProcessingDrawing = true`.
2. Call `POST /api/ocr` with `{ base64Data: base64, mimeType: "image/png", sourceType: "HANDWRITING" }`.
3. Receive `HandwritingExtractionOutput` from backend.
4. Append `transcribedText` to visit notes: `visitStore.appendToNotes(output.transcribedText)`.
5. If `structuredFields` contains allergies or medications not already in extractedData, merge them.
6. Set `isProcessingDrawing = false`.
7. Announce to screen reader: "Drawing transcribed and added to notes."

---

## 5. Drawing Page — `DrawingPage.tsx`

### 5.1 Route

`/draw/:channelId` — accessible without authentication (tablet use case).

### 5.2 Canvas Specification

| Property | Value |
|---|---|
| Library | `react-canvas-draw` |
| Width | `100%` of viewport (max 900px) |
| Height | 70vh |
| Background | `#ffffff` |
| Default brush color | `#000000` |
| Default brush size | 3px |
| Grid | Hidden |

### 5.3 Controls

Toolbar above the canvas:

| Control | Behavior |
|---|---|
| Color picker | 6 preset colors: black, blue, red, green, purple, gray |
| Brush size slider | Range 1–20, default 3 |
| Undo | Remove last stroke |
| Clear | Clear entire canvas |
| Eraser toggle | Switch brush to white (#ffffff) |

### 5.4 Send to Clinician

- "Send to Clinician" primary button below the canvas.
- Disabled until the user has drawn at least one stroke (`isDrawing` state tracked via canvas events).
- On click:
  1. Export canvas to base64 PNG.
  2. Create white-background composite (canvas may have transparency).
  3. Insert into Supabase `drawing_updates` table: `{ channel_id: channelId, base64image: base64 }`.
  4. Show success message: "Drawing sent! You can close this tab."
  5. Disable further sends.

### 5.5 Mobile Optimization

- Touch events supported natively by `react-canvas-draw`.
- Prevent page scroll while drawing: `touch-action: none` on the canvas container.
- Full-screen prompt on mobile: "Rotate to landscape for best experience."

---

## 6. Extraction Panel — Center Panel

### 6.1 Component: `ExtractionPanel.tsx`

**File:** `frontend/src/components/clinician/ExtractionPanel.tsx`

**Props:**


### 6.2 States

**Before extraction (notes empty or not yet extracted):**
- Show an informational card: "Add visit notes, then click Extract to parse clinical data."
- `<Button variant="secondary" onClick={onExtract}>Extract from Notes</Button>`

**During extraction:**
- Show a `<LoadingSpinner>` with "Analyzing notes with AI..."
- Announce to screen reader: "Extracting structured data from notes."

**After extraction:**
- Render structured data in labeled sections:


### 6.3 Allergy Highlighting

Allergies extracted from notes are cross-referenced with the patient record's existing allergies:
- If an allergy from extraction is **new** (not in `patientAllergies`), display it with a `<Badge variant="safety-warn">NEW</Badge>` tag.
- This is a key immersion moment: clinician types "penicillin allergy" → extraction detects it → allergy list updates → recommendations re-evaluate.

### 6.4 Editable Fields

Each extracted section has an "Edit" icon button. Clicking it converts the display to editable inputs:
- Allergies: tag input (add/remove).
- Symptoms: tag input.
- Current medications: tag input.
- Vital signs: key-value inputs.

Edits update the `extractedData` in `visitStore` without re-calling the extraction API.

---

## 7. Recommendation Panel — Right Panel

### 7.1 Component: `RecommendationPanel.tsx`

**File:** `frontend/src/components/clinician/RecommendationPanel.tsx`

**Props:**


### 7.2 States

**Before generation:**
- Empty state with illustration and text: "Select a patient, add notes, and click Generate Recommendations."
- The generate button is in this panel (in addition to the bottom action bar).

**During generation:**
- Three skeleton card placeholders with `pulse-gentle` animation.
- Text: "Generating recommendations with AI..."
- Screen reader announcement: "Generating prescription recommendations."

**After generation:**
- Render `<ThreeLaneReview>` with the three recommendation options.

**On error:**
- `<ErrorBanner>` with retry button.

---

## 8. Three-Lane Review — `ThreeLaneReview.tsx`

This is the core prescription display. Each recommendation is a full-featured card in a vertical stack.

### 8.1 Component

**File:** `frontend/src/components/prescription/ThreeLaneReview.tsx`

**Props:**


### 8.2 Layout

Three cards stacked vertically (not side-by-side — vertical is more readable for detailed clinical information):


Each option has a **lane header** with the label and rank. Labels use these styles:

| Label | Color | Icon |
|---|---|---|
| `BEST_COVERED` | `accent-green` | Shield icon |
| `CHEAPEST` | `accent-cyan` | Dollar icon |
| `CLINICAL_BACKUP` | `accent-amber` | Clipboard icon |

Use `staggerContainer` animation: cards stagger in with 100ms delay.

---

## 9. Prescription Card — `PrescriptionCard.tsx`

### 9.1 Component

**File:** `frontend/src/components/prescription/PrescriptionCard.tsx`

**Props:**


### 9.2 Card Layout — Detailed


### 9.3 Sections in Detail

**Header row:**
- Medication name in `text-h3 font-mono font-semibold text-text-heading`.
- Generic name below in `text-sm text-text-secondary`.

**Dosage row:**
- Three inline badges: Dosage, Frequency, Duration (or "ongoing" if null).
- Use `text-sm font-mono` for clinical precision.

**Coverage section — `CoverageBar` component:**


Renders a horizontal bar:


| Coverage Status | Icon | Color | Background |
|---|---|---|---|
| `COVERED` | Filled circle | `coverage-covered` | `accent-green/10` |
| `NOT_COVERED` | X circle | `coverage-not-covered` | `accent-red/10` |
| `PRIOR_AUTH_REQUIRED` | Clock icon | `coverage-prior-auth` | `accent-amber/10` |
| `UNKNOWN` | Question mark | `coverage-unknown` | `text-secondary/10` |

Tier badge uses `tier-{n}` color. Copay displayed with `formatCurrency()`. Prior auth shows "PA Required" in amber if true.

**Safety section — `SafetyBadge` + expandable checklist:**

At the top of the safety section, render the summary badge:

- If all checks passed: `<Badge variant="safety-pass">Safety Passed ✓</Badge>` with `shadow-glow-green` on hover.
- If any blocking failure: `<Badge variant="safety-fail">BLOCKED ✕</Badge>` with `shadow-glow-red`.
- If warnings only: `<Badge variant="safety-warn">Warning ⚠</Badge>` with `shadow-glow-amber`.

**Clicking the badge toggles the safety checklist** (expandable section):


Each line shows:
- Status icon (✓ green, ✕ red, ⚠ amber)
- Check type label
- Details text
- Status badge (PASS/FAIL/WARNING) right-aligned

If a check failed:


The suggestion is indented and displayed in `text-accent-amber`.

**Rationale section:**
- Text block showing `option.rationale`.
- Prefixed with `<Badge variant="ai">AI Rationale</Badge>` to indicate AI-generated content.

**Clinician comment:**
- A collapsible `<TextArea>` (collapsed by default, expands on click).
- Placeholder: "Add a comment (optional)..."
- Value is passed to the approval request.

### 9.4 Blocked Card Treatment

When `option.blocked === true`:
- The entire card gets: `border-accent-red/50 bg-accent-red/5 opacity-80`.
- A red stripe on the left edge: `border-l-4 border-accent-red`.
- The "BLOCKED" badge replaces the safety badge.
- The `blockReason` is displayed prominently:
  
- The approve button is **disabled** and replaced with:
  
  styled as `text-accent-red/60 cursor-not-allowed`.
- The reject button remains available.
- ARIA: `aria-disabled="true"` on approve, `aria-label="Cannot approve, prescription blocked due to safety check failure"`.

### 9.5 Warnings Card Treatment

When the card has warnings but no blocking failures:
- Yellow left border: `border-l-4 border-accent-amber`.
- The "Warning ⚠" badge is displayed.
- The approve button and checkbox are still enabled.
- The checkbox text changes to: "I have reviewed the warnings and confirm approval".

---

## 10. Approval Flow — `ApprovalCheckbox.tsx`

### 10.1 Component

**File:** `frontend/src/components/prescription/ApprovalCheckbox.tsx`

**Props:**


### 10.2 Approve Flow

1. **Checkbox:** `☐ I have reviewed allergies and interaction flags`
   - Must be checked before the Approve button becomes enabled.
   - If card has warnings, text changes to: `☐ I have reviewed the warnings and confirm approval`
   - Implemented as a controlled checkbox with `aria-required="true"`.

2. **Approve button:**
   - `<Button variant="primary" disabled={!checked || blocked}>Approve Prescription</Button>`
   - On click:
     a. Show a brief loading state on the button.
     b. Call `prescriptionStore.approvePrescription(prescriptionId, comment)`.
     c. This calls `POST /api/prescriptions/approve` with `{ prescriptionId, confirmedSafetyReview: true, comment }`.
     d. On success: the card transitions to **approved state** (green border, ✓ icon, disabled inputs).
     e. The `PrescriptionReceipt` is returned and stored in `prescriptionStore.latestReceipt`.
     f. Screen reader announcement: "{medication} approved."

3. **Reject button:**
   - `<Button variant="danger">Reject</Button>`
   - On click, open a `<ConfirmDialog>` asking for a rejection reason (required text input).
   - On confirm:
     a. Call `prescriptionStore.rejectPrescription(prescriptionId, reason)`.
     b. Card transitions to **rejected state** (muted, strikethrough medication name, red badge).
     c. Screen reader announcement: "{medication} rejected."

### 10.3 Card States After Action

| State | Border | Background | Badge | Actions |
|---|---|---|---|---|
| Recommended (default) | `border-default` | `bg-card` | — | Checkbox + Approve + Reject |
| Needs Review (warnings) | `border-l-4 border-accent-amber` | `bg-card` | `⚠ Warning` | Checkbox + Approve + Reject |
| Blocked | `border-l-4 border-accent-red` | `bg-accent-red/5` | `⛔ BLOCKED` | Reject only |
| Approved | `border-l-4 border-accent-green` | `bg-accent-green/5` | `✓ Approved` | None (read-only) |
| Rejected | `border-l-4 border-text-secondary` | `bg-card opacity-60` | `✕ Rejected` | None (read-only) |

---

## 11. Real-Time Immersion — The Key Demo Moment

### 11.1 The Flow

This is the most impressive moment in the demo: the clinician types "penicillin allergy" into the notes, and the recommendation panel **instantly updates** to show the affected option as BLOCKED.

### 11.2 Implementation: Debounced Re-extraction


**`extractDataFromNotes` calls** `POST /api/visits/{id}/extract` or, if the visit hasn't been created yet, a lightweight client-side keyword detection:

### 11.3 Client-Side Quick Allergy Detection

For instant feedback before the full extraction API returns, implement a fast client-side allergy detector:


When new allergies are detected:
1. Flash the Extraction Panel allergy section with a highlight animation.
2. If recommendations are already generated, **re-run the rules engine** by calling `POST /api/prescriptions/validate` with the updated allergy list.
3. Update the recommendation cards to reflect new safety check results.
4. Any newly blocked option animates from its current state to BLOCKED (red border slides in, badge appears with `scaleIn` animation).

### 11.4 Full Re-recommendation Trigger

If the clinician makes significant changes to notes after recommendations exist, show a banner:


This avoids silently invalidating the clinician's approved decisions but prompts re-evaluation.

---

## 12. "Talk to the Prescription" — Chat Interface

### 12.1 Page: `ChatPage.tsx`

**Route:** `/visit/:visitId/chat`

**Access:** Both clinician and patient roles (participant check in page).

### 12.2 Layout


### 12.3 Component Hierarchy


### 12.4 Suggested Questions

Display 3–4 clickable chip buttons below the message list. Clicking one auto-fills and sends:

| Suggestion | Purpose |
|---|---|
| "Why did you choose this alternative?" | Explain the rationale for the top recommendation |
| "What is the cheapest covered option?" | Coverage-aware cost question |
| "Are there any risks with current medications?" | Interaction check follow-up |
| "Explain this to the patient simply" | Patient-language output |

Suggestions disappear after the first user message and reappear if the conversation is idle for 30 seconds.

### 12.5 Message Handling

**Sending a message:**
1. Add user message to local `messages` array.
2. Show a typing indicator for the AI response.
3. Call `POST /api/chat` with `{ visitId, message, history }`.
4. Receive `ChatResponse` with `reply` text.
5. Add AI message to `messages` array.
6. Scroll to bottom.
7. Screen reader announcement: "Response received."

**History management:**
- Keep all messages in local component state.
- Send the last 10 messages as `history` in each request (backend uses these for context).
- Do not persist chat to database (ephemeral, demo-appropriate).

### 12.6 AI Response Styling

AI messages get a distinct visual treatment:
- Left border: `border-l-2 border-accent-purple`.
- `<Badge variant="ai">AI</Badge>` label.
- Drug names mentioned in the response are highlighted with `font-mono text-accent-cyan`.
- If the AI references a safety check result, inline the relevant badge (e.g., "MODERATE interaction" gets a `<Badge variant="safety-warn">MODERATE</Badge>`).

---

## 13. Visit Finalization

### 13.1 Finalize Button

The "Finalize Visit" button in the bottom action bar is enabled only when:
- At least one prescription is approved.
- No prescriptions are in "pending" (un-actioned) state — all must be approved or rejected.

### 13.2 Finalization Flow

1. Call `PUT /api/visits/{id}` with `{ status: "COMPLETED" }`.
2. For each approved prescription, the backend has already persisted it during approval (Part 2B, Section 4.6).
3. Emit `VISIT_COMPLETED` analytics event.
4. Navigate to `/visit/{visitId}` (the visit detail page).
5. Show success toast: "Visit finalized. {n} prescriptions approved."

---

## 14. Visit Detail Page — `VisitDetailPage.tsx`

### 14.1 Layout


### 14.2 Prescription Actions (role-dependent)

| Action | Clinician | Patient | Behavior |
|---|---|---|---|
| View Receipt | ✓ | ✓ | Navigate to receipt view or expand inline |
| Chat | ✓ | ✓ | Navigate to `/visit/{visitId}/chat` |
| Reminder | ✗ | ✓ | Open `<ReminderModal>` |
| Download PDF | ✓ | ✓ | Generate and download visit summary PDF |

### 14.3 PDF Generation

Generate server-side via `POST /api/visits/{id}/pdf` (or client-side with jsPDF as fallback). The PDF includes:
- Visit header (date, patient, clinician, reason).
- Visit notes.
- Prescription table: Medication, Dosage, Frequency, Coverage Status, Copay.
- Safety receipt summary for each approved prescription.
- Total estimated copay.

---

## 15. Backend Endpoints for This Part

All endpoints reference Part 1 (Section 6.3) and Part 2B (Sections 4–5). The following are called by the components in this part:

| Frontend Action | API Call | Backend Handler |
|---|---|---|
| Search patients | `GET /api/patients?search={q}` | `PatientController.search()` |
| Create visit | `POST /api/visits` | `VisitController.create()` |
| Update visit notes | `PUT /api/visits/{id}` | `VisitController.update()` |
| Extract from notes | `POST /api/visits/{id}/extract` | `VisitController.extract()` → `GeminiService.extractStructuredData()` |
| Process drawing OCR | `POST /api/ocr` | `OcrController.processOcr()` → `GeminiService.extractFromHandwriting()` |
| Generate recommendations | `POST /api/prescriptions/recommend` | `PrescriptionController.recommend()` → full pipeline (Part 2B §4.5) |
| Validate prescriptions | `POST /api/prescriptions/validate` | `PrescriptionController.validate()` → `RulesEngineService.evaluate()` |
| Approve prescription | `POST /api/prescriptions/approve` | `PrescriptionController.approve()` → receipt generated (Part 2B §4.6) |
| Reject prescription | `POST /api/prescriptions/reject` | `PrescriptionController.reject()` |
| Send chat message | `POST /api/chat` | `ChatController.chat()` → `GeminiService.chat()` |
| Finalize visit | `PUT /api/visits/{id}` with status COMPLETED | `VisitController.update()` |
| Get visit detail | `GET /api/visits/{id}` | `VisitController.getById()` |
| Get prescription receipt | `GET /api/prescriptions/{id}/receipt` | `PrescriptionController.getReceipt()` |

---

## 16. State Management Interactions

### 16.1 Store Flow During Visit Creation


### 16.2 Data Passed Between Panels

| From | To | Data | Mechanism |
|---|---|---|---|
| NotesCapture | ExtractionPanel | Raw notes text | `visitStore.visitNotes` |
| ExtractionPanel | RecommendationPanel | Allergies, current meds, symptoms | `visitStore.extractedData` |
| RecommendationPanel | ApprovalCheckbox | Safety checks, blocked status | `prescriptionStore.recommendations` |
| Drawing (Supabase RT) | NotesCapture | Base64 image | Supabase channel subscription |
| DrawingPage | AddVisitPage | Base64 image | Supabase `drawing_updates` INSERT |

---

## 17. Demo Script Integration Points

This part contains the following demo-critical moments (referenced from the master build spec's 3-minute demo script):

| Demo Step | Component | What the Judge Sees |
|---|---|---|
| 1. Select patient | PatientSearchBar | Type name, see allergy badges, select |
| 2. Scan handwritten note | QrCodeModal → DrawingPage | QR code on screen, drawing on tablet, auto-transcription |
| 3. Allergies extracted live | ExtractionPanel | Allergies appear with NEW badges as notes are typed |
| 4. Recommendations appear | ThreeLaneReview | Three cards with cost and safety badges stagger in |
| 5. Toggle to cheapest option | PrescriptionCard | Click cheapest card, see lower copay, same safety status |
| 6. Show blocked unsafe option | PrescriptionCard (blocked) | Red BLOCKED badge, allergy reason, disabled approve |
| 7. Doctor approves with one click | ApprovalCheckbox | Check box, click Approve, green confirmation |

Steps 5–6 of the demo script (patient pack + ElevenLabs voice) are covered in Part 5.

---

## 18. Part 4 Acceptance Criteria

| # | Criterion | Verification |
|---|---|---|
| 1 | Patient search returns results with debounce | Type "mar" → results appear after 300ms delay |
| 2 | Selected patient chip shows allergies | Select patient with allergies → red badges visible |
| 3 | Three-panel layout renders on desktop | ≥1280px viewport → three columns visible |
| 4 | Responsive fallback works on mobile | <768px → single column stack |
| 5 | Drawing QR code links to correct URL | Scan QR → opens `/draw/{channelId}` |
| 6 | Drawing received via Supabase realtime | Draw on tablet → preview appears in NotesCapture |
| 7 | Drawing auto-transcribed and appended | After drawing received → notes contain transcribed text |
| 8 | Extraction populates structured fields | Click Extract → allergies, symptoms, meds displayed |
| 9 | Quick allergy detection works client-side | Type "penicillin allergy" → detected within 1.5s |
| 10 | Generate produces 3 recommendation cards | Click Generate → 3 cards render with stagger animation |
| 11 | Each card shows CoverageBar | Tier, copay, coverage status visible on every card |
| 12 | Safety badge clickable → checklist expands | Click "Safety Passed" → 4 check results visible |
| 13 | Blocked card has red treatment | Blocked option → red border, BLOCKED badge, disabled approve |
| 14 | Approval requires checkbox | Approve button disabled until checkbox checked |
| 15 | Approval returns receipt | Approve → card turns green, receipt stored in store |
| 16 | Rejection prompts for reason | Click Reject → dialog with reason input |
| 17 | Finalize requires all prescriptions actioned | Button disabled if any prescription is still pending |
| 18 | Chat sends message and receives grounded reply | Type question → AI responds using visit context |
| 19 | Suggested questions auto-fill input | Click chip → question appears in input and sends |
| 20 | Visit detail shows approved prescriptions with receipt links | Navigate to detail → approved Rx visible with actions |
| 21 | Screen reader announces key state changes | Approve → "Metformin approved" announced via live region |
| 22 | All labels support Spanish translation | Toggle language → buttons, badges, headings in Spanish |

---

## Continues in Part 5

**Part 5 — Patient Experience: Patient Pack, Accessibility, ElevenLabs Voice** covers:
- Patient Understanding Mode: plain-language instructions, "what to avoid" list, side effect triage, daily schedule
- Coverage-Aware Safety Receipt display and sharing
- Cost shock prevention cards
- ElevenLabs voice pack integration: generate, play, multilingual
- Medication pronunciation audio
- PDF generation for the patient pack
- Patient-facing pages: prescriptions list, visit history, profile management
