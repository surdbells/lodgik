# Lodgik — Multi-Tenant Hospitality SaaS Platform

A full-stack hotel management platform built with **Slim 4 + Doctrine ORM + PostgreSQL** (backend) and **Angular 21 + Tailwind CSS + Angular Material** (frontend).

---

## Quick Start (Local Development)

### Prerequisites

- **PHP 8.3+** with extensions: pdo_pgsql, mbstring, json, openssl
- **PostgreSQL 16+**
- **Redis** (for caching)
- **Node.js 22+** and **npm 10+**
- **Composer 2+**

### 1. Clone and Setup Backend

```bash
git clone https://github.com/surdbells/lodgik.git
cd lodgik/apps/api

# Install PHP dependencies
composer install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials:
#   DB_HOST=localhost
#   DB_PORT=5432
#   DB_NAME=lodgik
#   DB_USER=lodgik
#   DB_PASS=lodgik_secret
#   REDIS_HOST=127.0.0.1

# Create database
createdb lodgik  # or use pgAdmin

# Run migrations
vendor/bin/doctrine-migrations --configuration=config/migrations.php migrate --no-interaction

# Seed data (creates super admin + demo tenant + plans + feature modules)
php bin/seed.php --fresh
php bin/seed-features.php --fresh

# Start API server
php -S localhost:8000 -t public
```

The API is now running at **http://localhost:8000**

### 2. Setup Frontend

```bash
cd lodgik/apps/web

# Install Node dependencies
npm install

# Build shared libraries (required before serving apps)
npx ng build shared
npx ng build charts

# Start Super Admin Console (port 4200)
npx ng serve admin --port 4200

# In another terminal — start Hotel Admin App (port 4201)
npx ng serve hotel --port 4201
```

---

## Test Credentials

### Super Admin Console → http://localhost:4200

| Field    | Value                  |
|----------|------------------------|
| Email    | `admin@lodgik.com`     |
| Password | `LodgikAdmin2026!`     |

Full platform access: tenant management, plans, features, app releases, usage analytics, settings.

### Hotel Admin (Demo Tenant) → http://localhost:4201

| Field    | Value                        |
|----------|------------------------------|
| Email    | `adebayo@grandpalace.ng`     |
| Password | `Demo1234!`                  |

Pre-seeded demo hotel ("Grand Palace Hotel") with Professional plan, staff, and property data.

### Self-Registration

Register a new hotel at http://localhost:4201/register — creates a tenant with 14-day trial and redirects to the 7-step onboarding wizard.

---

## API Endpoints (83 total)

Verify the API is running:
```bash
curl http://localhost:8000/api/health
```

Test login:
```bash
# Super Admin
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lodgik.com","password":"LodgikAdmin2026!"}'

# Hotel Admin
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"adebayo@grandpalace.ng","password":"Demo1234!"}'
```

---

## Project Structure

```
lodgik/
├── apps/
│   ├── api/                    # PHP Backend (Slim 4 + Doctrine)
│   │   ├── config/             # DI, routes, middleware, migrations
│   │   ├── migrations/         # 6 Doctrine migrations
│   │   ├── src/
│   │   │   ├── Entity/         # 17 Doctrine entities
│   │   │   ├── Module/         # 10 feature modules
│   │   │   └── Service/        # 14 core services
│   │   └── tests/
│   │
│   └── web/                    # Angular 21 Frontend
│       ├── projects/
│       │   ├── admin/          # Super Admin Console (10 pages)
│       │   ├── hotel/          # Hotel Admin App (10 pages)
│       │   ├── shared/         # @lodgik/shared library
│       │   └── charts/         # @lodgik/charts SVG library
│       └── angular.json
```

## Tech Stack

| Layer        | Technology                        |
|--------------|-----------------------------------|
| Backend      | PHP 8.3, Slim 4, Doctrine ORM 3  |
| Database     | PostgreSQL 16                     |
| Cache        | Redis                             |
| Frontend     | Angular 21, Tailwind CSS 3        |
| Charts       | Custom SVG (7 components)         |
| Auth         | JWT (firebase/php-jwt)            |
| Email        | ZeptoMail API                     |
| Payments     | Paystack                          |
