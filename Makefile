# PharmaSense — Development Workflow (Part 1, Section 9)
# Usage: run each target in a separate terminal where noted.

BACKEND_DIR  := backend
FRONTEND_DIR := frontend
VENV         := .venv/bin
PORT_BACKEND := 8000
PORT_DOCKER  := 8080

# ── 9.1 Local Development ────────────────────────────────────────────

.PHONY: backend
backend: ## Terminal 1 — Start FastAPI with hot-reload on :8000
	cd $(BACKEND_DIR) && $(VENV)/uvicorn pharmasense.main:app --reload --port $(PORT_BACKEND)

.PHONY: frontend
frontend: ## Terminal 2 — Start Vite dev server on :3000 (proxies /api → :8000)
	cd $(FRONTEND_DIR) && npm run dev

# ── Setup ─────────────────────────────────────────────────────────────

.PHONY: install
install: install-backend install-frontend ## Install all dependencies

.PHONY: install-backend
install-backend: ## Create venv and install Python dependencies
	cd $(BACKEND_DIR) && python3 -m venv .venv && $(VENV)/pip install -e .

.PHONY: install-frontend
install-frontend: ## Install Node dependencies
	cd $(FRONTEND_DIR) && npm install

# ── 9.2 Build and Run with Docker ────────────────────────────────────

.PHONY: build
build: build-frontend ## Build frontend then Docker image
	docker compose build

.PHONY: build-frontend
build-frontend: ## Build frontend for production
	cd $(FRONTEND_DIR) && npm run build

.PHONY: up
up: ## Start the full stack via Docker Compose on :8080
	docker compose up -d --build

.PHONY: down
down: ## Stop Docker Compose services
	docker compose down

.PHONY: logs
logs: ## Tail Docker Compose logs
	docker compose logs -f

# ── 9.3 Seed Data Loading ────────────────────────────────────────────

.PHONY: seed
seed: ## Load all seed data into the database (requires DATABASE_URL in .env)
	@DB_URL=$$(grep '^DATABASE_URL=' .env | cut -d= -f2- | sed 's|postgresql+asyncpg://|postgresql://|'); \
	echo "Loading formulary…"; \
	psql "$$DB_URL" -f $(BACKEND_DIR)/seed/seed-formulary.sql; \
	echo "Loading drug interactions…"; \
	psql "$$DB_URL" -f $(BACKEND_DIR)/seed/seed-interactions.sql; \
	echo "Loading dose ranges…"; \
	psql "$$DB_URL" -f $(BACKEND_DIR)/seed/seed-dose-ranges.sql; \
	echo "Loading demo clinician…"; \
	psql "$$DB_URL" -f $(BACKEND_DIR)/seed/seed-demo-clinician.sql; \
	echo "Loading demo patients…"; \
	psql "$$DB_URL" -f $(BACKEND_DIR)/seed/seed-demo-patients.sql; \
	echo "Loading demo visits…"; \
	psql "$$DB_URL" -f $(BACKEND_DIR)/seed/seed-demo-visits.sql; \
	echo "Loading analytics events…"; \
	psql "$$DB_URL" -f $(BACKEND_DIR)/seed/seed-analytics-events.sql; \
	echo "All seed data loaded."

# ── Migrations ────────────────────────────────────────────────────────

.PHONY: migrate
migrate: ## Run Alembic migrations (upgrade head)
	cd $(BACKEND_DIR) && $(VENV)/alembic upgrade head

.PHONY: migrate-generate
migrate-generate: ## Auto-generate a new Alembic migration
	cd $(BACKEND_DIR) && $(VENV)/alembic revision --autogenerate -m "$(msg)"

# ── 9.4 DigitalOcean App Platform ──────────────────────────────────

.PHONY: deploy-create
deploy-create: ## Create a new App Platform app from spec
	doctl apps create --spec .do/app.yaml --wait

.PHONY: deploy-update
deploy-update: ## Update the App Platform app spec (requires APP_ID)
	@test -n "$(APP_ID)" || (echo "Usage: make deploy-update APP_ID=<uuid>" && exit 1)
	doctl apps update $(APP_ID) --spec .do/app.yaml --wait

.PHONY: deploy-info
deploy-info: ## Show App Platform app info (requires APP_ID)
	@test -n "$(APP_ID)" || (echo "Usage: make deploy-info APP_ID=<uuid>" && exit 1)
	doctl apps get $(APP_ID)

.PHONY: deploy-logs
deploy-logs: ## Tail App Platform logs (requires APP_ID)
	@test -n "$(APP_ID)" || (echo "Usage: make deploy-logs APP_ID=<uuid>" && exit 1)
	doctl apps logs $(APP_ID) --follow --type run

# ── Utilities ─────────────────────────────────────────────────────────

.PHONY: check
check: ## Type-check both backend and frontend
	cd $(BACKEND_DIR) && $(VENV)/python -c "from pharmasense.main import app; print('Backend OK')"
	cd $(FRONTEND_DIR) && npx tsc --noEmit && echo "Frontend OK"

.PHONY: clean
clean: ## Remove build artifacts
	rm -rf $(FRONTEND_DIR)/dist $(BACKEND_DIR)/static
	find $(BACKEND_DIR) -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

.PHONY: clean-deps
clean-deps: ## Remove all installed dependencies (venv + node_modules)
	rm -rf $(BACKEND_DIR)/.venv $(FRONTEND_DIR)/node_modules

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
