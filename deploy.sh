#!/usr/bin/env bash
set -euo pipefail

# PharmaSense — DigitalOcean Deployment Script
# Matches the Section 8.3 checklist. Run on the Droplet after cloning.
#
# Prerequisites:
#   1. Ubuntu 22.04 Droplet (2 GB+ RAM, NYC3)
#   2. Docker + Docker Compose installed
#   3. .env file with production values at repo root
#   4. Supabase project provisioned; Spaces bucket created

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> [1/5] Checking prerequisites..."
command -v docker >/dev/null 2>&1 || { echo "ERROR: docker not found. Run: apt install docker.io docker-compose-v2"; exit 1; }
[ -f .env ] || { echo "ERROR: .env file not found. Copy .env.template and fill in production values."; exit 1; }

echo "==> [2/5] Installing frontend dependencies and building..."
cd frontend
npm install --production=false
npm run build
cd "$SCRIPT_DIR"

echo "==> [3/5] Building and starting Docker services..."
docker compose up -d --build

echo "==> [4/5] Waiting for health check..."
for i in $(seq 1 30); do
    if curl -sf http://localhost:8080/api/health > /dev/null 2>&1; then
        echo "    Health check passed."
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo "ERROR: Health check failed after 30 attempts."
        docker compose logs
        exit 1
    fi
    sleep 2
done

echo "==> [5/5] Loading seed data..."
echo "    Run the following against your Supabase database:"
echo "      psql \"\$DATABASE_URL\" -f backend/seed/seed-formulary.sql"
echo "      psql \"\$DATABASE_URL\" -f backend/seed/seed-interactions.sql"
echo "      psql \"\$DATABASE_URL\" -f backend/seed/seed-demo-patients.sql"
echo ""
echo "Deployment complete. App available at http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'localhost'):8080"
