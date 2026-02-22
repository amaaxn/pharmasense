# PharmaSense

**Coverage-aware prescription decision engine** that enforces safety and coverage constraints, then explains the tradeoffs to both clinicians and patients.

PharmaSense proves that prescriptions can be cheaper, safer, and faster — with full transparency for every stakeholder.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        DigitalOcean Droplet                      │
│  ┌──────────┐    ┌───────────────────────────────────────────┐   │
│  │  Caddy   │───▶│  FastAPI (Python 3.11)                    │   │
│  │ (SSL/TLS)│    │  ├── Rules Engine (deterministic safety)  │   │
│  └──────────┘    │  ├── Gemini Service (AI recommendations)  │   │
│                  │  ├── ElevenLabs Service (voice packs)     │   │
│                  │  ├── Snowflake Service (analytics)        │   │
│                  │  └── Static files (React SPA)             │   │
│                  └───────────────────────────────────────────┘   │
│                         │              │            │            │
│                         ▼              ▼            ▼            │
│                   ┌──────────┐  ┌───────────┐ ┌──────────┐      │
│                   │ Supabase │  │ DO Spaces │ │Snowflake │      │
│                   │(Postgres)│  │  (S3/CDN) │ │(Analytics│      │
│                   │ + Auth   │  │ MP3 / PDF │ │  OLAP)   │      │
│                   └──────────┘  └───────────┘ └──────────┘      │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  React 19 + TypeScript + Tailwind v4 + Framer Motion             │
│  ├── Clinician Cockpit (3-panel: Notes → Extraction → Rx)       │
│  ├── Three-Lane Review (Best Covered / Cheapest / Backup)       │
│  ├── Patient Pack (plain-language, voice, accessibility)        │
│  └── Analytics Dashboard (Snowflake-powered)                    │
└──────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS v4, Framer Motion, Zustand |
| Backend | FastAPI, Python 3.11, SQLAlchemy 2 (async), Pydantic v2, Alembic |
| Database | PostgreSQL via Supabase (auth + data) |
| AI/ML | Google Gemini 1.5 Flash (multimodal OCR, recommendations, chat) |
| Voice | ElevenLabs (multilingual patient instructions) |
| Analytics | Snowflake (event sync, dashboard queries) |
| Storage | DigitalOcean Spaces (MP3 voice packs, PDF prescriptions) |
| Hosting | DigitalOcean Droplet + Caddy (automatic SSL) |
| CI/CD | Docker, Docker Compose, multi-stage builds |

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL (or Supabase project)
- Docker & Docker Compose (optional, for containerized run)

### 1. Clone and configure

```bash
git clone <repo-url>
cd prescription-manager
cp .env.template .env
# Edit .env with your credentials (Supabase, Gemini, ElevenLabs, etc.)
```

### 2. Install dependencies

```bash
make install
# Or manually:
# cd backend && python3 -m venv .venv && .venv/bin/pip install -e .
# cd frontend && npm install
```

### 3. Run database migrations

```bash
make migrate
```

### 4. Seed demo data

```bash
make seed
# Or use the API: POST /api/admin/reset-demo
```

### 5. Start development servers

```bash
# Terminal 1 — Backend (port 8000)
make backend

# Terminal 2 — Frontend (port 3000, proxies /api → 8000)
make frontend
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Docker (production-like)

```bash
make up
# App available at http://localhost:8080
```

## Deployment (DigitalOcean)

### Initial server setup

```bash
scp deploy/setup-droplet.sh root@<droplet-ip>:~
ssh root@<droplet-ip> 'bash setup-droplet.sh'
```

### Deploy the app

```bash
ssh pharmasense@<droplet-ip>
cd /opt/pharmasense
git pull origin main
cp .env.template .env  # configure with production values
bash deploy/deploy.sh
```

The app will be available at `https://<your-domain>` with automatic SSL via Caddy + Let's Encrypt.

## Project Structure

```
prescription-manager/
├── backend/
│   ├── pharmasense/
│   │   ├── config/          # Settings, Snowflake connection
│   │   ├── dependencies/    # FastAPI dependency injection
│   │   ├── models/          # SQLAlchemy models
│   │   ├── repositories/    # Data access layer
│   │   ├── routers/         # API endpoints
│   │   ├── schemas/         # Pydantic DTOs
│   │   ├── services/        # Business logic
│   │   └── main.py          # FastAPI app entrypoint
│   ├── alembic/             # Database migrations
│   ├── seed/                # Demo seed data (SQL)
│   ├── snowflake/           # Snowflake schema setup
│   └── Dockerfile           # Multi-stage production build
├── frontend/
│   ├── src/
│   │   ├── api/             # API client functions
│   │   ├── components/      # React components
│   │   ├── i18n/            # Internationalization (EN/ES)
│   │   ├── lib/             # Utilities, Supabase client
│   │   ├── pages/           # Route pages
│   │   ├── shared/          # Design system (Button, Card, etc.)
│   │   ├── stores/          # Zustand state management
│   │   └── App.tsx          # Root component with routing
│   └── vite.config.ts
├── deploy/                  # DigitalOcean provisioning scripts
├── specs/                   # Feature specifications
├── docker-compose.yml       # Development
├── docker-compose.prod.yml  # Production (+ Caddy)
├── Caddyfile                # Reverse proxy + SSL config
├── Makefile                 # Dev workflow shortcuts
└── .env.template            # Environment variable reference
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/auth/login` | Supabase auth login |
| GET | `/api/patients` | List patients |
| GET | `/api/clinicians` | List clinicians |
| POST | `/api/visits` | Create a visit |
| POST | `/api/ocr/handwriting` | Gemini multimodal OCR |
| POST | `/api/ocr/insurance-card` | Insurance card parsing |
| POST | `/api/prescriptions/recommend` | AI-powered recommendations |
| POST | `/api/prescriptions/validate` | Rules engine validation |
| POST | `/api/prescriptions/approve` | Approve with safety confirmation |
| POST | `/api/prescriptions/{id}/patient-pack` | Generate patient instructions |
| POST | `/api/prescriptions/{id}/pdf` | Download prescription PDF |
| POST | `/api/voice/generate` | ElevenLabs voice pack |
| POST | `/api/chat` | Post-prescription chat with Gemini |
| GET | `/api/analytics/summary` | Dashboard (Snowflake or local) |
| POST | `/api/analytics/sync` | Sync events to Snowflake |
| POST | `/api/admin/reset-demo` | Reset demo data |
| GET | `/api/admin/demo-recommendations` | Fallback recommendations |

## Key Features

### Safety-First Prescriptions
- Allergy detection (drug class cross-reactivity)
- Drug interaction checks (severity-graded)
- Dose range validation
- Duplicate therapy detection
- All checks are deterministic (rules engine, not AI)

### Three-Lane Recommendation Review
- **Best Covered**: Lowest copay with full coverage
- **Cheapest**: Absolute lowest cost option
- **Clinical Backup**: Standard of care (may be blocked by safety)

### Patient Understanding
- Plain-language instructions at 6th grade reading level
- Multilingual voice instructions (English + Spanish via ElevenLabs)
- Medication name pronunciation
- "What to avoid" list, side effect triage, daily schedule

### Accessibility
- Skip link, focus management, screen reader support
- Dyslexia-friendly font toggle (OpenDyslexic)
- High-contrast mode
- Large type mode (25% scale increase)
- Full keyboard navigation
- WCAG 2.1 AA compliance

### Analytics
- Event-driven architecture with dual-write (PostgreSQL + Snowflake)
- Copay savings, safety block, visit efficiency dashboards
- Adherence risk signals based on copay thresholds
- Graceful degradation (Snowflake → local PostgreSQL fallback)

## Environment Variables

See [`.env.template`](.env.template) for the complete list. Key variables:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection (asyncpg) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `ELEVENLABS_API_KEY` | No | ElevenLabs (falls back to silent audio) |
| `SNOWFLAKE_ACCOUNT` | No | Snowflake (falls back to local queries) |
| `SPACES_ACCESS_KEY` | No | DO Spaces (falls back to in-memory storage) |

## Demo

Run `POST /api/admin/reset-demo` or click "Reset Demo Data" on the clinician dashboard to seed the database with:
- 3 demo patients (Maria Lopez, James Chen, Sofia Rivera)
- 1 demo clinician (Dr. Alex Smith)
- 3 pre-existing visits with prescriptions
- 20+ analytics events (dashboard populated on first load)

## License

MIT
