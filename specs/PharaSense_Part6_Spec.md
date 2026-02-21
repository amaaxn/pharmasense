# PharmaSense V2 — Part 6: Analytics (Snowflake), Deployment (DigitalOcean), and Demo Script
### Depends on: Part 1 (Schema, Seed Data), Part 2B (AnalyticsService, Event Types), Part 3 (Design System, Stores), Part 4 (Clinician Workflow), Part 5 (Patient Pack, Voice)

This document specifies the analytics pipeline (PostgreSQL → Snowflake), the clinician analytics dashboard, the DigitalOcean production deployment, the seed data reset mechanism, the 3-minute demo script, and the final QA checklist for every hackathon track.

> **Track alignment:**
> - **Best Use of Snowflake API** (MLH): De-identified analytics dashboard powered by Snowflake queries — copay savings, safety blocks, time saved, adherence risk
> - **Best Use of DigitalOcean** (MLH): Full deployment on DigitalOcean Droplet + Spaces for audio/PDF storage
> - All tracks: The demo script is the final proof — it exercises every feature in a compelling 3-minute narrative

> **V1 problems addressed:**
> - No analytics at all — zero visibility into clinical impact
> - Deployed via Google Cloud Build → moving to DigitalOcean for hackathon track
> - No seed data reset — each demo required manual database cleanup
> - No demo script — ad-hoc presentation of features

---

## 1. Analytics Service — Local Event Layer

### 1.1 Event Types

Defined in Part 1 schema as `analytics_event_type` enum:

| Event Type | When Emitted | Source |
|---|---|---|
| `RECOMMENDATION_GENERATED` | After Step 5 of recommendation pipeline | `PrescriptionService.generateRecommendations()` |
| `OPTION_BLOCKED` | For each blocked recommendation | `PrescriptionService.generateRecommendations()` |
| `OPTION_APPROVED` | After clinician approves a prescription | `PrescriptionService.approvePrescription()` |
| `OPTION_REJECTED` | After clinician rejects a prescription | `PrescriptionService.rejectPrescription()` |
| `VOICE_PACK_GENERATED` | After ElevenLabs audio generation | `VoiceService.generateVoicePack()` |
| `PATIENT_PACK_VIEWED` | When patient opens their pack | `PrescriptionController.getReceipt()` |
| `VISIT_CREATED` | When a new visit is started | `VisitService.createVisit()` |
| `VISIT_COMPLETED` | When a visit is finalized | `VisitService.completeVisit()` |

### 1.2 AnalyticsService

**File:** `backend/pharmasense/services/analytics_service.py`

`emit(event_type, data)` — create `AnalyticsEvent` model, save via SQLAlchemy session, optionally trigger async Snowflake sync. Use `asyncio.create_task` or FastAPI `BackgroundTasks` for non-blocking Snowflake write.

### 1.3 AnalyticsEventRepository

SQLAlchemy repository or direct model queries: `find_by_event_type`, `find_by_created_at_after`, `count_by_event_type`.


### 1.4 Event Data Schemas

Each event type has a specific JSON shape stored in `event_data`:

**RECOMMENDATION_GENERATED:**


**OPTION_BLOCKED:**


**OPTION_APPROVED:**


**OPTION_REJECTED:**


**VOICE_PACK_GENERATED:**


**PATIENT_PACK_VIEWED:**


**VISIT_CREATED:**


**VISIT_COMPLETED:**


---

## 2. Snowflake Integration

### 2.1 Architecture


The dual-write pattern: every event is saved to local PostgreSQL (for reliability) and synced to Snowflake (for analytics queries). If the Snowflake write fails, the local PostgreSQL event is the source of truth. A background job can re-sync missed events.

### 2.2 Python Dependency

In `pyproject.toml` or `requirements.txt`: `snowflake-connector-python`


### 2.3 Environment Variables

Added to `.env.template` and loaded via pydantic-settings:


### 2.4 Snowflake Schema Setup

Run these SQL statements in the Snowflake console to initialize the warehouse, database, and tables:


### 2.5 Snowflake Connection Configuration

**File:** `backend/pharmasense/config/snowflake.py` or within `snowflake_service.py`

Use `snowflake.connector.connect()` with account, user, password, database, schema, warehouse, role. Create a connection pool or connect per-query. The Snowflake connection is **separate** from the primary asyncpg/SQLAlchemy PostgreSQL connection. Inject the Snowflake config into `SnowflakeService` via settings.


### 2.6 SnowflakeService

**File:** `backend/pharmasense/services/snowflake_service.py`


### 2.7 Snowflake DTOs

Pydantic models or dataclasses: `CopaySavingsSummary`, `CopayByStatus`, `SafetyBlockReason`, `VisitEfficiency`, `AdherenceRisk`, `AnalyticsDashboardResponse`.


### 2.8 Async Sync

Use `asyncio.create_task(sync_event_async(event))` or FastAPI `BackgroundTasks.add_task()` so the Snowflake write does not block the response. The sync function catches exceptions and logs; does not propagate.


### 2.9 Graceful Degradation

If the Snowflake connection fails (credentials missing, network down, etc.), the application must not crash. The `@Async` + try-catch in `syncEventAsync` ensures failures are logged but do not propagate. The analytics dashboard falls back to local PostgreSQL queries.

**Fallback strategy in SnowflakeService:**


The `build_dashboard_from_local_events()` method queries the local `analytics_events` table using SQLAlchemy and computes the same aggregations in Python.

---

## 3. Analytics Router

### 3.1 Endpoints

**File:** `backend/pharmasense/routers/analytics.py`


---

## 4. Analytics Dashboard — Frontend

### 4.1 Route

| Path | Component | Auth |
|---|---|---|
| `/analytics` | `AnalyticsDashboardPage` | Clinician only |

### 4.2 Page Layout


### 4.3 Component Tree


### 4.4 MetricCard Component

**File:** `frontend/src/components/analytics/MetricCard.tsx`


**Styling:**
- `bg-elevated border border-border-primary rounded-2xl p-6`
- Value: `text-4xl font-bold text-text-primary`
- Label: `text-sm text-text-tertiary uppercase tracking-wider`
- Subtitle: `text-sm` with trend color
- Framer Motion `fadeInUp` on mount

### 4.5 Charts: Simple CSS Bar Charts

No charting library needed — use pure CSS/Tailwind for horizontal bar charts. This avoids bloated dependencies and is more accessible.

**CopaySavingsChart:**


Each bar:


**Color mapping:**
| Coverage Status | Color |
|---|---|
| COVERED | `accent-green` |
| PRIOR_AUTH_REQUIRED | `accent-amber` |
| NOT_COVERED | `accent-red` |
| UNKNOWN | `text-tertiary` |

| Block Type | Color |
|---|---|
| ALLERGY | `accent-red` |
| INTERACTION | `accent-amber` |
| DOSE_RANGE | `accent-purple` |
| DUPLICATE_THERAPY | `accent-blue` |

### 4.6 AdherenceRiskTable

| Column | Content | Style |
|---|---|---|
| Risk | Color dot (🔴🟡🟢) + level text | Bold, colored |
| Medication | Drug name | Normal |
| Copay | Dollar amount | Right-aligned |
| Tier | 1–4 | Badge |
| Coverage | Status text | Coverage badge from Part 4 |

Risk thresholds (matching Snowflake view):
- `> $50` → HIGH_RISK (red)
- `> $25` → MODERATE_RISK (amber)
- `<= $25` → LOW_RISK (green)

### 4.7 Data Fetching


### 4.8 Sync Button

The "Sync Now" button calls `POST /api/analytics/sync` and displays the result:


### 4.9 Demo Narrative

During the demo, the judge sees:

1. The clinician opens the Analytics page.
2. Four metric cards show aggregate impact: visits, savings, blocks, time.
3. Bar charts visualize coverage distribution and block reasons.
4. Adherence risk table shows which patients are at risk of non-adherence due to high copays.
5. The "Powered by Snowflake" badge and data source indicator are visible.
6. The clinician clicks "Sync Now" → count updates.

The narrative: "PharmaSense doesn't just prescribe — it **proves** that care is cheaper, safer, and faster."

---

## 5. DigitalOcean Deployment

### 5.1 Target Infrastructure

| Component | DigitalOcean Service | Spec |
|---|---|---|
| Application server | Droplet | Ubuntu 22.04, 2 vCPU / 4GB RAM ($24/mo) |
| Object storage | Spaces | Voice packs (MP3), patient pack PDFs |
| DNS | DigitalOcean Domains | `pharmasense.example.com` (or custom) |
| SSL/TLS | Let's Encrypt via Caddy | Automatic HTTPS |

Supabase remains the database host (PostgreSQL + Auth). Snowflake is external.

### 5.2 Docker Compose — Production

**File:** `docker-compose.prod.yml`. Backend service uses Python 3.11 image, runs `uvicorn pharmasense.main:app --host 0.0.0.0 --port 8080`.


### 5.3 Dockerfile — V2

Multi-stage: (1) Node for frontend build, (2) Python for backend, (3) Final image with `eclipse-temurin` replaced by `python:3.11-slim`; run with `uvicorn`.


### 5.4 Caddyfile (SSL/TLS)

**File:** `Caddyfile`


Caddy automatically provisions and renews Let's Encrypt certificates. No manual SSL configuration needed.

### 5.5 Application Settings — Production

**File:** `backend/pharmasense/config/settings.py` — use `pydantic-settings` with `env_file=".env"` and production overrides. Set `ENVIRONMENT=production`.


### 5.6 Droplet Provisioning Script

**File:** `deploy/setup-droplet.sh`

This script runs once on a fresh DigitalOcean Droplet:


### 5.7 Deployment Commands


### 5.8 DigitalOcean Spaces Configuration

Create a Space in the DigitalOcean console:
- **Name:** `pharmasense-assets`
- **Region:** `nyc3` (or closest to your Droplet)
- **CDN:** Enable for faster audio/PDF delivery

Generate Spaces access keys and set in `.env`:


**Bucket structure:**


### 5.9 Complete `.env.template` for V2


---

## 6. Seed Data and Demo Reset

### 6.1 Seed Data Files

All in `backend/src/main/resources/seed/`:

| File | Contents | Row Count |
|---|---|---|
| `seed-formulary.sql` | Formulary entries across 4 tiers | 30+ medications |
| `seed-interactions.sql` | Drug interaction pairs | 15+ pairs |
| `seed-dose-ranges.sql` | Dose range limits | 15+ medications |
| `seed-demo-patients.sql` | 3 demo patients with varied profiles | 3 patients |
| `seed-demo-clinician.sql` | 1 demo clinician | 1 clinician |
| `seed-demo-visits.sql` | Pre-existing visits with prescriptions for history | 2-3 visits |
| `seed-analytics-events.sql` | Pre-seeded analytics events for dashboard demo | 20+ events |

### 6.2 Demo Patients Detail

**Patient 1: Maria Lopez** (Allergy + interaction demo)

**Demo value:** Penicillin allergy triggers BLOCKED on Amoxicillin (drug class cross-reactivity). Current Lisinopril + proposed NSAID triggers interaction warning.

**Patient 2: James Chen** (Multi-drug, interaction-heavy)

**Demo value:** Warfarin + Aspirin triggers SEVERE interaction block. Multiple current medications test duplicate therapy checks.

**Patient 3: Sofia Rivera** (Clean path, Spanish language)

**Demo value:** No allergies, no current meds → clean approval path. Spanish language → demonstrates i18n and Spanish voice pack.

### 6.3 Demo Clinician


### 6.4 Pre-Seeded Analytics Events

Seed 20+ events so the analytics dashboard is populated before the demo starts. This avoids showing an empty dashboard:


**Expected dashboard results from seed data:**
- Total visits: 4
- Total copay saved: $177 (sum of non-null copayDelta)
- Safety blocks: 3 (2 allergy, 1 interaction)
- Avg time per visit: 7 min
- Adherence risk: Jardiance at HIGH_RISK ($65 copay)

### 6.5 Seed Data Reset Endpoint

**Backend:**


**Frontend: Reset Button**

On the clinician dashboard, add a small "Reset Demo Data" button (only visible in non-production or via a hidden toggle):


The button appears at the bottom of the clinician dashboard, styled as `variant="ghost"` with a small font — visible enough for the demo, not prominent in normal use.

---

## 7. Three-Minute Demo Script

### 7.1 Overview

| Time | Step | What the Judge Sees | Track Hit |
|---|---|---|---|
| 0:00–0:20 | Intro + architecture | Slide: architecture diagram, tech stack logos | All |
| 0:20–0:50 | Patient selection + note scan | Select Maria Lopez, scan handwritten note, allergies extracted live | AI/ML Immersion, Gemini |
| 0:50–1:20 | Recommendations + safety | Three-lane review: Amoxicillin BLOCKED (allergy), Metformin recommended with coverage badge | Health, UI/UX, AI/ML |
| 1:20–1:40 | Cost comparison | Toggle to cheapest option, show savings card "$55/month saved" | Health, UI/UX |
| 1:40–2:00 | Approval | One-click approve with safety confirmation checkbox | UI/UX, Health |
| 2:00–2:30 | Patient pack + voice | Patient pack appears, play ElevenLabs voice instructions, toggle to Spanish | Health, ElevenLabs |
| 2:30–2:50 | Analytics dashboard | Open Snowflake dashboard: copay saved, safety blocks, time saved | Snowflake |
| 2:50–3:00 | Closing | "PharmaSense proves care is cheaper, safer, faster." Show live URL on DigitalOcean | DigitalOcean |

### 7.2 Detailed Script

**[0:00 – 0:20] INTRO**

> "PharmaSense is a real-time prescription decision engine that enforces safety and coverage constraints, then explains the tradeoffs to both clinicians and patients."

Show: Architecture diagram on screen or quick slide. Point out:
- FastAPI + React
- Gemini for multimodal AI
- Rules engine for deterministic safety
- Snowflake for analytics
- ElevenLabs for voice
- Hosted on DigitalOcean

**[0:20 – 0:50] PATIENT SELECTION + NOTE SCAN**

1. Log in as `dr.smith` (clinician).
2. Click "New Visit" on the clinician dashboard.
3. Search for "Maria Lopez" → select her. Patient chip shows allergies: Penicillin, Sulfa drugs.
4. In the Notes panel, either:
   - Type: "Patient presents with sore throat, likely strep. History of penicillin allergy. Currently on Metformin 500mg BID and Lisinopril 20mg daily."
   - OR: Click "Draw Notes on Tablet" → show QR code → scan with phone → draw on the tablet canvas → image syncs back via Supabase Realtime.
5. As the clinician types/draws, the Extraction Panel populates in real-time:
   - Allergies: `Penicillin` (highlighted red — new allergy detected!)
   - Current Medications: `Metformin 500mg`, `Lisinopril 20mg`
   - Symptoms: `Sore throat, likely strep`

**Key demo moment:** The clinician types "penicillin allergy" → the extraction panel immediately highlights it → this drives the recommendation engine.

**[0:50 – 1:20] RECOMMENDATIONS + SAFETY**

6. Click "Generate Recommendations" → loading shimmer.
7. Three cards appear in the Three-Lane Review:

| Lane | Option A: Best Covered | Option B: Cheapest | Option C: Clinical Backup |
|---|---|---|---|
| Medication | Azithromycin 250mg | Ciprofloxacin 500mg | Amoxicillin 500mg |
| Coverage | ● Covered · Tier 1 · $10 | ● Covered · Tier 2 · $15 | ● Covered · Tier 1 · $5 |
| Safety | ✓ Safe | ✓ Safe | 🚫 BLOCKED |
| Block reason | — | — | ALLERGY: Penicillin class |
| Status | RECOMMENDED | RECOMMENDED | BLOCKED |

8. Point out: "Amoxicillin is Tier 1 and cheapest, but the system **blocked** it because Maria is allergic to Penicillin. Amoxicillin is in the penicillin drug class. The rules engine caught this automatically."

9. Click the "Safety Passed ✓" badge on Azithromycin → expand checklist:
   - ✓ Allergy: No conflict (not in penicillin class)
   - ✓ Interaction: No known interactions with Metformin or Lisinopril
   - ✓ Dose range: 250mg within 250–500mg range
   - ✓ Duplicate: No duplicate therapy

**[1:20 – 1:40] COST COMPARISON**

10. Point out the Savings Card on Option A:
    > "This alternative saves about $55/month compared to the brand-name option, and it's fully covered with no prior authorization."
11. Show the coverage badge: `● Covered · Tier 1 · Copay $10`
12. Mention: "Every prescription shows its cost impact up front. No surprises at the pharmacy."

**[1:40 – 2:00] APPROVAL**

13. Click "Approve" on Azithromycin.
14. The approval checkbox appears: "I have reviewed all allergy and interaction flags for this prescription."
15. Check the box → click "Confirm Approval".
16. Card state changes to ✓ APPROVED with green border.
17. Add optional clinician comment: "First-line for strep with penicillin allergy."

**[2:00 – 2:30] PATIENT PACK + VOICE**

18. Click "View Patient Pack" → the Patient Pack expands:
    - Plain-language summary (6th grade reading level)
    - "How to take": step-by-step instructions
    - "Today's schedule": ☀️ Morning, 🌙 Evening
    - "What to avoid": list with red indicators
    - "Side effects": Normal vs Seek Help two-column triage
    - Safety checks: all passed ✓

19. Click 🔊 "Listen to Instructions" → ElevenLabs voice plays:
    > "Here are the instructions for your medication, Azithromycin. Take one 250mg tablet once daily for 5 days. Take with or without food. You should avoid the following: antacids within 2 hours of taking this medication..."

20. Toggle language to Spanish in the Accessibility Toolbar → patient pack text switches to Spanish. Click "Regenerate in Spanish" → voice plays in Spanish.

21. (Optional) Click the 🔊 icon next to "Azithromycin" → hear the pronunciation.

**[2:30 – 2:50] ANALYTICS DASHBOARD**

22. Navigate to "Analytics" in the navbar.
23. The dashboard loads with Snowflake data:
    - **Total Visits: 5** (4 seeded + 1 live)
    - **Copay Saved: $232** (seeded + today's $55 delta)
    - **Safety Blocks: 4** (3 seeded + 1 live Amoxicillin block)
    - **Avg Time/Visit: 7.2 min**
24. Bar charts show: most blocks are allergy-related, most savings from Tier 1 covered drugs.
25. Adherence risk table: "Jardiance at $65/month is HIGH_RISK for non-adherence."
26. Point: "PharmaSense doesn't just prescribe — it **proves** that care is cheaper, safer, and faster. All powered by Snowflake analytics."

**[2:50 – 3:00] CLOSING**

27. Show the live URL: `https://pharmasense.example.com` (hosted on DigitalOcean).
28. Closing statement:
    > "Every prescription is a decision. PharmaSense makes that decision verifiable, transparent, and accessible to everyone — clinician and patient alike. Thank you."

### 7.3 Fallback Plans

| Risk | Mitigation |
|---|---|
| Gemini API slow/down | Pre-cache one recommendation set in localStorage; show cached result with "Demo mode" badge |
| ElevenLabs quota hit | Pre-generate one MP3 and store in Spaces; VoicePlayer falls back to this URL |
| Snowflake connection fails | SnowflakeService falls back to local PostgreSQL queries (Section 2.9) |
| Network issues | Run entirely on local Docker Compose during presentation |
| Drawing sync fails | Fall back to typed notes (the demo works identically with typed input) |

---

## 8. Final QA Checklist — Every Track

### 8.1 Main Track: Best Health and Accessibility Hack

| # | Feature | Status | Verification |
|---|---|---|---|
| 1 | Patient understanding mode (6th grade reading level) | | Flesch-Kincaid score on generated instructions |
| 2 | "What to avoid" list present on patient pack | | Visual inspection |
| 3 | Side effect triage: normal vs seek help | | Two columns visible |
| 4 | "How to take it today" one-screen schedule | | Schedule section visible |
| 5 | Dyslexia-friendly font toggle | | Click toggle → font changes to OpenDyslexic |
| 6 | High-contrast mode toggle | | Click toggle → colors invert to high-contrast palette |
| 7 | Large type mode toggle | | Click toggle → font-scale increases by 25% |
| 8 | Screen reader compatibility | | VoiceOver reads all interactive elements correctly |
| 9 | Keyboard navigation | | Tab through entire workflow without mouse |
| 10 | Skip link | | Press Tab on page load → "Skip to main content" visible |
| 11 | Focus visibility | | All focused elements have visible focus ring |
| 12 | Spanish language toggle | | Switch to ES → all UI text in Spanish |
| 13 | Cost shock prevention: savings card | | Savings card visible when cheaper option exists |
| 14 | Coverage-aware safety receipt | | Receipt shows coverage, safety, alternatives, instructions |
| 15 | Medication name pronunciation | | Click speaker icon → hear medication name |

### 8.2 Side Track: Best AI/ML Immersion Hack

| # | Feature | Status | Verification |
|---|---|---|---|
| 1 | Live clinician cockpit (3-panel layout) | | Notes, Extraction, Recommendations visible simultaneously |
| 2 | Real-time extraction from notes | | Type → extraction panel updates within 2 seconds |
| 3 | Allergy detection triggers recommendation change | | Add "penicillin allergy" → blocked option appears |
| 4 | "Talk to the prescription" chat | | Ask "Why this alternative?" → contextual response |
| 5 | Drawing sync via QR code | | Draw on tablet → image appears on clinician screen |
| 6 | Structured JSON output from Gemini | | Recommendation response has correct schema |
| 7 | Gemini retry on malformed output | | (Tested via logs — retry visible in backend output) |

### 8.3 Side Track: Best UI/UX Hack

| # | Feature | Status | Verification |
|---|---|---|---|
| 1 | Three-lane review layout | | 3 cards visible with distinct roles |
| 2 | One-click approve with confirmation | | Checkbox required before approval |
| 3 | "Why this is safe" badge + expandable checklist | | Click badge → 4 safety checks visible |
| 4 | BLOCKED card clearly distinguished | | Red border, disabled approve button, block reason |
| 5 | Smooth animations (Framer Motion) | | Cards fade in, badges animate, no jank |
| 6 | Responsive layout (mobile + desktop) | | Resize browser → layout adapts |
| 7 | Loading states (shimmers/spinners) | | All async operations show loading indicators |
| 8 | Error states with actionable messages | | Disconnect network → error banner with retry button |

### 8.4 MLH: Best Use of Gemini API

| # | Feature | Status | Verification |
|---|---|---|---|
| 1 | Handwritten note OCR (multimodal) | | Upload handwriting image → structured text extracted |
| 2 | Insurance card parsing (multimodal) | | Upload card photo → fields populated |
| 3 | Formulary PDF extraction (multimodal) | | Upload PDF → entries added to database |
| 4 | Structured recommendation generation | | `responseMimeType: "application/json"` in all prompts |
| 5 | Post-prescription chat | | Contextual conversation with prescription grounding |
| 6 | Patient instructions generation | | Plain-language instructions after approval |
| 7 | Retry with validation | | Malformed JSON → automatic retry with correction prompt |
| 8 | Output rejection on constraint violation | | (Tested via backend logs) |

### 8.5 MLH: Best Use of ElevenLabs

| # | Feature | Status | Verification |
|---|---|---|---|
| 1 | Patient voice pack after approval | | Click Listen → voice plays instructions |
| 2 | Multilingual voice (English + Spanish) | | Generate in EN → switch to ES → regenerate |
| 3 | Voice stored in DigitalOcean Spaces | | Check Spaces bucket → MP3 exists |
| 4 | Medication pronunciation button | | Click speaker icon → hear drug name |
| 5 | Playback speed control | | Change to 1.5x → audio speeds up |
| 6 | Audio accessible (screen reader announcements) | | VoiceOver announces play/pause state |

### 8.6 MLH: Best Use of DigitalOcean

| # | Feature | Status | Verification |
|---|---|---|---|
| 1 | App hosted on DigitalOcean Droplet | | `curl https://pharmasense.example.com/api/health` → 200 |
| 2 | Docker Compose deployment | | `docker-compose ps` shows healthy |
| 3 | SSL/TLS via Caddy + Let's Encrypt | | Browser shows padlock icon |
| 4 | Audio files stored in Spaces | | MP3 URL resolves to Spaces CDN |
| 5 | PDF files stored in Spaces | | PDF URL resolves to Spaces CDN |
| 6 | Clean public URL | | Domain resolves, no port number in URL |
| 7 | README with setup instructions | | `README.md` in repo root with quick-start |

### 8.7 MLH: Best Use of Snowflake API

| # | Feature | Status | Verification |
|---|---|---|---|
| 1 | Events synced to Snowflake | | Query Snowflake `SELECT COUNT(*) FROM EVENTS` → rows exist |
| 2 | Copay savings dashboard from Snowflake | | `/api/analytics/copay-savings` returns Snowflake data |
| 3 | Safety block reasons from Snowflake | | `/api/analytics/safety-blocks` returns breakdown |
| 4 | Visit efficiency / time saved from Snowflake | | `/api/analytics/time-saved` returns avg duration |
| 5 | Adherence risk signals from Snowflake | | `/api/analytics/adherence-risk` returns risk levels |
| 6 | De-identified data (no patient names in Snowflake) | | Event data uses UUIDs, no PII |
| 7 | "Powered by Snowflake" visible in dashboard | | Badge/logo visible |
| 8 | Sync button works | | Click Sync → count updates |

---

## 9. Part 6 Acceptance Criteria

| # | Criterion | Verification |
|---|---|---|
| 1 | `AnalyticsService.emit()` persists events to PostgreSQL | Insert row visible in `analytics_events` |
| 2 | `SnowflakeService.sync_event_async()` writes to Snowflake | `SELECT` from Snowflake `EVENTS` table returns the row |
| 3 | Snowflake sync failure does not crash the app | Kill Snowflake connection → app continues normally |
| 4 | `/api/analytics/summary` returns all 4 dashboard sections | Response contains copaySavings, safetyBlocks, visitEfficiency, adherenceRisks |
| 5 | Analytics dashboard renders 4 metric cards | All 4 cards visible with values |
| 6 | Bar charts render with correct colors | Coverage=green, Prior Auth=amber, Blocked allergy=red |
| 7 | Adherence risk table highlights HIGH_RISK | Jardiance row has red indicator |
| 8 | Docker build succeeds with 3-stage Dockerfile | `docker build .` completes without errors |
| 9 | `docker-compose.prod.yml` starts app + Caddy | Both containers healthy |
| 10 | Caddy provisions SSL certificate | HTTPS works on configured domain |
| 11 | Health check endpoint responds | `GET /api/health` → 200 |
| 12 | Spaces upload works for audio and PDF | Files accessible via Spaces URL |
| 13 | Seed data populates all required tables | Formulary (30+), interactions (15+), dose ranges (15+), patients (3), clinician (1) |
| 14 | Pre-seeded analytics events populate dashboard | Dashboard shows non-zero values on first load |
| 15 | Demo reset endpoint clears and re-seeds data | `POST /api/admin/reset-demo` → dashboard resets to seed values |
| 16 | Demo script completes in under 3 minutes | Timed rehearsal |
| 17 | All 7 QA checklists pass | Every checkbox verified |

---

## End of Specification

This concludes the PharmaSense V2 Implementation Specification across all 6 parts:

| Part | Title | File |
|---|---|---|
| 1 | Foundation: Architecture, Schema, Auth, API | `PHARMASENSE_V2_IMPLEMENTATION_SPEC.md` |
| 2A | AI Layer: GeminiService, OCR, Prompts | `PHARMASENSE_V2_SPEC_PART_2A.md` |
| 2B | Safety Layer: Rules Engine, Orchestration | `PHARMASENSE_V2_SPEC_PART_2B.md` |
| 3 | Frontend Foundation: Design System, Accessibility, Stores | `PHARMASENSE_V2_SPEC_PART_3.md` |
| 4 | Clinician Workflow: Live Cockpit, Recommendations | `PHARMASENSE_V2_SPEC_PART_4.md` |
| 5 | Patient Experience: Patient Pack, Voice, PDF | `PHARMASENSE_V2_SPEC_PART_5.md` |
| 6 | Analytics, Deployment, Demo Script | `PHARMASENSE_V2_SPEC_PART_6.md` |
