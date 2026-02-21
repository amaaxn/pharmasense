# PharmaSense V2 — Build-from-Scratch Implementation Specification
### Full-Stack Health-Tech Application — HopperHacks 2026
### **Pythonic Stack:** FastAPI, SQLAlchemy, Pydantic, Alembic

PharmaSense V2 is a **coverage-aware prescription decision engine** for clinicians and patients. It enforces safety and coverage constraints, explains tradeoffs, and produces verifiable prescription receipts — differentiating it from "another health AI app." This specification is standalone; it does not depend on any prior codebase existing.

> **Specification scope:** This document is split into six parts. **Part 1** (below) is written in full detail. Parts 2–6 are outlined at the end and will follow in subsequent documents.

**Track targets:**

| Priority | Track | Core Deliverable |
|---|---|---|
| Main | Best Health and Accessibility Hack | Patient Understanding Mode, accessibility toggles, cost shock prevention |
| Side | Best AI/ML Immersion Hack | Live clinician cockpit, "talk to the prescription" interaction |
| Side | Best UI/UX Hack | Three-lane review layout, Safety Passed badges, one-click approve |
| MLH | Best Use of Gemini API | Multimodal: handwritten OCR, formulary PDF extraction, structured JSON Rx, post-Rx chat |
| MLH | Best Use of ElevenLabs | Patient voice pack: how to take it, what to avoid, when to seek help — multilingual |
| MLH | Best Use of DigitalOcean | Docker Compose deployment on Droplet, Spaces for PDFs/audio, public demo URL |
| MLH | Best Use of Snowflake API | De-identified analytics dashboard: copay savings, safety blocks, time saved |

---

## Part 1 — Architecture, Project Setup, Database Schema, and Authentication

This part establishes the foundation every other part depends on: technology choices, repository structure, database design, authentication, API conventions, and the core data contracts.

---

## 1. Technology Stack

### 1.1 Stack Decisions and Rationale

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| **Backend framework** | FastAPI | 0.115+ | Async-first, automatic OpenAPI docs, Pydantic validation, minimal boilerplate |
| **Backend language** | Python | 3.11+ | Type hints, dataclasses, async/await, rich ecosystem for AI/ML |
| **Build tool** | pip / Poetry | latest | Standard Python packaging; `pyproject.toml` for reproducible builds |
| **Frontend framework** | React | 19.x | Component model, hooks, concurrent features, massive ecosystem |
| **Frontend language** | TypeScript | 5.7.x | Type safety across frontend; shared type contracts with backend DTOs |
| **Frontend build** | Vite | 6.x | Fast HMR, optimized production builds, native TypeScript support |
| **Styling** | Tailwind CSS | 4.x | Utility-first, rapid prototyping, excellent accessibility class support |
| **Animation** | Framer Motion | 12.x | Declarative animations, layout transitions, gesture support |
| **State management** | Zustand | 5.x | Lightweight, no boilerplate, supports middleware (persist, devtools) |
| **Database** | PostgreSQL | 15+ (via Supabase) | JSONB support, RLS policies, real-time subscriptions, built-in auth |
| **Auth provider** | Supabase Auth | latest | Email/password + OAuth, JWT tokens, row-level security integration |
| **ORM / DB access** | SQLAlchemy 2.x + async | 2.0+ | Declarative models, async sessions, Alembic migrations |
| **AI / LLM** | Google Gemini API | gemini-1.5-flash | Multimodal (text + image), structured JSON output, function calling |
| **OCR** | Google Gemini Vision | gemini-1.5-flash | Replaces separate Cloud Vision dependency; single API for OCR + reasoning |
| **Text-to-speech** | ElevenLabs API | v1 | High-quality multilingual voice synthesis, streaming support |
| **Analytics** | Snowflake API | latest | SQL-based analytics, REST API for real-time dashboard queries |
| **Object storage** | DigitalOcean Spaces | S3-compatible | Store generated PDFs, audio files, uploaded images |
| **Deployment** | DigitalOcean Droplet + Docker Compose | Ubuntu 22.04 | Simple, reliable, single-command deploy with public URL |
| **PDF generation** | ReportLab | 4.x | Pure-Python PDF generation for prescription receipts |
| **Real-time** | Supabase Realtime | via supabase-js | Drawing sync, live cockpit updates |

### 1.2 Key Architectural Shifts from V1 Analysis

| Area | V1 Problem | V2 Solution |
|---|---|---|
| Gemini calls in frontend | API key exposed in client bundle via `VITE_GEMINI_API_KEY` | All Gemini calls proxied through backend; key stays server-side |
| Placeholder backend services | `LlmServiceImpl` and `PatientServiceImpl` returned mock data | Every service fully implemented with real logic |
| ORM disabled | Models defined but database not wired | SQLAlchemy fully configured; repository layer for all entities |
| No global error handling | Controllers each handled errors differently | FastAPI exception handlers with standard error response envelope |
| No rules engine | Safety checks limited to exact allergy name match | Deterministic rules layer: allergies, interactions, dose range, formulary |
| Context-only state | `AuthContext` for everything; no separation of concerns | Zustand stores: `authStore`, `visitStore`, `prescriptionStore`, `uiStore` |
| Minimal accessibility | Basic `alt` attributes only | WCAG 2.1 AA compliance: ARIA, focus management, skip links, dyslexia font, high-contrast mode |
| No analytics | No event tracking | Snowflake-backed analytics pipeline with anonymized events |
| GCP-only deployment | Cloud Build + Cloud Run | DigitalOcean Droplet + Docker Compose for MLH track |

---

## 2. Repository Structure

Initialize from an empty repository. The monorepo uses a top-level split between `backend/` and `frontend/` with shared configuration at root.

**Python backend structure:** `backend/pharmasense/` (or `backend/app/`) with modules: `main.py`, `config/`, `models/`, `schemas/`, `routers/`, `services/`, `repositories/`, `dependencies/` (auth, DB session). Use `uvicorn` for ASGI server.


---

## 3. Project Initialization

### 3.1 Backend Setup

**Step 1:** Create Python project with `pyproject.toml` or `requirements.txt`. Core dependencies: `fastapi`, `uvicorn[standard]`, `sqlalchemy[asyncio]`, `alembic`, `asyncpg`, `pydantic`, `pydantic-settings`, `python-jose`, `httpx`, `python-dotenv`.

**Step 2:** Add these additional dependencies: `google-generativeai` (or `httpx` for REST), `reportlab`, `boto3` (for S3-compatible Spaces), `snowflake-connector-python`, `python-multipart`.

**Step 3:** Configure via `.env` and `pydantic-settings` (e.g., `config/settings.py`): database URL, API keys, Snowflake, Spaces. Use `BaseSettings` for type-safe env loading.


### 3.2 Frontend Setup

**Step 1:** Initialize with Vite:


**Step 2:** Install dependencies:


**Step 3:** Configure `vite.config.ts` to proxy `/api` to the FastAPI backend (default port 8000, or 8080 if configured).

> **Design decision:** In development, Vite proxies `/api` to FastAPI on port 8000. In production, FastAPI serves the built frontend from `static/` via `StaticFiles`. This eliminates CORS issues in production.

### 3.3 Environment Variables

Create `.env.template` at repository root:


> **Critical security note:** `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, and all Snowflake/Spaces credentials are **server-side only**. They must never appear in any `VITE_` prefixed variable. The frontend communicates exclusively through the FastAPI backend.

---

## 4. Database Schema

### 4.1 Overview

The database lives in Supabase-hosted PostgreSQL. Alembic manages schema migrations. Row-Level Security (RLS) policies enforce access control at the database level as a defense-in-depth measure alongside backend auth.

### 4.2 Entity-Relationship Summary


### 4.3 Full Migration: Alembic `V1__init_schema`

This is the complete Alembic migration that creates the schema from scratch. Equivalent to a `V1__init_schema.sql` script; Alembic generates Python migration files in `alembic/versions/`.


### 4.4 Seed Data for Demo

The `seed/` directory contains SQL files that populate the demo dataset. These are essential for the hackathon demo and must be loaded before presentation.

**`seed-formulary.sql`** must contain at least 30 medications across tiers:

| Tier | Copay Range | Example Medications | Notes |
|---|---|---|---|
| 1 (Preferred Generic) | $0 – $10 | Metformin, Lisinopril, Amoxicillin, Ibuprofen, Omeprazole | Most common, always covered |
| 2 (Non-preferred Generic) | $15 – $30 | Atorvastatin, Losartan, Amlodipine, Sertraline | Covered, slightly higher copay |
| 3 (Preferred Brand) | $40 – $75 | Eliquis, Jardiance, Ozempic, Humira | Covered, may need prior auth |
| 4 (Non-preferred Brand) | $100 – $200 | Certain specialty drugs | Prior auth required |
| Not Covered | N/A | Experimental, cosmetic drugs | Shows "NOT COVERED" status |

**`seed-interactions.sql`** must contain at least 15 known drug interaction pairs:

| Drug A | Drug B | Severity | Description |
|---|---|---|---|
| Warfarin | Aspirin | SEVERE | Increased bleeding risk |
| Lisinopril | Potassium supplements | MODERATE | Risk of hyperkalemia |
| Metformin | Contrast dye | SEVERE | Risk of lactic acidosis |
| SSRIs | MAOIs | SEVERE | Serotonin syndrome risk |
| Amoxicillin | Methotrexate | MODERATE | Increased methotrexate toxicity |
| Simvastatin | Erythromycin | SEVERE | Rhabdomyolysis risk |
| Ciprofloxacin | Theophylline | MODERATE | Theophylline toxicity |
| Warfarin | Amiodarone | SEVERE | Increased INR / bleeding risk |
| ACE inhibitors | NSAIDs | MODERATE | Reduced antihypertensive effect |
| Digoxin | Amiodarone | SEVERE | Digoxin toxicity |
| Penicillin | Methotrexate | MODERATE | Reduced methotrexate clearance |
| Fluoxetine | Tramadol | SEVERE | Serotonin syndrome and seizure risk |
| Lithium | NSAIDs | MODERATE | Increased lithium levels |
| Clopidogrel | Omeprazole | MODERATE | Reduced antiplatelet effect |
| Metronidazole | Alcohol | SEVERE | Disulfiram-like reaction |

**`seed-demo-patients.sql`** must include 3 demo patients with varied profiles:
- Patient with multiple allergies (penicillin, sulfa drugs) and current medications
- Patient with diabetes + heart condition on multiple drugs (interaction demo)
- Patient with no allergies and basic insurance (clean path demo)

---

## 5. Authentication and Authorization

### 5.1 Architecture

Authentication uses **Supabase Auth** for identity management. The frontend obtains a JWT from Supabase on login. Every API call to the FastAPI backend includes this JWT in the `Authorization` header. The backend verifies the JWT using Supabase's JWT secret (via `python-jose` or `PyJWT`).


### 5.2 Backend JWT Verification: FastAPI Dependency

**File:** `backend/pharmasense/dependencies/auth.py`

**Behavior specification:**

1. Create a FastAPI dependency (e.g., `get_current_user`) that runs on protected routes.
2. Skip `/api/health` and any public endpoints (exclude from dependency).
3. Extract the `Bearer` token from the `Authorization` header.
4. Decode and verify the JWT using `SUPABASE_JWT_SECRET` (HS256 algorithm) via `python-jose` or `PyJWT`.
5. Extract `sub` (user ID) and `role` claims from the token payload.
6. Return an `AuthenticatedUser` dataclass or Pydantic model; inject into route handlers.
7. If verification fails, raise `HTTPException(status_code=401)` with a standard error envelope.

**`AuthenticatedUser` (dataclass or Pydantic model) fields:** `user_id: UUID`, `email: str`, `role: str`


### 5.3 Frontend Auth Flow

**Zustand `authStore` specification:**


**Auth initialization sequence:**

1. On app mount, call `supabase.auth.getSession()`.
2. If a session exists, call the backend `GET /api/auth/profile` to resolve role and profile data.
3. Subscribe to `supabase.auth.onAuthStateChange()` to handle token refresh and sign-out events.
4. Store the JWT access token; attach it to every Axios request via an interceptor.

**Axios interceptor:**


### 5.4 Route Protection

Define route groups by role:

| Route Pattern | Allowed Roles | Redirect If Unauthorized |
|---|---|---|
| `/` | Public | — |
| `/login` | Public (redirect if logged in) | Redirect to dashboard |
| `/patient/*` | `patient` | `/login` |
| `/clinician/*` | `clinician` | `/login` |
| `/visit/:id` | `patient` or `clinician` (participant only) | `/login` |
| `/visit/:id/chat` | `patient` or `clinician` (participant only) | `/login` |
| `/analytics` | `clinician` | `/login` |

Implement a `<ProtectedRoute>` wrapper component that checks the auth store and redirects appropriately.

---

## 6. API Conventions and Error Handling

### 6.1 Standard Response Envelope

Every API response uses this structure:


On error:


**`ApiResponse`** (Pydantic model in `schemas/common.py`):


### 6.2 Global Exception Handlers

FastAPI exception handlers (registered via `app.add_exception_handler`) catch all exceptions and map them to the standard envelope:

| Exception | HTTP Status | Error Code |
|---|---|---|
| `ResourceNotFoundError` (custom) | 404 | `NOT_FOUND` |
| `ValidationError` (Pydantic or custom) | 400 | `VALIDATION_FAILED` |
| `SafetyBlockError` (custom) | 422 | `SAFETY_BLOCKED` |
| `RequestValidationError` (FastAPI) | 400 | `INVALID_REQUEST` |
| `HTTPException(403)` | 403 | `FORBIDDEN` |
| `HTTPException(401)` | 401 | `UNAUTHORIZED` |
| `Exception` (catch-all) | 500 | `INTERNAL_ERROR` |

### 6.3 API Endpoint Catalog

All endpoints are prefixed with `/api`. The complete endpoint list:

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Health check |
| `GET` | `/api/auth/profile` | Yes | Get current user profile and role |
| `PUT` | `/api/auth/profile` | Yes | Update current user profile |
| `GET` | `/api/patients` | Clinician | List patients for current clinician |
| `GET` | `/api/patients/:id` | Both | Get patient details |
| `PUT` | `/api/patients/:id` | Patient (own) | Update patient profile |
| `GET` | `/api/clinicians/:id` | Both | Get clinician details |
| `POST` | `/api/visits` | Clinician | Create a new visit |
| `GET` | `/api/visits` | Both | List visits (filtered by role) |
| `GET` | `/api/visits/:id` | Both | Get visit details with prescriptions |
| `PUT` | `/api/visits/:id` | Clinician | Update visit notes/status |
| `POST` | `/api/visits/:id/extract` | Clinician | Run OCR + extraction on visit notes/drawings |
| `POST` | `/api/prescriptions/recommend` | Clinician | Generate Gemini recommendations for a visit |
| `POST` | `/api/prescriptions/validate` | Clinician | Run rules engine on proposed prescriptions |
| `POST` | `/api/prescriptions/approve` | Clinician | Approve a prescription (with confirmation) |
| `POST` | `/api/prescriptions/reject` | Clinician | Reject a prescription with reason |
| `GET` | `/api/prescriptions` | Both | List prescriptions (filtered by role) |
| `GET` | `/api/prescriptions/:id` | Both | Get prescription details + safety receipt |
| `GET` | `/api/prescriptions/:id/receipt` | Both | Get the Coverage-Aware Safety Receipt |
| `POST` | `/api/prescriptions/:id/patient-pack` | Both | Generate patient understanding pack |
| `POST` | `/api/ocr` | Clinician | OCR a base64 image (handwriting, insurance card, PDF) |
| `POST` | `/api/chat` | Both | Conversational AI ("talk to the prescription") |
| `POST` | `/api/voice/generate` | Both | Generate ElevenLabs voice audio |
| `GET` | `/api/voice/:id` | Both | Retrieve generated audio file URL |
| `GET` | `/api/analytics/summary` | Clinician | Get analytics summary from Snowflake |
| `GET` | `/api/analytics/copay-savings` | Clinician | Copay savings breakdown |
| `GET` | `/api/analytics/safety-blocks` | Clinician | Safety block reasons breakdown |
| `GET` | `/api/analytics/time-saved` | Clinician | Estimated time saved per visit |

---

## 7. Core Data Transfer Objects

### 7.1 Prescription Receipt (the signature feature)

This is the "Coverage-Aware Safety Receipt" — every approved prescription produces this shareable object.


### 7.2 Recommendation Request and Response

**Request** (sent to `POST /api/prescriptions/recommend`):


**Response:**


### 7.3 Validation Request and Response

**Request** (sent to `POST /api/prescriptions/validate`):


**Response:**


---

## 8. Docker and Deployment Foundation

### 8.1 Dockerfile (backend)

Multi-stage: Python 3.11 base → install dependencies → copy app → run with `uvicorn pharmasense.main:app --host 0.0.0.0 --port 8080`. Copy built frontend into `static/` for production.


### 8.2 docker-compose.yml


### 8.3 DigitalOcean Deployment Checklist

| Step | Command / Action | Notes |
|---|---|---|
| 1 | Create Droplet | Ubuntu 22.04, 2GB RAM minimum, NYC3 region |
| 2 | Install Docker + Docker Compose | `apt install docker.io docker-compose-v2` |
| 3 | Create Spaces bucket | Name: `pharmasense-assets`, region: NYC3 |
| 4 | Clone repo to Droplet | `git clone` + copy `.env` with production values |
| 5 | Build frontend | `cd frontend && npm install && npm run build` |
| 6 | Start services | `docker compose up -d --build` |
| 7 | Configure DNS / public URL | Point domain or use Droplet IP |
| 8 | Load seed data | Run seed SQL files against Supabase |

---

## 9. Development Workflow

### 9.1 Local Development (two terminals)

**Terminal 1 — Backend:** `cd backend && uvicorn pharmasense.main:app --reload --port 8000`

Server starts on `http://localhost:8000` (or 8080 if configured).

**Terminal 2 — Frontend:** `cd frontend && npm run dev`

Frontend starts on `http://localhost:3000` with proxy to backend.

### 9.2 Build and Run with Docker


Application available at `http://localhost:8080` (Docker exposes 8080; FastAPI/uvicorn runs inside container).

### 9.3 Seed Data Loading


---

## 10. Part 1 Acceptance Criteria

Before proceeding to Part 2, the following must be verified:

| # | Criterion | Verification |
|---|---|---|
| 1 | FastAPI app starts and responds on `/api/health` | `curl http://localhost:8000/api/health` returns `{"success": true}` |
| 2 | Alembic migration runs successfully | `alembic upgrade head` completes; all tables exist in Supabase |
| 3 | Seed data loads without errors | `SELECT count(*) FROM formulary_entries` returns ≥ 30 |
| 4 | Frontend builds and loads at `http://localhost:3000` | Landing page renders |
| 5 | Supabase Auth sign-up/sign-in works | User can register and log in; JWT issued |
| 6 | Auth dependency blocks unauthenticated requests | `curl /api/patients` returns 401 |
| 7 | Auth dependency passes authenticated requests | `curl -H "Authorization: Bearer [token]" /api/auth/profile` returns profile |
| 8 | Role-based routing works | Patient sees patient routes; clinician sees clinician routes |
| 9 | Zustand stores initialize correctly | Auth store persists session across page refresh |
| 10 | Docker Compose builds and runs the full stack | `docker compose up --build` succeeds; app accessible on port 8080 |
| 11 | Error envelope is consistent | All error responses match `ApiResponse` Pydantic schema |
| 12 | Database interaction pairs loaded | `SELECT count(*) FROM drug_interactions` returns ≥ 15 |

---