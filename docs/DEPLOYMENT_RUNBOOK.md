# Lodgik — Deployment Runbook

**Version:** 1.0  
**Date:** 2026-02-22  
**Status:** Production Ready  

---

## 1. Infrastructure Requirements

### 1.1 Server Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| API Server | 2 vCPU, 4GB RAM | 4 vCPU, 8GB RAM |
| Database | 2 vCPU, 4GB RAM, 50GB SSD | 4 vCPU, 16GB RAM, 200GB SSD |
| Redis | 1 vCPU, 1GB RAM | 2 vCPU, 4GB RAM |
| Web Server (Nginx) | 1 vCPU, 1GB RAM | 2 vCPU, 2GB RAM |

### 1.2 Software Dependencies

| Software | Version | Purpose |
|----------|---------|---------|
| PHP | 8.3+ | Backend runtime |
| Composer | 2.x | PHP dependency management |
| MySQL | 8.0+ (or PostgreSQL 14+) | Primary database |
| Redis | 7.0+ | Caching, sessions |
| Nginx | 1.24+ | Reverse proxy, static file serving |
| Node.js | 18+ | Frontend build toolchain |
| npm | 9+ | Frontend dependency management |

### 1.3 External Service Accounts

| Service | Purpose | Required |
|---------|---------|----------|
| Paystack | Subscription billing | Yes (production) |
| Termii | WhatsApp notifications | Optional |
| SMTP Server | Email (password reset, invitations) | Yes |
| FCM / APNs | Mobile push notifications | Optional |

---

## 2. Repository Structure

```
lodgik/
├── apps/
│   ├── api/                    # PHP Backend API
│   │   ├── config/             # DI, routes, middleware
│   │   ├── migrations/         # Database migrations (24 files)
│   │   ├── public/             # Web root (index.php, docs/)
│   │   ├── src/
│   │   │   ├── Entity/         # 113 Doctrine entities
│   │   │   ├── Enum/           # 22 enums
│   │   │   ├── Module/         # 40 modules (service + controller + routes)
│   │   │   ├── Middleware/      # Auth, Tenant, Role, CORS
│   │   │   └── Helper/         # Response helpers, JWT, Paystack
│   │   └── tests/              # PHPUnit tests (448 tests)
│   ├── web/                    # Angular frontend monorepo
│   │   └── projects/
│   │       ├── hotel/          # Hotel management web app
│   │       ├── admin/          # Super admin web app
│   │       ├── merchant/       # Merchant partner portal
│   │       └── shared/         # Shared component library
│   └── mobile/                 # Ionic mobile apps
│       ├── guest/              # Guest mobile app
│       ├── tablet/             # In-room tablet app
│       ├── security/           # Security staff app
│       └── reception/          # Reception/front desk app
├── docs/                       # Documentation
│   ├── openapi.yaml            # API specification (459 endpoints)
│   ├── PRD.md                  # Product Requirements Document
│   ├── FSD.md                  # Functional Specification Document
│   ├── SRS.md                  # Software Requirements Specification
│   └── DEPLOYMENT_RUNBOOK.md   # This file
└── docker-compose.yml          # Container orchestration
```

---

## 3. Environment Setup

### 3.1 Environment Variables

Create `.env` in `apps/api/`:

```bash
# ─── Application ─────────────────────────────────
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.lodgik.com

# ─── Database ────────────────────────────────────
DB_HOST=localhost
DB_PORT=3306
DB_NAME=lodgik
DB_USER=lodgik_app
DB_PASSWORD=<strong-password>
DB_CHARSET=utf8mb4

# ─── Redis ───────────────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<redis-password>

# ─── JWT ─────────────────────────────────────────
JWT_SECRET=<64-char-random-string>
JWT_ACCESS_TTL=900        # 15 minutes
JWT_REFRESH_TTL=2592000   # 30 days

# ─── Paystack ────────────────────────────────────
PAYSTACK_SECRET_KEY=sk_live_xxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxx
PAYSTACK_WEBHOOK_SECRET=whsec_xxxx

# ─── Termii (WhatsApp) ──────────────────────────
TERMII_API_KEY=<api-key>
TERMII_SENDER_ID=Lodgik

# ─── Email (SMTP) ───────────────────────────────
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=noreply@lodgik.com
MAIL_PASSWORD=<password>
MAIL_FROM_NAME=Lodgik
MAIL_FROM_ADDRESS=noreply@lodgik.com
```

### 3.2 Frontend Environment

Create environment files for each web app:

```typescript
// projects/{hotel,admin,merchant}/src/environments/environment.prod.ts
export const environment = {
  apiUrl: 'https://api.lodgik.com/api',
  production: true,
};
```

---

## 4. Deployment Procedure

### 4.1 Database Setup

```bash
# 1. Create database
mysql -u root -p -e "CREATE DATABASE lodgik CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p -e "CREATE USER 'lodgik_app'@'%' IDENTIFIED BY '<password>';"
mysql -u root -p -e "GRANT ALL ON lodgik.* TO 'lodgik_app'@'%';"

# 2. Run migrations
cd apps/api
php vendor/bin/doctrine-migrations migrate --no-interaction

# 3. Verify tables created
mysql -u lodgik_app -p lodgik -e "SHOW TABLES;" | wc -l
# Expected: 113+ tables
```

### 4.2 Backend Deployment

```bash
# 1. Install PHP dependencies
cd apps/api
composer install --no-dev --optimize-autoloader

# 2. Clear caches
php bin/clear-cache.php 2>/dev/null || true

# 3. Verify health
curl -s http://localhost:8080/api/health | jq .

# 4. Run tests (CI only)
php vendor/bin/phpunit
# Expected: 448 tests, 1120 assertions, 0 failures

# 5. Generate OpenAPI spec
vendor/bin/openapi src/ -o public/docs/openapi.yaml --format yaml
```

### 4.3 Frontend Build & Deployment

```bash
# 1. Install dependencies
cd apps/web
npm ci

# 2. Build all web applications
npx ng build hotel --configuration=production
npx ng build admin --configuration=production
npx ng build merchant --configuration=production

# 3. Output locations
# dist/hotel/     → hotel.lodgik.com
# dist/admin/     → admin.lodgik.com
# dist/merchant/  → merchant.lodgik.com

# 4. Build mobile apps (if deploying to app stores)
cd ../mobile
for app in guest tablet security reception; do
  cd $app && npm ci && npx ionic build --prod && cd ..
done
```

### 4.4 Nginx Configuration

```nginx
# API server
server {
    listen 443 ssl http2;
    server_name api.lodgik.com;

    ssl_certificate     /etc/ssl/lodgik/fullchain.pem;
    ssl_certificate_key /etc/ssl/lodgik/privkey.pem;

    root /var/www/lodgik/apps/api/public;
    index index.php;

    # API documentation (Swagger UI)
    location /docs {
        try_files $uri $uri/ =404;
    }

    location / {
        try_files $uri /index.php$is_args$args;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
}

# Hotel web app
server {
    listen 443 ssl http2;
    server_name hotel.lodgik.com;
    root /var/www/lodgik/apps/web/dist/hotel/browser;
    index index.html;
    try_files $uri $uri/ /index.html;
}

# Admin web app
server {
    listen 443 ssl http2;
    server_name admin.lodgik.com;
    root /var/www/lodgik/apps/web/dist/admin/browser;
    index index.html;
    try_files $uri $uri/ /index.html;
}

# Merchant portal
server {
    listen 443 ssl http2;
    server_name merchant.lodgik.com;
    root /var/www/lodgik/apps/web/dist/merchant/browser;
    index index.html;
    try_files $uri $uri/ /index.html;
}
```

---

## 5. Docker Deployment (Alternative)

### 5.1 docker-compose.yml

```yaml
version: '3.8'
services:
  api:
    build: ./apps/api
    ports: ["8080:80"]
    environment:
      - DB_HOST=db
      - REDIS_HOST=redis
    depends_on: [db, redis]
    volumes:
      - ./apps/api:/var/www/html

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: lodgik
      MYSQL_USER: lodgik_app
      MYSQL_PASSWORD: apppass
    volumes:
      - db_data:/var/lib/mysql
    ports: ["3306:3306"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  hotel-web:
    image: nginx:alpine
    volumes:
      - ./apps/web/dist/hotel/browser:/usr/share/nginx/html
    ports: ["3000:80"]

  admin-web:
    image: nginx:alpine
    volumes:
      - ./apps/web/dist/admin/browser:/usr/share/nginx/html
    ports: ["3001:80"]

  merchant-web:
    image: nginx:alpine
    volumes:
      - ./apps/web/dist/merchant/browser:/usr/share/nginx/html
    ports: ["3002:80"]

volumes:
  db_data:
```

### 5.2 Docker Commands

```bash
# Build and start
docker-compose up -d --build

# Run migrations
docker-compose exec api php vendor/bin/doctrine-migrations migrate --no-interaction

# Check health
curl http://localhost:8080/api/health

# View logs
docker-compose logs -f api
```

---

## 6. Post-Deployment Verification

### 6.1 Health Checks

```bash
# API health
curl -s https://api.lodgik.com/api/health | jq .status
# Expected: "healthy"

# API detailed health (includes DB + Redis)
curl -s https://api.lodgik.com/api/health/detailed | jq .

# Swagger docs accessible
curl -s -o /dev/null -w "%{http_code}" https://api.lodgik.com/docs/
# Expected: 200
```

### 6.2 Smoke Tests

```bash
# 1. Register a tenant
curl -X POST https://api.lodgik.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"tenant_name":"Test Hotel","first_name":"John","last_name":"Doe","email":"test@example.com","password":"Password123!"}'

# 2. Login
TOKEN=$(curl -s -X POST https://api.lodgik.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}' | jq -r .access_token)

# 3. Get profile
curl -H "Authorization: Bearer $TOKEN" https://api.lodgik.com/api/auth/me

# 4. Get dashboard
curl -H "Authorization: Bearer $TOKEN" https://api.lodgik.com/api/dashboard

# 5. Verify frontend apps load
for domain in hotel admin merchant; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$domain.lodgik.com/)
  echo "$domain.lodgik.com: $STATUS"
done
```

### 6.3 Webhook Configuration

```bash
# Paystack webhook URL
https://api.lodgik.com/api/subscriptions/webhook

# Events to subscribe:
# - charge.success
# - subscription.create
# - subscription.not_renew
# - subscription.disable
# - invoice.payment_failed
```

---

## 7. Monitoring & Maintenance

### 7.1 Log Locations

| Log | Location | Rotation |
|-----|----------|----------|
| PHP error log | /var/log/php/error.log | Daily, 30 day retention |
| Nginx access | /var/log/nginx/access.log | Daily, 90 day retention |
| Nginx error | /var/log/nginx/error.log | Daily, 90 day retention |
| Application | /var/www/lodgik/apps/api/var/log/ | Daily |

### 7.2 Database Maintenance

```bash
# Daily backup
mysqldump -u lodgik_app -p lodgik | gzip > /backups/lodgik_$(date +%Y%m%d).sql.gz

# Weekly optimization
mysqlcheck -u root -p --optimize lodgik

# Monitor slow queries
mysql -e "SET GLOBAL slow_query_log = 'ON'; SET GLOBAL long_query_time = 1;"
```

### 7.3 Health Monitoring

Set up external monitoring (e.g., UptimeRobot, Pingdom) to check:
- `https://api.lodgik.com/api/health` every 60 seconds
- Alert on non-200 response or response time > 5 seconds

### 7.4 Scaling Triggers

| Metric | Threshold | Action |
|--------|-----------|--------|
| CPU > 80% sustained | 5 minutes | Add API server instance |
| Memory > 85% | 5 minutes | Increase RAM or add instance |
| DB connections > 80% max | Immediate | Add read replica |
| Disk usage > 80% | 24 hours | Expand storage |
| Response time > 1s (p95) | 15 minutes | Investigate and optimize |

---

## 8. Rollback Procedure

```bash
# 1. Revert to previous release
git checkout <previous-tag>
composer install --no-dev --optimize-autoloader

# 2. Rollback database (if migration was run)
php vendor/bin/doctrine-migrations migrate prev --no-interaction

# 3. Rebuild frontends from previous tag
cd apps/web
npx ng build hotel --configuration=production
npx ng build admin --configuration=production
npx ng build merchant --configuration=production

# 4. Restart services
systemctl restart php8.3-fpm
systemctl restart nginx

# 5. Verify health
curl -s https://api.lodgik.com/api/health
```

---

## 9. Security Checklist

- [ ] All `.env` files excluded from version control
- [ ] JWT_SECRET is 64+ random characters
- [ ] Database user has minimal required privileges
- [ ] Redis protected with password in production
- [ ] HTTPS enforced on all domains
- [ ] CORS origins restricted to known domains
- [ ] Paystack webhook signature verification enabled
- [ ] Rate limiting configured on auth endpoints
- [ ] File upload size limits configured
- [ ] Error details hidden in production (APP_DEBUG=false)
- [ ] Database backups automated and tested
- [ ] SSH key-only access to servers
