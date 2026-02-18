# ─────────────────────────────────────────────────
# Lodgik — Development Commands
# ─────────────────────────────────────────────────

.PHONY: help up down restart logs api-shell db-shell redis-shell migrate seed test lint

# Default target
help: ## Show this help
	@echo ""
	@echo "  Lodgik Development Commands"
	@echo "  ─────────────────────────────"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ─── Docker ─────────────────────────────────────

up: ## Start all services
	docker compose up -d

down: ## Stop all services
	docker compose down

restart: ## Restart all services
	docker compose restart

logs: ## Tail logs from all services
	docker compose logs -f

logs-api: ## Tail API logs only
	docker compose logs -f api

# ─── Shell Access ───────────────────────────────

api-shell: ## Open shell in API container
	docker compose exec api bash

db-shell: ## Open PostgreSQL shell
	docker compose exec postgres psql -U lodgik -d lodgik

redis-shell: ## Open Redis CLI
	docker compose exec redis redis-cli

# ─── Database ───────────────────────────────────

migrate: ## Run database migrations
	docker compose exec api php bin/console.php migrations:migrate --no-interaction

migrate-diff: ## Generate migration from entity changes
	docker compose exec api php bin/console.php migrations:diff

migrate-status: ## Check migration status
	docker compose exec api php bin/console.php migrations:status

seed: ## Run database seeder
	docker compose exec api php bin/console.php app:seed

# ─── Testing ────────────────────────────────────

test: ## Run all tests
	docker compose exec api composer test

test-unit: ## Run unit tests only
	docker compose exec api vendor/bin/phpunit --testsuite=Unit

test-integration: ## Run integration tests only
	docker compose exec api vendor/bin/phpunit --testsuite=Integration

# ─── Code Quality ───────────────────────────────

lint: ## Check code style
	docker compose exec api composer lint

fix: ## Fix code style
	docker compose exec api composer fix

analyse: ## Run static analysis (PHPStan)
	docker compose exec api composer analyse

# ─── Composer ───────────────────────────────────

composer-install: ## Install PHP dependencies
	docker compose exec api composer install

composer-update: ## Update PHP dependencies
	docker compose exec api composer update

# ─── Angular ────────────────────────────────────

web-dev: ## Start Angular dev server
	cd apps/web && ng serve --proxy-config proxy.conf.json

web-build: ## Build Angular for production
	cd apps/web && ng build --configuration=production

# ─── Utilities ──────────────────────────────────

clean: ## Remove all containers, volumes, and build artifacts
	docker compose down -v --remove-orphans
	rm -rf apps/api/var apps/api/vendor apps/web/node_modules apps/web/dist

swagger: ## Generate OpenAPI docs
	docker compose exec api vendor/bin/openapi --output public/openapi.json src/
