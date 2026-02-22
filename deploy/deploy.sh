#!/usr/bin/env bash
# =============================================================================
# PharmaSense — Deployment Script (Part 6 §5.7)
#
# Run from the repo root on the Droplet:
#   ./deploy/deploy.sh
#
# Or remotely:
#   ssh pharmasense@<droplet-ip> 'cd ~/app && git pull && ./deploy/deploy.sh'
# =============================================================================

set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

echo "=== PharmaSense Deploy ==="
echo "Directory: $APP_DIR"

# Pull latest code (if in a git repo)
if [ -d .git ]; then
    echo "--- Pulling latest code ---"
    git pull --ff-only
fi

# Verify .env exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found. Copy .env.template and fill in values."
    exit 1
fi

# Build and start services
echo "--- Building and starting services ---"
docker compose -f docker-compose.prod.yml up -d --build

# Wait for health check
echo "--- Waiting for health check ---"
for i in $(seq 1 30); do
    if curl -sf http://localhost:8080/api/health > /dev/null 2>&1; then
        echo "Health check passed!"
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo "WARNING: Health check not passing after 30s"
        docker compose -f docker-compose.prod.yml logs --tail=20 pharmasense
        exit 1
    fi
    sleep 1
done

# Show status
echo ""
echo "--- Service Status ---"
docker compose -f docker-compose.prod.yml ps
echo ""
echo "=== Deploy Complete ==="
