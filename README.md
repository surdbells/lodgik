# Lodgik

**Hospitality Operating System** — A multi-tenant SaaS platform for Nigerian hotels, guesthouses, and lodges.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Slim 4 (PHP 8.3) + Doctrine ORM 3 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Frontend | Angular 21 (standalone components) |
| Mobile | NativeScript + Angular |
| Desktop | Electron |
| Charts | Custom SVG (zero dependencies) |
| Email | ZeptoMail |
| SMS | Termii |
| Payments | Paystack (subscriptions only) |

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 22+ (for Angular CLI)
- Make (optional, for shortcuts)

### Quick Start

```bash
# 1. Clone the repository
git clone <repo-url> lodgik && cd lodgik

# 2. Copy environment file
cp apps/api/.env.example apps/api/.env

# 3. Start all services
make up
# or: docker compose up -d

# 4. Install PHP dependencies
make composer-install

# 5. Run migrations
make migrate

# 6. Seed demo data
make seed

# 7. Open the app
# API:  http://localhost:8080/api/health
# Web:  http://localhost:4200
```

### Common Commands

```bash
make help              # Show all available commands
make up                # Start services
make down              # Stop services
make logs              # Tail logs
make api-shell         # Shell into API container
make db-shell          # PostgreSQL CLI
make migrate           # Run migrations
make migrate-diff      # Generate migration from entity changes
make test              # Run all tests
make lint              # Check code style
make fix               # Fix code style
```

## Project Structure

```
lodgik/
├── apps/
│   ├── api/           # Slim 4 PHP Backend
│   ├── web/           # Angular 21 Web App
│   ├── desktop/       # Electron Desktop App
│   ├── mobile-guest/  # NativeScript Guest App
│   ├── mobile-housekeeping/
│   ├── mobile-reception/
│   ├── mobile-bar-pos/
│   └── mobile-kitchen/
├── libs/
│   ├── shared-types/  # TypeScript interfaces & enums
│   ├── shared-services/
│   ├── shared-ui/     # SVG chart components
│   ├── shared-state/
│   └── shared-utils/
├── docker-compose.yml
├── Makefile
└── README.md
```

## License

Proprietary — All rights reserved.
