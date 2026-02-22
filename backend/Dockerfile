FROM python:3.11-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/pyproject.toml ./
COPY backend/pharmasense/ ./pharmasense/

RUN pip install --no-cache-dir .

# ── Production stage ─────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY backend/pharmasense/ ./pharmasense/
COPY backend/alembic.ini ./alembic.ini
COPY backend/alembic/ ./alembic/
COPY backend/seed/ ./seed/
COPY frontend/dist/ ./static/

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

CMD ["uvicorn", "pharmasense.main:app", "--host", "0.0.0.0", "--port", "8080"]
