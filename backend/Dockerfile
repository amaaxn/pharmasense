# =============================================================================
# PharmaSense V2 — Multi-stage Dockerfile (Part 6 §5.3)
#
# Stage 1: Node — build frontend (Vite)
# Stage 2: Python builder — install backend deps
# Stage 3: Final slim image — copy everything, run uvicorn
# =============================================================================

# ── Stage 1: Frontend build ──────────────────────────────────────────────────
FROM node:20-alpine AS frontend

WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --ignore-scripts

COPY frontend/ ./
RUN npm run build

# ── Stage 2: Python dependency build ─────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/pyproject.toml ./
COPY backend/pharmasense/ ./pharmasense/

RUN pip install --no-cache-dir .

# ── Stage 3: Final production image ──────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /bin/bash pharmasense

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY backend/pharmasense/ ./pharmasense/
COPY backend/alembic.ini ./alembic.ini
COPY backend/alembic/ ./alembic/
COPY backend/seed/ ./seed/

# Frontend build output → static/ (served by FastAPI StaticFiles)
COPY --from=frontend /frontend/dist/ ./static/

RUN chown -R pharmasense:pharmasense /app
USER pharmasense

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

CMD ["uvicorn", "pharmasense.main:app", "--host", "0.0.0.0", "--port", "8080"]
