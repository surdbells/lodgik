# Lodgik — Production Deployment Runbook

**Version:** 3.0  
**Date:** 2026-02-23  
**Status:** Production Ready  
**Server:** 138.197.141.195 (aaPanel)  
**Domain:** lodgik.co  

---

## Table of Contents

1. Production Architecture Overview
2. Server Setup (aaPanel on 138.197.141.195)
3. PostgreSQL Setup (aaPanel)
4. Redis Setup (aaPanel)
5. PHP Configuration (aaPanel)
6. Backend API Deployment
7. Nginx Site Configuration (aaPanel)
8. SSL Certificate Setup
9. Environment Configuration
10. Web Application Deployment (Angular → Cloudflare Pages)
11. DNS Configuration
12. Mobile Build Environment Setup
13. NativeScript Build — Android (Step by Step)
14. NativeScript Build — iOS (Step by Step)
15. Android Keystore & App Signing
16. Google Play Store Distribution
17. Apple App Store Distribution
18. Internal Staff App Distribution (AppDistribution Module)
19. Push Notifications (Firebase FCM + Apple APNs)
20. ZeptoMail Integration (Transactional Email)
21. Paystack Webhook Configuration
22. Post-Deployment Verification
23. Monitoring & Alerting
24. Backup & Restore
25. Rollback Procedures
26. Security Hardening Checklist
27. Mobile App Update & Release Strategy
28. Appendix A — App Identity Registry
29. Appendix B — Complete Environment Variable Reference
30. Appendix C — CI/CD Pipeline (GitHub Actions)
31. Appendix D — aaPanel Quick Reference

---

## 1. Production Architecture Overview

```
                                    ┌──────────────────────┐
                                    │   Cloudflare DNS      │
                                    │   lodgik.co           │
                                    └────────┬─────────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
           ┌───────▼───────┐     ┌──────────▼──────────┐   ┌────────▼────────┐
           │ Cloudflare     │     │ Cloudflare Proxy     │   │ Cloudflare       │
           │ Pages (CDN)    │     │ → 138.197.141.195    │   │ Pages (CDN)      │
           │                │     │                      │   │                  │
           │ hotel.lodgik.co│     │ api.lodgik.co        │   │ merchant.lodgik.co│
           │ admin.lodgik.co│     │                      │   │                  │
           └───────────────┘     └──────────┬──────────┘   └──────────────────┘
                                            │
                                ┌───────────▼───────────┐
                                │  138.197.141.195       │
                                │  aaPanel Server        │
                                │                        │
                                │  ┌─────────────────┐   │
                                │  │ Nginx            │   │
                                │  │ (aaPanel managed)│   │
                                │  └────────┬────────┘   │
                                │           │             │
                                │  ┌────────▼────────┐   │
                                │  │ PHP 8.3-FPM     │   │
                                │  │ (aaPanel managed)│   │
                                │  └────────┬────────┘   │
                                │           │             │
                                │  ┌────────▼────────┐   │
                                │  │ PostgreSQL 16    │   │
                                │  │ Redis 7          │   │
                                │  │ (aaPanel managed)│   │
                                │  └─────────────────┘   │
                                └────────────────────────┘

External Services:
  → Paystack (billing)
  → ZeptoMail API (transactional email)
  → Termii (WhatsApp messaging)
  → Firebase FCM (Android push)
  → Apple APNs (iOS push)

Mobile Apps (NativeScript + Angular):
  → Google Play Store (guest app public, staff apps internal)
  → Apple App Store (guest app)
  → AppDistribution module (staff apps — internal OTA)
```

---

## 2. Server Setup (aaPanel on 138.197.141.195)

### 2.1 aaPanel Access

```
Panel URL:  http://138.197.141.195:8888   (or custom port if changed)
Login:      Use credentials from aaPanel installation
```

### 2.2 Required Software Stack (install via aaPanel App Store)

Navigate to aaPanel → App Store and install:

| Software | Version | Install Method |
|----------|---------|---------------|
| Nginx | 1.24+ | App Store → Web Server |
| PHP | 8.3 | App Store → Runtime |
| PostgreSQL | 16 | App Store → Database |
| Redis | 7.x | App Store → Deployment |
| Composer | 2.x | Auto-installed with PHP or `curl -sS https://getcomposer.org/installer \| php` |
| Node.js | 18+ LTS | App Store → Deployment (for web builds only) |

### 2.3 PHP Extensions (install via aaPanel)

aaPanel → App Store → PHP 8.3 → Settings → Install extensions:

| Extension | Required | Purpose |
|-----------|----------|---------|
| pgsql / pdo_pgsql | Yes | PostgreSQL database driver |
| redis | Yes | Redis cache/session driver |
| mbstring | Yes | Multi-byte string handling |
| curl | Yes | HTTP client (ZeptoMail, Paystack, Termii API calls) |
| json | Yes | API request/response handling |
| xml | Yes | Doctrine ORM metadata |
| zip | Yes | Composer package management |
| intl | Yes | Internationalization |
| bcmath | Yes | Precise financial calculations (commissions, billing) |
| gd | Yes | Image processing (guest uploads, QR codes) |
| opcache | Yes | PHP bytecode caching (performance) |
| fileinfo | Yes | File type detection for uploads |

**Verify extensions installed:**

```bash
php -m | grep -E "pgsql|redis|mbstring|curl|json|xml|zip|intl|bcmath|gd|opcache"
```

### 2.4 aaPanel File Paths Reference

| Component | aaPanel Path |
|-----------|-------------|
| Nginx config | `/www/server/panel/vhost/nginx/` |
| PHP binary | `/www/server/php/83/bin/php` |
| PHP-FPM config | `/www/server/php/83/etc/php-fpm.conf` |
| php.ini | `/www/server/php/83/etc/php.ini` |
| PostgreSQL data | `/www/server/pgsql/data/` |
| PostgreSQL config | `/www/server/pgsql/data/postgresql.conf` |
| Redis config | `/www/server/redis/redis.conf` |
| Website root | `/www/wwwroot/` |
| SSL certificates | `/www/server/panel/vhost/cert/` |

---

## 3. PostgreSQL Setup (aaPanel)

### 3.1 Create Database

aaPanel → Database → PostgreSQL → Add Database:

| Field | Value |
|-------|-------|
| Database name | `lodgik` |
| Username | `lodgik_app` |
| Password | Generate strong 64-char password |
| Access | Local (127.0.0.1) |

### 3.2 Verify Connection

```bash
psql -U lodgik_app -d lodgik -h 127.0.0.1 -c "SELECT version();"
```

### 3.3 Production Tuning

aaPanel → Database → PostgreSQL → Settings → Configuration, or edit `/www/server/pgsql/data/postgresql.conf`:

```ini
listen_addresses = 'localhost'
max_connections = 200
shared_buffers = 1GB               # 25% of server RAM
effective_cache_size = 3GB          # 75% of server RAM
work_mem = 16MB
maintenance_work_mem = 256MB
wal_level = replica
max_wal_size = 2GB
log_min_duration_statement = 1000   # Log slow queries (>1s)
```

Restart PostgreSQL via aaPanel → Database → PostgreSQL → Restart.

---

## 4. Redis Setup (aaPanel)

### 4.1 Configure

aaPanel → Deployment → Redis → Settings → Performance tuning:

| Parameter | Value |
|-----------|-------|
| maxmemory | 256mb (minimum) / 512mb (recommended) |
| maxmemory-policy | allkeys-lru |
| requirepass | (set a strong password) |
| bind | 127.0.0.1 |

### 4.2 Verify

```bash
redis-cli -a "<redis-password>" ping
# Expected: PONG
```

---

## 5. PHP Configuration (aaPanel)

aaPanel → App Store → PHP 8.3 → Settings → Configuration:

```ini
display_errors = Off
log_errors = On
error_log = /www/wwwlogs/php_errors.log
memory_limit = 256M
upload_max_filesize = 10M
post_max_size = 12M
max_execution_time = 60
expose_php = Off
date.timezone = Africa/Lagos
```

aaPanel → PHP 8.3 → Settings → Performance tuning (PHP-FPM):

```ini
pm = dynamic
pm.max_children = 50
pm.start_servers = 10
pm.min_spare_servers = 5
pm.max_spare_servers = 20
pm.max_requests = 1000
```

---

## 6. Backend API Deployment

### 6.1 Create Website in aaPanel

aaPanel → Website → Add site:

| Field | Value |
|-------|-------|
| Domain | api.lodgik.co |
| Root Directory | `/www/wwwroot/lodgik/apps/api/public` |
| PHP Version | PHP 8.3 |
| Database | None (already created) |

### 6.2 Clone Repository

```bash
cd /www/wwwroot
git clone https://github.com/surdbells/lodgik.git
cd lodgik/apps/api
```

### 6.3 Install Dependencies

```bash
composer install --no-dev --optimize-autoloader --no-interaction
```

### 6.4 Set Environment

```bash
cp .env.example .env
nano .env    # Configure all values (see Section 9)
chmod 600 .env
```

### 6.5 Create Required Directories

```bash
mkdir -p /www/wwwroot/lodgik/storage
mkdir -p /www/wwwroot/lodgik/apps/api/var/log
mkdir -p /www/wwwroot/lodgik/apps/api/var/doctrine/proxies
chown -R www:www /www/wwwroot/lodgik
```

### 6.6 Run Database Migrations

```bash
cd /www/wwwroot/lodgik/apps/api
php vendor/bin/doctrine-migrations migrate --no-interaction
```

### 6.7 Generate API Documentation

```bash
vendor/bin/openapi src/ -o public/docs/openapi.yaml --format yaml
```

### 6.8 Verify

```bash
cd /www/wwwroot/lodgik/apps/api
php vendor/bin/phpunit
# Expected: 448 tests, 1120 assertions, 0 failures
```

---

## 7. Nginx Site Configuration (aaPanel)

aaPanel → Website → api.lodgik.co → Config:

Replace the Nginx configuration with:

```nginx
server {
    listen 80;
    server_name api.lodgik.co;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.lodgik.co;

    # SSL (managed by aaPanel Let's Encrypt — see Section 8)
    ssl_certificate    /www/server/panel/vhost/cert/api.lodgik.co/fullchain.pem;
    ssl_certificate_key /www/server/panel/vhost/cert/api.lodgik.co/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root /www/wwwroot/lodgik/apps/api/public;
    index index.php;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With" always;

    # Handle preflight CORS
    if ($request_method = OPTIONS) {
        return 204;
    }

    # Swagger UI documentation
    location /docs {
        try_files $uri $uri/ =404;
    }

    # PHP application routing
    location / {
        try_files $uri /index.php$is_args$args;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/tmp/php-cgi-83.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_read_timeout 60s;
    }

    # Block hidden files
    location ~ /\. {
        deny all;
    }

    # File upload limit
    client_max_body_size 12M;

    # Logs
    access_log /www/wwwlogs/api.lodgik.co.log;
    error_log /www/wwwlogs/api.lodgik.co.error.log;
}
```

**Note:** The PHP-FPM socket path may vary. Check aaPanel → PHP 8.3 → Settings → Service for the correct socket path. Common paths: `/tmp/php-cgi-83.sock` or `/www/server/php/83/var/run/php-fpm.sock`.

---

## 8. SSL Certificate Setup

### 8.1 Via aaPanel (Let's Encrypt)

aaPanel → Website → api.lodgik.co → SSL → Let's Encrypt:

1. Select domain: api.lodgik.co
2. Click "Apply" — aaPanel handles verification and installation
3. Enable "Force HTTPS"
4. Enable auto-renewal

### 8.2 Via Cloudflare (if using Cloudflare proxy for API)

If api.lodgik.co is proxied through Cloudflare (recommended for DDoS protection):

1. Cloudflare Dashboard → SSL/TLS → set mode to "Full (Strict)"
2. Cloudflare handles the edge certificate (browser ↔ Cloudflare)
3. aaPanel Let's Encrypt handles the origin certificate (Cloudflare ↔ server)

---

## 9. Environment Configuration

### 9.1 Backend `.env` File

Create at `/www/wwwroot/lodgik/apps/api/.env`:

```bash
# ─── Application ─────────────────────────────────
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.lodgik.co

# ─── Database (PostgreSQL — aaPanel managed) ─────
DB_DRIVER=pdo_pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=lodgik
DB_USER=lodgik_app
DB_PASSWORD=<password-from-aapanel-db-creation>
DB_CHARSET=utf8

# ─── Redis (aaPanel managed) ────────────────────
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=<redis-password-from-aapanel>

# ─── JWT ─────────────────────────────────────────
JWT_SECRET=<generate: openssl rand -hex 32>
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=2592000

# ─── Paystack ────────────────────────────────────
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxx
PAYSTACK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

# ─── ZeptoMail (Transactional Email) ────────────
ZEPTOMAIL_API_KEY=Zoho-enczapikey <your-send-mail-token>
ZEPTOMAIL_API_URL=https://api.zeptomail.com/v1.1/email
ZEPTOMAIL_FROM_ADDRESS=noreply@lodgik.co
ZEPTOMAIL_FROM_NAME=Lodgik

# ─── Termii (WhatsApp) ──────────────────────────
TERMII_API_KEY=<api-key>
TERMII_SENDER_ID=Lodgik

# ─── Firebase (Push Notifications) ──────────────
FCM_SERVER_KEY=<firebase-server-key>

# ─── Apple Push Notifications ───────────────────
APNS_KEY_ID=<key-id>
APNS_TEAM_ID=<team-id>
APNS_KEY_PATH=/www/wwwroot/lodgik/config/apns-auth-key.p8

# ─── Storage ────────────────────────────────────
STORAGE_DRIVER=local
STORAGE_PATH=/www/wwwroot/lodgik/storage
```

### 9.2 ZeptoMail Setup

ZeptoMail replaces traditional SMTP. It uses a REST API for all transactional emails (password reset, invitations, OTP, notifications).

**Setup steps:**

1. Create account at https://zeptomail.zoho.com
2. Add and verify your domain: `lodgik.co`
   - Add SPF, DKIM, and DMARC DNS records as instructed by ZeptoMail
3. Create a **Mail Agent** (e.g., "Lodgik Production")
4. Go to Agent → SMTP/API → API tab → copy the **Send Mail Token**
5. Store token as `ZEPTOMAIL_API_KEY` in `.env`

**API call format (used by Lodgik's email service):**

```php
// POST https://api.zeptomail.com/v1.1/email
// Headers:
//   Authorization: Zoho-enczapikey <SEND_MAIL_TOKEN>
//   Content-Type: application/json
// Body:
// {
//   "from": {"address": "noreply@lodgik.co", "name": "Lodgik"},
//   "to": [{"email_address": {"address": "user@example.com", "name": "User"}}],
//   "subject": "Password Reset",
//   "htmlbody": "<html>...</html>"
// }
```

**Required DNS records for ZeptoMail domain verification:**

| Record Type | Host | Value | Purpose |
|-------------|------|-------|---------|
| TXT | `@` | `zoho-zeptomail=<verification-code>` | Domain ownership |
| TXT | `@` | `v=spf1 include:zeptomail.com ~all` | SPF |
| CNAME | `zmail._domainkey` | `<value-from-zeptomail>` | DKIM |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:admin@lodgik.co` | DMARC |

---

## 10. Web Application Deployment (Angular → Cloudflare Pages)

### 10.1 Build Locally

```bash
cd /path/to/lodgik/apps/web
npm ci
npx ng build hotel --configuration=production
npx ng build admin --configuration=production
npx ng build merchant --configuration=production

# Outputs:
# dist/hotel/browser/    → hotel.lodgik.co
# dist/admin/browser/    → admin.lodgik.co
# dist/merchant/browser/ → merchant.lodgik.co
```

### 10.2 Cloudflare Pages Setup

Cloudflare Dashboard → Workers & Pages → Create:

**Project 1: lodgik-hotel**

| Setting | Value |
|---------|-------|
| Connect to | GitHub → surdbells/lodgik |
| Branch | main |
| Root Directory | `apps/web` |
| Build Command | `npx ng build hotel --configuration=production` |
| Build Output Directory | `dist/hotel/browser` |
| Custom Domain | hotel.lodgik.co |

**Project 2: lodgik-admin**

| Setting | Value |
|---------|-------|
| Root Directory | `apps/web` |
| Build Command | `npx ng build admin --configuration=production` |
| Build Output Directory | `dist/admin/browser` |
| Custom Domain | admin.lodgik.co |

**Project 3: lodgik-merchant**

| Setting | Value |
|---------|-------|
| Root Directory | `apps/web` |
| Build Command | `npx ng build merchant --configuration=production` |
| Build Output Directory | `dist/merchant/browser` |
| Custom Domain | merchant.lodgik.co |

### 10.3 SPA Routing Fix

Create `apps/web/projects/{hotel,admin,merchant}/src/_redirects`:

```
/*    /index.html   200
```

This ensures Angular routing works on page refresh.

### 10.4 Manual Deploy (Wrangler CLI)

```bash
npm install -g wrangler
wrangler login

wrangler pages deploy dist/hotel/browser --project-name=lodgik-hotel
wrangler pages deploy dist/admin/browser --project-name=lodgik-admin
wrangler pages deploy dist/merchant/browser --project-name=lodgik-merchant
```

---

## 11. DNS Configuration

In Cloudflare DNS for `lodgik.co`:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | api | 138.197.141.195 | Proxied (orange cloud) |
| CNAME | hotel | lodgik-hotel.pages.dev | Proxied |
| CNAME | admin | lodgik-admin.pages.dev | Proxied |
| CNAME | merchant | lodgik-merchant.pages.dev | Proxied |
| A | @ | 138.197.141.195 | Proxied (landing page) |
| CNAME | www | lodgik.co | Proxied |
| TXT | @ | SPF record for ZeptoMail | DNS only |
| CNAME | zmail._domainkey | DKIM from ZeptoMail | DNS only |
| TXT | _dmarc | DMARC policy | DNS only |

---

## 12. Mobile Build Environment Setup

### 12.1 Prerequisites Overview

NativeScript compiles TypeScript/Angular code into native Android (Java/Kotlin) and iOS (Objective-C/Swift) binaries. You need platform SDKs installed on your development machine.

| Requirement | Android Build | iOS Build |
|------------|--------------|-----------|
| Operating System | macOS, Linux, or Windows | macOS only |
| Node.js | 18+ LTS | 18+ LTS |
| NativeScript CLI | 8.6+ | 8.6+ |
| Java JDK | 17 LTS | Not needed |
| Android SDK | API Level 35 | Not needed |
| Android Build Tools | 35.0.0 | Not needed |
| Xcode | Not needed | 15+ |
| CocoaPods | Not needed | 1.14+ |

### 12.2 Step-by-Step: macOS Setup (Both Platforms)

```bash
# 1. Install Node.js (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# 2. Install NativeScript CLI
npm install -g nativescript

# 3. Install Java JDK 17 (via Homebrew)
brew install openjdk@17
sudo ln -sfn $(brew --prefix openjdk@17)/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk
export JAVA_HOME=$(/usr/libexec/java_home -v 17)

# 4. Install Android SDK (via Android Studio or command-line tools)
# Option A: Install Android Studio → SDK Manager → install SDK 35
# Option B: Command-line:
brew install --cask android-commandlinetools
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

sdkmanager --licenses
sdkmanager "platforms;android-35" "build-tools;35.0.0" "platform-tools"
sdkmanager "extras;google;m2repository" "extras;android;m2repository"

# 5. Install Xcode (from Mac App Store)
# Then install command line tools:
xcode-select --install
sudo xcodebuild -license accept

# 6. Install CocoaPods
sudo gem install cocoapods
pod setup

# 7. Verify everything
ns doctor android
ns doctor ios
```

### 12.3 Step-by-Step: Linux / Windows Setup (Android Only)

```bash
# 1. Install Node.js 18+ LTS
# 2. Install NativeScript CLI
npm install -g nativescript

# 3. Install Java JDK 17
sudo apt install openjdk-17-jdk                  # Ubuntu/Debian
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

# 4. Install Android SDK command-line tools
mkdir -p ~/android-sdk/cmdline-tools
cd ~/android-sdk/cmdline-tools
wget https://dl.google.com/android/repository/commandlinetools-linux-latest.zip
unzip commandlinetools-linux-latest.zip
mv cmdline-tools latest

export ANDROID_HOME=~/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

sdkmanager --licenses
sdkmanager "platforms;android-35" "build-tools;35.0.0" "platform-tools"

# 5. Verify
ns doctor android
```

### 12.4 Add Environment Variables to Shell Profile

Add to `~/.bashrc`, `~/.zshrc`, or `~/.bash_profile`:

```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64     # Linux
# export JAVA_HOME=$(/usr/libexec/java_home -v 17)       # macOS
export ANDROID_HOME=$HOME/android-sdk                     # or ~/Library/Android/sdk on macOS
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/emulator
```

---

## 13. NativeScript Build — Android (Step by Step)

### 13.1 Lodgik Mobile App Inventory

| App | Directory | Bundle ID | NS Version | Angular | Screens | Firebase |
|-----|-----------|-----------|-----------|---------|---------|----------|
| Guest | `apps/mobile/guest` | `com.lodgik.guest` | 9.0 | 20.2 | 21 | Yes |
| Tablet | `apps/mobile/tablet` | `com.lodgik.tablet` | 9.0 | 20.2 | 11 | No |
| Security | `apps/mobile/security` | `com.lodgik.security` | 8.6 | 17.0 | 10 | No |
| Reception | `apps/mobile/reception` | `com.lodgik.reception` | 8.6 | 17.0 | 10 | Yes |
| Housekeeping | `apps/mobile/housekeeping` | `com.lodgik.housekeeping` | 8.6 | 17.0 | — | Yes |
| Kitchen | `apps/mobile/kitchen` | `com.lodgik.kitchen` | 8.6 | 17.0 | — | Yes |
| POS | `apps/mobile/pos` | `com.lodgik.pos` | 8.6 | 17.0 | — | Yes |

### 13.2 Firebase Setup (Required Before Building)

Apps that use `nativescript-plugin-firebase` require a Firebase configuration file:

```bash
# 1. Go to https://console.firebase.google.com
# 2. Create project: "Lodgik"
# 3. For EACH app that uses Firebase, add an Android app:
#    - Package name: com.lodgik.guest (repeat for reception, housekeeping, kitchen, pos)
#    - App nickname: Lodgik Guest (etc.)
#    - Download google-services.json
#
# 4. Place the file in the correct directory:
cp google-services.json apps/mobile/guest/App_Resources/Android/
cp google-services.json apps/mobile/reception/App_Resources/Android/
cp google-services.json apps/mobile/housekeeping/App_Resources/Android/
cp google-services.json apps/mobile/kitchen/App_Resources/Android/
cp google-services.json apps/mobile/pos/App_Resources/Android/

# IMPORTANT: Each app can share the same google-services.json if all bundle IDs
# are registered in the same Firebase project. Otherwise, download separate files.

# 5. Add to .gitignore:
echo "google-services.json" >> .gitignore
echo "GoogleService-Info.plist" >> .gitignore
```

### 13.3 Build Debug APK (Single App)

```bash
cd apps/mobile/guest

# Install Node.js dependencies
npm ci

# Clean previous build artifacts (optional, recommended for first build)
ns clean

# Build debug APK
ns build android --bundle

# Build output location:
# platforms/android/app/build/outputs/apk/debug/app-debug.apk
```

### 13.4 Build Release AAB (Single App — for Play Store)

```bash
cd apps/mobile/guest

npm ci

# Build release Android App Bundle
ns build android --release \
  --key-store-path ~/keys/lodgik-guest.keystore \
  --key-store-password "$KEYSTORE_PASSWORD" \
  --key-store-alias lodgik-guest \
  --key-store-alias-password "$KEY_PASSWORD" \
  --aab \
  --bundle

# Output:
# platforms/android/app/build/outputs/bundle/release/app-release.aab
```

### 13.5 Build All Android Apps (Batch Script)

```bash
#!/bin/bash
# scripts/build-android-all.sh

set -e
KEYSTORE_DIR=~/keys
PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)

APPS=(guest tablet security reception housekeeping kitchen pos)

for app in "${APPS[@]}"; do
  echo ""
  echo "════════════════════════════════════════════"
  echo "  Building: $app"
  echo "════════════════════════════════════════════"
  
  cd "$PROJECT_ROOT/apps/mobile/$app"
  
  # Install dependencies
  npm ci
  
  # Clean previous build
  ns clean
  
  # Build release AAB
  ns build android --release \
    --key-store-path "$KEYSTORE_DIR/lodgik-$app.keystore" \
    --key-store-password "$KEYSTORE_PASSWORD" \
    --key-store-alias "lodgik-$app" \
    --key-store-alias-password "$KEY_PASSWORD" \
    --aab \
    --bundle
  
  # Copy output to centralized directory
  mkdir -p "$PROJECT_ROOT/dist/android"
  cp platforms/android/app/build/outputs/bundle/release/app-release.aab \
     "$PROJECT_ROOT/dist/android/$app-release.aab"
  
  echo "  ✓ $app build complete → dist/android/$app-release.aab"
done

echo ""
echo "All Android builds complete!"
ls -la "$PROJECT_ROOT/dist/android/"
```

### 13.6 Test on Physical Device

```bash
# Connect Android device via USB (enable USB Debugging in Developer Options)
adb devices  # Should show your device

# Run directly on device (debug mode)
cd apps/mobile/guest
ns run android --bundle

# Or install debug APK manually:
adb install platforms/android/app/build/outputs/apk/debug/app-debug.apk
```

### 13.7 Test on Android Emulator

```bash
# Create an emulator (if not using Android Studio)
sdkmanager "system-images;android-35;google_apis;x86_64"
avdmanager create avd -n lodgik_test -k "system-images;android-35;google_apis;x86_64"

# Start emulator
emulator -avd lodgik_test &

# Run app on emulator
cd apps/mobile/guest
ns run android --bundle
```

### 13.8 Android Build Configuration Reference

File: `apps/mobile/{app}/App_Resources/Android/app.gradle`

```gradle
android {
  compileSdkVersion 35          // Android 15
  buildToolsVersion "35"
  
  defaultConfig {
    minSdkVersion 24            // Android 7.0 Nougat (minimum supported)
    targetSdkVersion 35         // Android 15 (Play Store requirement)
    versionCode 1               // INCREMENT for every Play Store upload
    versionName "1.0.0"         // User-visible version string
    generatedDensities = []
  }
  
  aaptOptions {
    additionalParameters "--no-version-vectors"
  }
}
```

**Version code formula:** `MAJOR * 10000 + MINOR * 100 + PATCH`
- v1.0.0 → versionCode: 10000
- v1.3.2 → versionCode: 10302
- v2.0.0 → versionCode: 20000

File: `apps/mobile/{app}/nativescript.config.ts`

```typescript
import { NativeScriptConfig } from '@nativescript/core';
export default {
  id: 'com.lodgik.guest',          // UNIQUE per app
  appPath: 'src',
  appResourcesPath: 'App_Resources',
  android: {
    v8Flags: '--expose_gc',
    markingMode: 'none'
  }
} as NativeScriptConfig;
```

### 13.9 Android Permissions

File: `apps/mobile/{app}/App_Resources/Android/src/main/AndroidManifest.xml`

| Permission | Apps | Purpose |
|-----------|------|---------|
| `INTERNET` | All 7 | API communication with api.lodgik.co |
| `ACCESS_NETWORK_STATE` | All 7 | Offline detection |
| `CAMERA` | Guest, Security, Reception, Housekeeping, Kitchen, POS | Document scan, QR codes, photos |
| `READ_EXTERNAL_STORAGE` | Guest | Photo picker for profile/documents |
| `WRITE_EXTERNAL_STORAGE` | Guest | Download resources |
| `USE_BIOMETRIC` | Guest | Fingerprint/Face login |
| `RECEIVE_BOOT_COMPLETED` | Staff apps | Restart notification service after reboot |
| `VIBRATE` | All 7 | Notification haptic feedback |

---

## 14. NativeScript Build — iOS (Step by Step)

**Requires macOS with Xcode 15+ installed.**

### 14.1 iOS Prerequisites

```bash
# Verify Xcode
xcode-select -p                  # Should show Xcode path
xcodebuild -version              # Should show 15.x+

# Verify CocoaPods
pod --version                    # Should show 1.14+
```

### 14.2 Apple Developer Account Setup

1. Enroll at https://developer.apple.com ($99/year)
2. In Certificates, Identifiers & Profiles:

**Create App IDs:**

| App | Bundle ID | Capabilities |
|-----|-----------|-------------|
| Guest | `com.lodgik.guest` | Push Notifications, Associated Domains |
| Tablet | `com.lodgik.tablet` | Push Notifications |
| Reception | `com.lodgik.reception` | Push Notifications |
| Housekeeping | `com.lodgik.housekeeping` | Push Notifications |
| Kitchen | `com.lodgik.kitchen` | Push Notifications |
| POS | `com.lodgik.pos` | Push Notifications |
| Security | `com.lodgik.security` | — |

**Create certificates:**
- iOS Distribution (for App Store uploads)
- Apple Push Notification service (APNs) Key (p8 format — one key for all apps)

**Create Provisioning Profiles:**
- One Distribution profile per App ID

### 14.3 Configure iOS Build Settings

File: `apps/mobile/{app}/App_Resources/iOS/build.xcconfig`

```
DEVELOPMENT_TEAM = YOUR_TEAM_ID;
CODE_SIGN_IDENTITY = iPhone Distribution;
ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
IPHONEOS_DEPLOYMENT_TARGET = 16.0;
```

### 14.4 Add Required Info.plist Keys

File: `apps/mobile/{app}/App_Resources/iOS/Info.plist`

Add inside the `<dict>` block:

```xml
<!-- Camera (Guest, Security, Reception, Housekeeping, Kitchen, POS) -->
<key>NSCameraUsageDescription</key>
<string>Lodgik needs camera access to scan documents and QR codes</string>

<!-- Face ID (Guest only) -->
<key>NSFaceIDUsageDescription</key>
<string>Use Face ID for quick and secure login</string>

<!-- Photo Library (Guest only) -->
<key>NSPhotoLibraryUsageDescription</key>
<string>Select photos for your profile or documents</string>

<!-- Push Notifications (all apps except Security) -->
<!-- Capability added automatically when Push Notifications is enabled in App ID -->
```

### 14.5 Firebase Setup for iOS

```bash
# 1. In Firebase Console → Project Settings → Add iOS app
#    Enter bundle ID: com.lodgik.guest (etc.)
# 2. Download GoogleService-Info.plist
# 3. Place in App_Resources/iOS/:
cp GoogleService-Info.plist apps/mobile/guest/App_Resources/iOS/

# NEVER commit to git
```

### 14.6 Build iOS (Debug — Simulator)

```bash
cd apps/mobile/guest
npm ci
ns build ios --bundle

# Run on simulator:
ns run ios --bundle
```

### 14.7 Build iOS (Release — App Store)

```bash
cd apps/mobile/guest
npm ci

# Build for device
ns build ios --release \
  --for-device \
  --provision "Lodgik Guest Distribution" \
  --bundle

# Output: platforms/ios/build/Release-iphoneos/guest.app
```

### 14.8 Archive and Upload to App Store Connect

**Method A — Xcode (GUI):**

1. Open `platforms/ios/guest.xcworkspace` in Xcode
2. Select "Any iOS Device" as build target
3. Product → Archive
4. Window → Organizer → select archive → Distribute App
5. Choose "App Store Connect" → Upload
6. Follow prompts for signing

**Method B — Command Line:**

```bash
# Archive
xcodebuild -workspace platforms/ios/guest.xcworkspace \
  -scheme guest \
  -configuration Release \
  -archivePath build/guest.xcarchive \
  archive

# Create exportOptions.plist:
cat > build/exportOptions.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store</string>
  <key>teamID</key>
  <string>YOUR_TEAM_ID</string>
  <key>signingStyle</key>
  <string>manual</string>
  <key>provisioningProfiles</key>
  <dict>
    <key>com.lodgik.guest</key>
    <string>Lodgik Guest Distribution</string>
  </dict>
</dict>
</plist>
EOF

# Export IPA
xcodebuild -exportArchive \
  -archivePath build/guest.xcarchive \
  -exportPath build/ipa \
  -exportOptionsPlist build/exportOptions.plist

# Upload to App Store Connect
xcrun altool --upload-app \
  -f build/ipa/guest.ipa \
  -u "your-apple-id@email.com" \
  -p "@keychain:AC_PASSWORD" \
  --type ios
```

### 14.9 App Store Submission Checklist

For each iOS app:

- [ ] App icon: 1024x1024px in Assets.xcassets (no alpha channel)
- [ ] LaunchScreen.storyboard configured with logo
- [ ] Screenshots prepared: 6.7" iPhone 15 Pro Max, 6.5" iPhone 11 Pro Max
- [ ] iPad screenshots if Universal: 12.9" iPad Pro
- [ ] App name, subtitle, description, keywords, and promotional text filled in
- [ ] Support URL: https://lodgik.co/support
- [ ] Privacy Policy URL: https://lodgik.co/privacy
- [ ] Privacy nutrition labels completed (data types collected)
- [ ] Age rating questionnaire submitted
- [ ] All NSUsageDescription keys present in Info.plist
- [ ] Build uploaded via Xcode or xcrun altool
- [ ] TestFlight testing completed before public submission
- [ ] `IPHONEOS_DEPLOYMENT_TARGET = 16.0`

---

## 15. Android Keystore & App Signing

### 15.1 Generate Keystores

**CRITICAL: If you lose a keystore, you CANNOT update that app on Play Store. You must create a new listing. Back up to encrypted storage immediately.**

```bash
mkdir -p ~/keys

for app in guest tablet security reception housekeeping kitchen pos; do
  keytool -genkey -v \
    -keystore ~/keys/lodgik-$app.keystore \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -alias lodgik-$app \
    -storepass "$KEYSTORE_PASSWORD" \
    -keypass "$KEY_PASSWORD" \
    -dname "CN=Lodgik, OU=Engineering, O=Lodgik Ltd, L=Lagos, ST=Lagos, C=NG"
  
  echo "✓ Created: ~/keys/lodgik-$app.keystore"
done
```

### 15.2 Backup Keystores

```bash
# Create encrypted backup
tar czf lodgik-keystores-$(date +%Y%m%d).tar.gz -C ~/keys .
gpg -c lodgik-keystores-$(date +%Y%m%d).tar.gz
# Upload .gpg file to secure cloud storage (Google Drive, etc.)
# Store GPG passphrase separately from the file
```

### 15.3 Play App Signing (Recommended)

Google Play App Signing lets Google manage your app signing key. You upload with an upload key, and Google re-signs with the actual distribution key. This means:
- If you lose your upload keystore, Google can reset it
- Smaller APKs via App Bundle optimization

Enable in: Play Console → App → Setup → App Signing

---

## 16. Google Play Store Distribution

### 16.1 Create Developer Account

Register at https://play.google.com/console ($25 one-time registration fee).

### 16.2 Create App Listings

| App | Play Store Title | Category | Track |
|-----|-----------------|----------|-------|
| Lodgik Guest | Lodgik — Hotel Guest App | Travel & Local | Production (public) |
| Lodgik Tablet | Lodgik Tablet | Business | Internal testing |
| Lodgik Security | Lodgik Security | Business | Internal testing |
| Lodgik Reception | Lodgik Reception | Business | Internal testing |
| Lodgik Housekeeping | Lodgik Housekeeping | Business | Internal testing |
| Lodgik Kitchen | Lodgik Kitchen Display | Business | Internal testing |
| Lodgik POS | Lodgik POS Terminal | Business | Internal testing |

### 16.3 Upload and Release

```bash
# 1. Build release AAB (see Section 13.4)
# 2. Go to Play Console → App → Production → Create new release
# 3. Upload the .aab file
# 4. Add release notes
# 5. Review and roll out

# For staff apps: use Internal testing track
# Play Console → App → Testing → Internal testing → Create new release
```

### 16.4 Play Store Listing Requirements

- [ ] App icon: 512x512px PNG
- [ ] Feature graphic: 1024x500px
- [ ] Screenshots: minimum 2, up to 8 per device type (phone, tablet)
- [ ] Short description (80 chars max)
- [ ] Full description (4000 chars max)
- [ ] Privacy policy URL: https://lodgik.co/privacy
- [ ] App category and contact information
- [ ] Content rating questionnaire completed
- [ ] Data safety form completed

---

## 17. Apple App Store Distribution

Follow Section 14.7–14.9 for build and upload. Additional notes:

- **TestFlight:** Upload builds to App Store Connect → TestFlight for beta testing before public release
- **Review time:** Typically 24–48 hours. Use "Expedited Review" for critical fixes
- **Phased rollout:** Available for iOS — release to 1%, 2%, 5%, 10%, 20%, 50%, 100% over 7 days

---

## 18. Internal Staff App Distribution (AppDistribution Module)

Lodgik includes a built-in AppDistribution module (14 API endpoints) for distributing staff apps directly to hotel devices without Play Store review delays.

### 18.1 How It Works

1. Build staff app APK (release-signed)
2. Upload via Admin API
3. Staff app checks for updates on launch
4. User prompted to download and install

### 18.2 Upload Release

```bash
curl -X POST https://api.lodgik.co/api/admin/app-distribution/releases \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "platform=android" \
  -F "app_name=reception" \
  -F "version=1.2.0" \
  -F "build_number=10200" \
  -F "release_notes=Bug fixes and performance improvements" \
  -F "file=@dist/android/reception-release.apk"
```

### 18.3 Distribution Strategy

| App | Play Store | App Store | AppDistribution (OTA) |
|-----|-----------|-----------|----------------------|
| Guest | Public release | Public release | No |
| Tablet | No (sideload/MDM) | No | Yes (primary) |
| Security | Internal track | TestFlight | Yes (primary) |
| Reception | Internal track | TestFlight | Yes (primary) |
| Housekeeping | Internal track | TestFlight | Yes (primary) |
| Kitchen | Internal track | TestFlight | Yes (primary) |
| POS | Internal track | TestFlight | Yes (primary) |

---

## 19. Push Notifications (Firebase FCM + Apple APNs)

### 19.1 Firebase Cloud Messaging (Android)

1. Firebase Console → Project Settings → Cloud Messaging
2. Copy Server Key
3. Add to `.env`: `FCM_SERVER_KEY=AAAA...`
4. Ensure `google-services.json` is in each app's `App_Resources/Android/`

### 19.2 Apple Push Notifications (iOS)

1. Apple Developer → Keys → Create a new key → enable "Apple Push Notifications service"
2. Download the `.p8` key file (save securely — downloadable only once)
3. Note the Key ID and your Team ID
4. Place key on server and add to `.env`:

```bash
APNS_KEY_ID=ABC123DEF4
APNS_TEAM_ID=YOUR_TEAM_ID
APNS_KEY_PATH=/www/wwwroot/lodgik/config/apns-auth-key.p8
```

### 19.3 Device Token Flow

1. Mobile app requests push permission → OS returns device token
2. App sends token to `POST /api/notifications/device-token` with `{token, platform}`
3. Backend stores in `DeviceToken` entity (user_id, token, platform, created_at)
4. When events trigger notifications (new booking, chat message, etc.), backend sends push via FCM (Android) or APNs (iOS)

---

## 20. ZeptoMail Integration (Transactional Email)

### 20.1 Email Types Sent by Lodgik

| Email Type | Trigger | Template |
|-----------|---------|----------|
| Password Reset | User requests reset | Reset link with JWT token |
| Staff Invitation | Admin invites new staff | Invitation link with code |
| Booking Confirmation | New booking created | Booking details |
| Payment Receipt | Successful payment | Invoice/receipt |
| Subscription Activated | Paystack webhook | Welcome + plan details |
| Commission Notification | Merchant earns commission | Commission amount + status |

### 20.2 Verify Domain in ZeptoMail

1. Login to https://zeptomail.zoho.com
2. Go to Settings → Domains → Add Domain → `lodgik.co`
3. Add the DNS records ZeptoMail provides (SPF, DKIM, DMARC) in Cloudflare DNS
4. Click "Verify" in ZeptoMail dashboard
5. Create Mail Agent → copy Send Mail Token

### 20.3 Test Email Sending

```bash
curl -X POST "https://api.zeptomail.com/v1.1/email" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Zoho-enczapikey YOUR_SEND_MAIL_TOKEN" \
  -d '{
    "from": {"address": "noreply@lodgik.co", "name": "Lodgik"},
    "to": [{"email_address": {"address": "test@example.com", "name": "Test"}}],
    "subject": "Lodgik Test Email",
    "htmlbody": "<h1>It works!</h1><p>ZeptoMail integration is active.</p>"
  }'
```

---

## 21. Paystack Webhook Configuration

### 21.1 Configure in Paystack Dashboard

Dashboard → Settings → API Keys & Webhooks:

| Field | Value |
|-------|-------|
| Webhook URL | `https://api.lodgik.co/api/subscriptions/webhook` |

### 21.2 Events

| Event | Action |
|-------|--------|
| `charge.success` | Activate subscription + trigger merchant commission |
| `subscription.create` | Confirm subscription |
| `subscription.not_renew` | Handle cancellation |
| `subscription.disable` | Suspend tenant |
| `invoice.payment_failed` | Notify tenant |

All webhooks are verified via HMAC-SHA512 signature using `PAYSTACK_WEBHOOK_SECRET`.

---

## 22. Post-Deployment Verification

```bash
# 1. API health check
curl -s https://api.lodgik.co/api/health | python3 -m json.tool

# 2. Web apps
for d in hotel admin merchant; do
  echo "$d.lodgik.co: $(curl -s -o /dev/null -w '%{http_code}' https://$d.lodgik.co/)"
done

# 3. Swagger docs
curl -s -o /dev/null -w '%{http_code}' https://api.lodgik.co/docs/
# Expected: 200

# 4. Smoke test: register + login
curl -X POST https://api.lodgik.co/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"tenant_name":"Test Hotel","first_name":"Test","last_name":"User","email":"test@test.com","password":"SecurePass123!"}'

# 5. Mobile app: install debug APK → login → verify API connectivity
adb install dist/android/guest-debug.apk
```

---

## 23. Monitoring & Alerting

| Metric | Threshold | Severity |
|--------|-----------|----------|
| Health endpoint down | 2 consecutive failures | P1 — immediate |
| API error rate > 5% | 5-minute window | P2 — investigate |
| Response time p95 > 2s | 15-minute window | P3 — optimize |
| Disk usage > 80% | Immediate | P3 — expand |
| PostgreSQL connections > 80% | Immediate | P2 — connection leak |

Monitor via aaPanel dashboard + external service (UptimeRobot or BetterUptime) pinging `https://api.lodgik.co/api/health` every 60 seconds.

---

## 24. Backup & Restore

### 24.1 Automated PostgreSQL Backup

aaPanel → Cron → Add Cron:

```bash
# Daily at 3 AM WAT
pg_dump -U lodgik_app -Fc lodgik | gzip > /www/backup/lodgik_$(date +%Y%m%d).dump.gz

# Cleanup backups older than 30 days
find /www/backup -name "lodgik_*.dump.gz" -mtime +30 -delete
```

### 24.2 Restore

```bash
pg_restore -U lodgik_app -d lodgik -c /www/backup/lodgik_20260223.dump.gz
```

---

## 25. Rollback Procedures

### 25.1 Backend API

```bash
cd /www/wwwroot/lodgik
git log --oneline -5
git checkout <previous-commit>
cd apps/api
composer install --no-dev --optimize-autoloader
php vendor/bin/doctrine-migrations migrate prev --no-interaction
# Restart PHP-FPM via aaPanel → PHP 8.3 → Restart
```

### 25.2 Web Apps (Cloudflare Pages)

Cloudflare Dashboard → Workers & Pages → Deployments → select previous → "Rollback to this deployment". Takes effect within seconds.

### 25.3 Mobile Apps

Build previous version with incremented `versionCode`, upload as new release. For staff apps, upload previous APK to AppDistribution module.

---

## 26. Security Hardening Checklist

- [ ] aaPanel admin port changed from default 8888
- [ ] aaPanel admin password is strong and unique
- [ ] `.env` file permissions: `chmod 600`
- [ ] `APP_DEBUG=false` in production
- [ ] `expose_php = Off` in php.ini
- [ ] JWT_SECRET is 64+ random characters
- [ ] PostgreSQL listening on localhost only
- [ ] Redis bound to 127.0.0.1 with password
- [ ] HTTPS enforced with TLS 1.2+ and HSTS header
- [ ] Cloudflare proxy enabled for api.lodgik.co (DDoS protection)
- [ ] CORS restricted to known origins
- [ ] Paystack webhook HMAC verification active
- [ ] Rate limiting: auth 10/min, general 100/min
- [ ] UFW firewall: allow 22, 80, 443, aaPanel port only
- [ ] SSH key-only auth (password disabled)
- [ ] Android keystores backed up to encrypted storage
- [ ] Apple certificates and p8 key backed up
- [ ] `google-services.json` / `GoogleService-Info.plist` in .gitignore
- [ ] All mobile apps use HTTPS-only for API calls
- [ ] ZeptoMail domain verified with SPF, DKIM, DMARC

---

## 27. Mobile App Update & Release Strategy

### 27.1 Update Enforcement

| App | Policy | Mechanism |
|-----|--------|-----------|
| Guest | Soft update (show banner, allow skip) | Check AppDistribution API on launch |
| Tablet | Force update (block until updated) | Kiosk mode, AppDistribution module |
| Staff apps | Force for major, soft for patch | AppDistribution check on launch |

### 27.2 Android Staged Rollout (Guest App)

1. Upload to Play Console → Production → Staged rollout 10%
2. Monitor crash-free rate for 24 hours in Play Console → Android Vitals
3. Increase to 50% if stable
4. Full 100% after 48 hours

### 27.3 iOS Phased Release

1. Upload to App Store Connect → Submit for Review
2. After approval, select "Phased Release" (7-day rollout)
3. Monitor in App Store Connect → App Analytics

---

## 28. Appendix A — App Identity Registry

| App | Bundle ID | Android minSdk | Android targetSdk | iOS Target | Firebase |
|-----|-----------|---------------|-------------------|------------|----------|
| Guest | `com.lodgik.guest` | 24 | 35 | 16.0 | Yes |
| Tablet | `com.lodgik.tablet` | 24 | 35 | 16.0 | No |
| Security | `com.lodgik.security` | 24 | 35 | 16.0 | No |
| Reception | `com.lodgik.reception` | 24 | 35 | 16.0 | Yes |
| Housekeeping | `com.lodgik.housekeeping` | 24 | 35 | 16.0 | Yes |
| Kitchen | `com.lodgik.kitchen` | 24 | 35 | 16.0 | Yes |
| POS | `com.lodgik.pos` | 24 | 35 | 16.0 | Yes |

---

## 29. Appendix B — Complete Environment Variable Reference

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `APP_ENV` | production | Yes | Application environment |
| `APP_DEBUG` | false | Yes | Debug mode (MUST be false in production) |
| `APP_URL` | https://api.lodgik.co | Yes | API base URL |
| `DB_DRIVER` | pdo_pgsql | Yes | Database driver |
| `DB_HOST` | 127.0.0.1 | Yes | PostgreSQL host (localhost on aaPanel) |
| `DB_PORT` | 5432 | Yes | PostgreSQL port |
| `DB_NAME` | lodgik | Yes | Database name |
| `DB_USER` | lodgik_app | Yes | Database user |
| `DB_PASSWORD` | (secret) | Yes | Database password |
| `REDIS_HOST` | 127.0.0.1 | Yes | Redis host (localhost on aaPanel) |
| `REDIS_PORT` | 6379 | Yes | Redis port |
| `REDIS_PASSWORD` | (secret) | Yes | Redis password |
| `JWT_SECRET` | (64-char hex) | Yes | JWT signing secret |
| `JWT_ACCESS_TTL` | 900 | Yes | Access token TTL (seconds) |
| `JWT_REFRESH_TTL` | 2592000 | Yes | Refresh token TTL (seconds) |
| `PAYSTACK_SECRET_KEY` | sk_live_xxx | Yes | Paystack secret key |
| `PAYSTACK_PUBLIC_KEY` | pk_live_xxx | Yes | Paystack public key |
| `PAYSTACK_WEBHOOK_SECRET` | whsec_xxx | Yes | Webhook HMAC verification |
| `ZEPTOMAIL_API_KEY` | Zoho-enczapikey xxx | Yes | ZeptoMail send mail token |
| `ZEPTOMAIL_API_URL` | https://api.zeptomail.com/v1.1/email | Yes | ZeptoMail endpoint |
| `ZEPTOMAIL_FROM_ADDRESS` | noreply@lodgik.co | Yes | Sender email address |
| `ZEPTOMAIL_FROM_NAME` | Lodgik | Yes | Sender display name |
| `TERMII_API_KEY` | (key) | Yes | Termii WhatsApp API |
| `TERMII_SENDER_ID` | Lodgik | Yes | Termii sender ID |
| `FCM_SERVER_KEY` | AAAA... | Mobile | Firebase server key |
| `APNS_KEY_ID` | ABC123 | iOS | APNs key identifier |
| `APNS_TEAM_ID` | DEF456 | iOS | Apple Team ID |
| `APNS_KEY_PATH` | /www/.../apns.p8 | iOS | Path to APNs auth key |
| `STORAGE_DRIVER` | local | Yes | File storage driver |
| `STORAGE_PATH` | /www/wwwroot/lodgik/storage | Yes | Upload storage path |

---

## 30. Appendix C — CI/CD Pipeline (GitHub Actions)

```yaml
name: Lodgik CI/CD
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }

jobs:
  backend-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_DB: test, POSTGRES_USER: test, POSTGRES_PASSWORD: test }
        ports: ['5432:5432']
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with: { php-version: '8.3', extensions: pgsql, redis }
      - run: cd apps/api && composer install && php vendor/bin/phpunit

  web-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '18' }
      - run: cd apps/web && npm ci
      - run: cd apps/web && npx ng build hotel --configuration=production
      - run: cd apps/web && npx ng build admin --configuration=production
      - run: cd apps/web && npx ng build merchant --configuration=production

  mobile-android:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: '17' }
      - uses: actions/setup-node@v4
        with: { node-version: '18' }
      - run: npm install -g nativescript
      - run: |
          for app in guest tablet security reception housekeeping kitchen pos; do
            cd apps/mobile/$app && npm ci && ns build android --bundle --env.production
            cd $GITHUB_WORKSPACE
          done

  mobile-ios:
    runs-on: macos-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '18' }
      - run: npm install -g nativescript
      - run: cd apps/mobile/guest && npm ci && ns build ios --bundle --env.production

  deploy-api:
    needs: [backend-test]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: 138.197.141.195
          username: root
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /www/wwwroot/lodgik
            git pull origin main
            cd apps/api
            composer install --no-dev --optimize-autoloader
            php vendor/bin/doctrine-migrations migrate --no-interaction
            service php-fpm-83 restart

  deploy-web:
    needs: [web-build]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '18' }
      - run: cd apps/web && npm ci && npx ng build hotel --configuration=production
      - run: npx wrangler pages deploy apps/web/dist/hotel/browser --project-name=lodgik-hotel
        env: { CLOUDFLARE_API_TOKEN: '${{ secrets.CF_API_TOKEN }}' }
```

---

## 31. Appendix D — aaPanel Quick Reference

| Action | aaPanel Location / Command |
|--------|---------------------------|
| Restart Nginx | aaPanel → App Store → Nginx → Restart |
| Restart PHP-FPM | aaPanel → App Store → PHP 8.3 → Restart |
| Restart PostgreSQL | aaPanel → Database → PostgreSQL → Restart |
| Restart Redis | aaPanel → Deployment → Redis → Restart |
| View PHP error logs | aaPanel → App Store → PHP 8.3 → Logs |
| View Nginx access logs | `/www/wwwlogs/api.lodgik.co.log` |
| View Nginx error logs | `/www/wwwlogs/api.lodgik.co.error.log` |
| Edit php.ini | aaPanel → PHP 8.3 → Settings → Configuration |
| Install PHP extension | aaPanel → PHP 8.3 → Settings → Install extensions |
| Create SSL certificate | aaPanel → Website → api.lodgik.co → SSL → Let's Encrypt |
| Add cron job | aaPanel → Cron → Add Cron |
| File manager | aaPanel → Files → navigate to `/www/wwwroot/lodgik/` |
| Terminal | aaPanel → Terminal (or SSH to 138.197.141.195) |
| Firewall | aaPanel → Security → Firewall |

---

*End of Lodgik Production Deployment Runbook v3.0*
