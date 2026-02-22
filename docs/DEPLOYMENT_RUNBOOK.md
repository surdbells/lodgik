# Lodgik — Production Deployment Runbook

**Version:** 2.0  
**Date:** 2026-02-22  
**Status:** Production Ready  
**Covers:** PHP API, Angular Web Apps, NativeScript Mobile Apps, Infrastructure  

---

## Table of Contents

1. Infrastructure Requirements
2. Repository Structure
3. Environment Configuration
4. Database Setup (PostgreSQL)
5. Backend API Deployment (PHP / Slim / Doctrine)
6. Web Application Deployment (Angular / Cloudflare Pages)
7. Mobile Application Builds (NativeScript / Angular)
8. Mobile App Distribution — Android (Google Play)
9. Mobile App Distribution — iOS (App Store)
10. Internal App Distribution (AppDistribution Module)
11. Push Notification Setup (FCM / APNs)
12. Nginx / Reverse Proxy Configuration
13. Docker Deployment (Alternative)
14. Post-Deployment Verification
15. Webhook Configuration
16. Monitoring, Logging & Alerting
17. Database Maintenance & Backups
18. Rollback Procedures
19. Security Hardening Checklist
20. Mobile App Update Strategy
21. Appendix A — App Identity Registry
22. Appendix B — CI/CD Pipeline Definition

---

## 1. Infrastructure Requirements

### 1.1 Server Requirements

| Component | Minimum (MVP) | Recommended (Production) |
|-----------|--------------|--------------------------|
| API Server | 2 vCPU, 4GB RAM, 40GB SSD | 4 vCPU, 8GB RAM, 80GB SSD |
| PostgreSQL | 2 vCPU, 4GB RAM, 50GB SSD | 4 vCPU, 16GB RAM, 200GB SSD |
| Redis | 1 vCPU, 1GB RAM | 2 vCPU, 4GB RAM |
| Web (Nginx) | Included on API server | Separate 1 vCPU, 1GB RAM |
| Build Server (CI) | 4 vCPU, 8GB RAM | 8 vCPU, 16GB RAM (for NativeScript builds) |

### 1.2 Software Dependencies — Server

| Software | Version | Purpose |
|----------|---------|---------|
| PHP | 8.3+ | Backend API runtime |
| Composer | 2.x | PHP dependency management |
| PostgreSQL | 14+ | Primary database (driver: `pdo_pgsql`) |
| Redis | 7.0+ | Caching, rate limiting, session management |
| Nginx | 1.24+ | Reverse proxy, SSL termination, static file serving |
| Node.js | 18+ LTS | Frontend build toolchain |
| npm | 9+ | Frontend dependency management |

### 1.3 Software Dependencies — Mobile Build Environment

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18+ LTS | NativeScript CLI and build toolchain |
| NativeScript CLI | 8.6+ | `npm install -g nativescript` |
| Java JDK | 17 (LTS) | Android SDK requirement |
| Android SDK | API Level 35 (compileSdk) | Android build target |
| Android Build Tools | 35.0.0 | APK/AAB compilation |
| Gradle | 8.x | Android build system (bundled with NativeScript) |
| Xcode | 15+ | iOS build (macOS only) |
| CocoaPods | 1.14+ | iOS native dependency management |
| macOS | 14+ (Sonoma) | Required for iOS builds |

### 1.4 External Service Accounts

| Service | Purpose | Required | Credential Location |
|---------|---------|----------|---------------------|
| Paystack | Subscription billing | Yes | `.env`: PAYSTACK_SECRET_KEY |
| Termii | WhatsApp messaging | Yes (production) | `.env`: TERMII_API_KEY |
| SMTP Provider | Email (password reset, invitations) | Yes | `.env`: MAIL_* |
| Firebase (FCM) | Android push notifications | Yes (mobile) | `google-services.json` |
| Apple APNs | iOS push notifications | Yes (iOS) | APNs key in App Store Connect |
| Google Play Console | Android app distribution | Yes (mobile) | Service account JSON key |
| Apple App Store Connect | iOS app distribution | Yes (mobile) | App Store Connect API key |
| Cloudflare | Web app hosting + CDN + DNS | Yes | Cloudflare API token |

---

## 2. Repository Structure

```
lodgik/
├── apps/
│   ├── api/                           # PHP Backend API
│   │   ├── config/                    # DI container, routes, middleware
│   │   │   ├── app.php                # DB config (pdo_pgsql driver)
│   │   │   ├── dependencies.php       # Service container
│   │   │   ├── routes.php             # 40 module route loaders
│   │   │   └── middleware.php         # Middleware chain
│   │   ├── migrations/                # Doctrine migrations (24 files)
│   │   ├── public/                    # Web root
│   │   │   ├── index.php             # Application entry point
│   │   │   └── docs/                 # Swagger UI + openapi.yaml
│   │   ├── src/
│   │   │   ├── Entity/               # 113 Doctrine entities
│   │   │   ├── Enum/                 # 22 enums (UserRole, BookingStatus, etc.)
│   │   │   ├── Module/               # 40 modules (Service + Controller + routes)
│   │   │   ├── Middleware/            # Auth, Tenant, Role, CORS, Rate, Feature
│   │   │   └── Helper/               # JWT, Paystack, Response helpers
│   │   ├── tests/                     # PHPUnit (448 tests, 1,120 assertions)
│   │   ├── .env                       # Environment config (NEVER in git)
│   │   └── .env.example               # Template for .env
│   │
│   ├── web/                           # Angular web monorepo
│   │   ├── angular.json               # Workspace config (3 projects + 2 libraries)
│   │   └── projects/
│   │       ├── hotel/                 # Hotel management web app (48 pages)
│   │       ├── admin/                 # Super admin web app (17 pages)
│   │       ├── merchant/              # Merchant partner portal (11 pages)
│   │       ├── shared/                # @lodgik/shared component library
│   │       └── charts/               # @lodgik/charts visualization library
│   │
│   └── mobile/                        # NativeScript + Angular mobile apps
│       ├── guest/                     # Guest mobile app (21 screens)
│       │   ├── App_Resources/
│       │   │   ├── Android/           # AndroidManifest, icons, splash, app.gradle
│       │   │   └── iOS/              # Info.plist, Assets.xcassets, build.xcconfig
│       │   ├── src/                   # Angular components, services, routes
│       │   ├── nativescript.config.ts # id: com.lodgik.guest
│       │   ├── package.json          # @nativescript/angular, firebase, biometric
│       │   ├── webpack.config.js
│       │   └── tailwind.config.js
│       ├── tablet/                    # In-room tablet (id: com.lodgik.tablet)
│       ├── security/                  # Security guard (id: com.lodgik.security)
│       ├── reception/                 # Front desk (id: com.lodgik.reception)
│       ├── housekeeping/              # Housekeeping (id: com.lodgik.housekeeping)
│       ├── kitchen/                   # Kitchen display (id: com.lodgik.kitchen)
│       └── pos/                       # POS terminal (id: com.lodgik.pos)
│
└── docs/                              # Documentation
    ├── openapi.yaml                   # API spec (461 endpoints, 39 tags)
    ├── PRD.md, FSD.md, SRS.md
    └── DEPLOYMENT_RUNBOOK.md          # This file
```

---

## 3. Environment Configuration

### 3.1 Backend Environment Variables

Create `.env` in `apps/api/` (copy from `.env.example`):

```bash
# ─── Application ─────────────────────────────────
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.lodgik.io

# ─── Database (PostgreSQL) ───────────────────────
DB_DRIVER=pdo_pgsql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lodgik
DB_USER=lodgik_app
DB_PASSWORD=<strong-password-64-chars>
DB_CHARSET=utf8

# ─── Redis ───────────────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<redis-password>

# ─── JWT ─────────────────────────────────────────
JWT_SECRET=<64-char-random-string>
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=2592000

# ─── Paystack ────────────────────────────────────
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxx
PAYSTACK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

# ─── Termii (WhatsApp) ──────────────────────────
TERMII_API_KEY=<api-key>
TERMII_SENDER_ID=Lodgik

# ─── Email (SMTP) ───────────────────────────────
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=noreply@lodgik.io
MAIL_PASSWORD=<password>
MAIL_FROM_NAME=Lodgik
MAIL_FROM_ADDRESS=noreply@lodgik.io

# ─── Storage ────────────────────────────────────
STORAGE_DRIVER=local
STORAGE_PATH=/var/www/lodgik/storage
```

### 3.2 Mobile App API Configuration

Each mobile app's API service must point to production:

```typescript
// apps/mobile/{app}/src/app/services/*-api.service.ts
private readonly API_BASE_URL = 'https://api.lodgik.io/api';
```

---

## 4. Database Setup (PostgreSQL)

```bash
# Install PostgreSQL 16
sudo apt install postgresql-16 postgresql-contrib-16
sudo systemctl enable postgresql && sudo systemctl start postgresql

# Create database and user
sudo -u postgres psql << 'SQL'
CREATE USER lodgik_app WITH PASSWORD '<strong-password>';
CREATE DATABASE lodgik OWNER lodgik_app ENCODING 'UTF8';
GRANT ALL PRIVILEGES ON DATABASE lodgik TO lodgik_app;
\c lodgik
GRANT ALL ON SCHEMA public TO lodgik_app;
SQL

# Production tuning (/etc/postgresql/16/main/postgresql.conf)
# listen_addresses = 'localhost'
# max_connections = 200
# shared_buffers = 1GB           (25% of RAM)
# effective_cache_size = 3GB     (75% of RAM)
# log_min_duration_statement = 1000

# Run Doctrine migrations
cd /var/www/lodgik/apps/api
php vendor/bin/doctrine-migrations migrate --no-interaction
```

---

## 5. Backend API Deployment

```bash
# Install PHP + extensions
sudo apt install php8.3-fpm php8.3-pgsql php8.3-redis php8.3-mbstring \
  php8.3-xml php8.3-curl php8.3-zip php8.3-intl php8.3-bcmath php8.3-gd

# Deploy application
cd /var/www && git clone https://github.com/surdbells/lodgik.git
cd lodgik/apps/api
composer install --no-dev --optimize-autoloader --no-interaction

# Set permissions
chown -R www-data:www-data /var/www/lodgik
chmod 600 /var/www/lodgik/apps/api/.env

# Run migrations and verify
php vendor/bin/doctrine-migrations migrate --no-interaction
php vendor/bin/phpunit  # 448 tests, 1120 assertions, 0 failures
```

---

## 6. Web Application Deployment (Angular → Cloudflare Pages)

### 6.1 Build

```bash
cd /var/www/lodgik/apps/web && npm ci
npx ng build hotel --configuration=production
npx ng build admin --configuration=production
npx ng build merchant --configuration=production
```

### 6.2 Cloudflare Pages Setup

Create three Pages projects in Cloudflare Dashboard → Workers & Pages:

| Project | Build Command | Output Directory | Custom Domain |
|---------|--------------|-----------------|---------------|
| lodgik-hotel | `npx ng build hotel --configuration=production` | `dist/hotel/browser` | hotel.lodgik.io |
| lodgik-admin | `npx ng build admin --configuration=production` | `dist/admin/browser` | admin.lodgik.io |
| lodgik-merchant | `npx ng build merchant --configuration=production` | `dist/merchant/browser` | merchant.lodgik.io |

Set **Root Directory** to `apps/web` for all three.

Create `apps/web/projects/{app}/src/_redirects` for SPA routing:

```
/*    /index.html   200
```

---

## 7. Mobile Application Builds (NativeScript + Angular)

### 7.1 App Inventory

| App | Bundle ID | NS Version | Angular | Screens | Native Plugins |
|-----|-----------|-----------|---------|---------|---------------|
| Guest | `com.lodgik.guest` | 9.0 | 20.2 | 21 | Firebase, Camera, Biometric, ImagePicker, LocalNotifications, Tailwind |
| Tablet | `com.lodgik.tablet` | 9.0 | 20.2 | 11 | Tailwind (kiosk mode, no Firebase) |
| Security | `com.lodgik.security` | 8.6 | 17.0 | 10 | Camera |
| Reception | `com.lodgik.reception` | 8.6 | 17.0 | 10 | Camera, Firebase |
| Housekeeping | `com.lodgik.housekeeping` | 8.6 | 17.0 | — | Camera, Firebase |
| Kitchen | `com.lodgik.kitchen` | 8.6 | 17.0 | — | Camera, Firebase |
| POS | `com.lodgik.pos` | 8.6 | 17.0 | — | Camera, Firebase |

### 7.2 Build Environment Setup

```bash
# Install NativeScript CLI
npm install -g nativescript

# Install Java JDK 17
sudo apt install openjdk-17-jdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

# Install Android SDK
mkdir -p ~/android-sdk/cmdline-tools
cd ~/android-sdk/cmdline-tools
wget https://dl.google.com/android/repository/commandlinetools-linux-latest.zip
unzip commandlinetools-linux-latest.zip && mv cmdline-tools latest

export ANDROID_HOME=~/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

# Install required SDK components
sdkmanager --licenses
sdkmanager "platforms;android-35" "build-tools;35.0.0" "platform-tools"
sdkmanager "extras;google;m2repository" "extras;android;m2repository"

# Verify
ns doctor android
```

**iOS (macOS only):** Requires Xcode 15+, CocoaPods (`sudo gem install cocoapods`).

### 7.3 Firebase Configuration

For apps with `nativescript-plugin-firebase`:

```bash
# Download from Firebase Console → Project Settings → Your Apps
# Android: place google-services.json in App_Resources/Android/
# iOS: place GoogleService-Info.plist in App_Resources/iOS/
# CRITICAL: Add both files to .gitignore
```

### 7.4 Build Android (Debug)

```bash
cd apps/mobile/guest
npm ci
ns build android --bundle
# Output: platforms/android/app/build/outputs/apk/debug/app-debug.apk
```

### 7.5 Build Android (Release AAB for Play Store)

```bash
cd apps/mobile/guest
npm ci
ns build android --release \
  --key-store-path ~/keys/lodgik-guest.keystore \
  --key-store-password "$KEYSTORE_PASSWORD" \
  --key-store-alias lodgik-guest \
  --key-store-alias-password "$KEY_PASSWORD" \
  --aab \
  --bundle
# Output: platforms/android/app/build/outputs/bundle/release/app-release.aab
```

### 7.6 Build All Android Apps (Script)

```bash
#!/bin/bash
# build-android-all.sh
KEYSTORE_DIR=~/keys
APPS=(guest tablet security reception housekeeping kitchen pos)

for app in "${APPS[@]}"; do
  echo "=== Building $app ==="
  cd /var/www/lodgik/apps/mobile/$app && npm ci
  ns build android --release \
    --key-store-path $KEYSTORE_DIR/lodgik-$app.keystore \
    --key-store-password "$KEYSTORE_PASSWORD" \
    --key-store-alias lodgik-$app \
    --key-store-alias-password "$KEY_PASSWORD" \
    --aab --bundle
  echo "=== $app complete ==="
done
```

### 7.7 Build iOS (Release)

```bash
# macOS only, with Xcode + provisioning profiles installed
cd apps/mobile/guest && npm ci
ns build ios --release --for-device --bundle \
  --provision "Lodgik Guest Distribution"
# Output: platforms/ios/build/Release-iphoneos/guest.ipa

# Upload via Xcode Organizer or:
xcrun altool --upload-app -f platforms/ios/build/Release-iphoneos/guest.ipa \
  -u "apple-id@email.com" -p "@keychain:AC_PASSWORD"
```

### 7.8 Android Build Configuration

Located in `App_Resources/Android/app.gradle`:

```gradle
android {
  compileSdkVersion 35
  buildToolsVersion "35"
  defaultConfig {
    minSdkVersion 24          // Android 7.0 Nougat minimum
    targetSdkVersion 35       // Android 15
    versionCode 1             // INCREMENT for every Play Store upload
    versionName "1.0.0"       // User-visible version
  }
}
```

### 7.9 iOS Build Configuration

Located in `App_Resources/iOS/build.xcconfig`:

```
DEVELOPMENT_TEAM = YOUR_TEAM_ID;
CODE_SIGN_IDENTITY = iPhone Distribution;
ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
IPHONEOS_DEPLOYMENT_TARGET = 16.0;
```

Required `Info.plist` keys for apps using camera/biometric:

```xml
<key>NSCameraUsageDescription</key>
<string>Lodgik needs camera access to scan documents and QR codes</string>
<key>NSFaceIDUsageDescription</key>
<string>Use Face ID for quick and secure login</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Select photos for your profile or documents</string>
```

### 7.10 Android Permissions Reference

| Permission | Apps | Purpose |
|-----------|------|---------|
| `INTERNET` | All | API communication |
| `ACCESS_NETWORK_STATE` | All | Connectivity detection |
| `READ_EXTERNAL_STORAGE` | Guest | Image picker |
| `WRITE_EXTERNAL_STORAGE` | Guest | Download resources |
| `CAMERA` | Guest, Security, Reception | Document scan, QR codes |
| `USE_BIOMETRIC` | Guest | Fingerprint/face auth |
| `RECEIVE_BOOT_COMPLETED` | Staff apps | Background notification service |
| `VIBRATE` | All | Notification feedback |

---

## 8. Mobile App Distribution — Android (Google Play)

### 8.1 Keystore Generation

**CRITICAL: If lost, you cannot update the app. Back up to encrypted cold storage.**

```bash
mkdir -p ~/keys
for app in guest tablet security reception housekeeping kitchen pos; do
  keytool -genkey -v \
    -keystore ~/keys/lodgik-$app.keystore \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -alias lodgik-$app \
    -storepass "$KEYSTORE_PASSWORD" \
    -keypass "$KEY_PASSWORD" \
    -dname "CN=Lodgik, OU=Engineering, O=Lodgik Ltd, L=Lagos, ST=Lagos, C=NG"
done
```

### 8.2 Play Store Distribution Strategy

| App | Google Play Track | Visibility |
|-----|------------------|------------|
| Guest | Production | Public (all users) |
| Tablet | Internal | Organization only (MDM/sideload preferred) |
| Security | Internal | Organization only |
| Reception | Internal | Organization only |
| Housekeeping | Internal | Organization only |
| Kitchen | Internal | Organization only |
| POS | Internal | Organization only |

### 8.3 Version Management

```
versionCode = MAJOR * 10000 + MINOR * 100 + PATCH
versionName = "MAJOR.MINOR.PATCH"

Example: v1.3.2 → versionCode: 10302, versionName: "1.3.2"
```

Increment `versionCode` in `App_Resources/Android/app.gradle` before every Play Store upload.

---

## 9. Mobile App Distribution — iOS (App Store)

### 9.1 Apple Developer Setup

1. Enroll in Apple Developer Program ($99/year)
2. Create App IDs for all 7 apps with required capabilities (Push, Camera, Face ID)
3. Create Distribution Certificate + Provisioning Profiles
4. Configure `build.xcconfig` with `DEVELOPMENT_TEAM`

### 9.2 App Store Submission Checklist

- [ ] App icon: 1024x1024px (Assets.xcassets)
- [ ] Launch screen: LaunchScreen.storyboard
- [ ] Screenshots: 6.7" iPhone, 6.5" iPhone, 12.9" iPad
- [ ] Description, keywords, support URL, privacy policy URL
- [ ] Privacy nutrition labels completed
- [ ] All `Info.plist` usage descriptions included
- [ ] No private API usage
- [ ] IPHONEOS_DEPLOYMENT_TARGET = 16.0

---

## 10. Internal App Distribution (AppDistribution Module)

Lodgik includes a built-in AppDistribution module (14 endpoints) for staff app distribution without Play Store review cycles.

### 10.1 Flow

1. Build staff app release APK
2. Upload via Admin API: `POST /api/admin/app-distribution/releases`
3. AppRelease entity stores version, platform, download URL, notes
4. Staff apps check `GET /api/app-distribution/check-update` on launch
5. AppDownloadLog tracks installations

### 10.2 Distribution Matrix

| App | Play Store | App Store | AppDistribution (internal) |
|-----|-----------|-----------|--------------------------|
| Guest | Public release | Public release | No |
| Tablet | MDM / Sideload | MDM / Sideload | Yes (primary) |
| Staff apps (5) | Internal track | TestFlight | Yes (primary) |

---

## 11. Push Notification Setup (FCM / APNs)

### 11.1 Firebase Cloud Messaging (Android)

```bash
# 1. Create Firebase project at console.firebase.google.com
# 2. Register each Android app by bundle ID
# 3. Download google-services.json per app
# 4. Place in: apps/mobile/{app}/App_Resources/Android/
# 5. Get Server Key → store as FCM_SERVER_KEY in .env
```

### 11.2 Apple Push Notifications (iOS)

```bash
# 1. Create APNs Key (p8 file) in Apple Developer portal
# 2. Store Key ID, Team ID, and key file path in .env:
APNS_KEY_ID=ABC123
APNS_TEAM_ID=DEF456
APNS_KEY_PATH=/etc/lodgik/apns-auth-key.p8
```

### 11.3 Device Token Flow

1. App requests push permission → OS returns token
2. App sends token to `POST /api/notifications/device-token`
3. DeviceToken entity stores: user_id, token, platform (android/ios)
4. Backend sends push via FCM/APNs when notifications are triggered

---

## 12. Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name api.lodgik.io;

    ssl_certificate     /etc/ssl/lodgik/fullchain.pem;
    ssl_certificate_key /etc/ssl/lodgik/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    root /var/www/lodgik/apps/api/public;
    index index.php;

    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location /docs { try_files $uri $uri/ =404; }
    location / { try_files $uri /index.php$is_args$args; }
    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
    location ~ /\. { deny all; }
    client_max_body_size 12M;
}
server { listen 80; server_name api.lodgik.io; return 301 https://$host$request_uri; }
```

SSL: `sudo certbot --nginx -d api.lodgik.io`

---

## 13. Docker Deployment (Alternative)

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: ./apps/api
    ports: ["8080:80"]
    environment:
      - DB_DRIVER=pdo_pgsql
      - DB_HOST=db
      - DB_PORT=5432
      - DB_NAME=lodgik
      - DB_USER=lodgik_app
      - DB_PASSWORD=${DB_PASSWORD}
      - REDIS_HOST=redis
    depends_on: [db, redis]
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: lodgik
      POSTGRES_USER: lodgik_app
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes: [db_data:/var/lib/postgresql/data]
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    restart: unless-stopped

volumes:
  db_data:
```

---

## 14. Post-Deployment Verification

```bash
# API health
curl -s https://api.lodgik.io/api/health | python3 -m json.tool

# Web apps
for d in hotel admin merchant; do
  echo "$d: $(curl -s -o /dev/null -w '%{http_code}' https://$d.lodgik.io/)"
done

# Smoke test: register → login → dashboard
curl -X POST https://api.lodgik.io/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"tenant_name":"Test Hotel","first_name":"Test","last_name":"User","email":"test@test.com","password":"Pass123!"}'

# Mobile verification
adb install apps/mobile/guest/platforms/android/app/build/outputs/apk/debug/app-debug.apk
# Verify: launch → login → API connectivity → push registration
```

---

## 15. Webhook Configuration

Paystack Dashboard → Settings → Webhooks:

**URL:** `https://api.lodgik.io/api/subscriptions/webhook`

**Events:** charge.success, subscription.create, subscription.not_renew, subscription.disable, invoice.payment_failed

---

## 16. Monitoring & Alerting

| Metric | Threshold | Severity |
|--------|-----------|----------|
| Health endpoint down | 2 consecutive failures | P1 — page on-call |
| API error rate > 5% | 5-minute window | P2 — Slack alert |
| Response time p95 > 2s | 15-minute window | P3 — investigate |
| Disk usage > 80% | Immediate | P3 — expand storage |
| PostgreSQL connections > 80% | Immediate | P2 — connection leak |

---

## 17. Database Maintenance

```bash
# Daily backup (cron)
0 3 * * * postgres pg_dump -Fc lodgik | gzip > /backups/lodgik_$(date +\%Y\%m\%d).dump.gz
0 4 * * * root find /backups -name "lodgik_*.dump.gz" -mtime +30 -delete

# Restore
pg_restore -d lodgik -c /backups/lodgik_20260222.dump.gz

# Weekly vacuum
sudo -u postgres psql -d lodgik -c "VACUUM ANALYZE;"
```

---

## 18. Rollback Procedures

### 18.1 Backend

```bash
git checkout <previous-commit>
cd apps/api && composer install --no-dev --optimize-autoloader
php vendor/bin/doctrine-migrations migrate prev --no-interaction
sudo systemctl restart php8.3-fpm nginx
```

### 18.2 Web Apps (Cloudflare Pages)

Cloudflare Dashboard → Workers & Pages → Deployments → select previous → "Rollback to this deployment". Instant.

### 18.3 Mobile Apps

Cannot rollback on user devices. Build previous version with incremented `versionCode`, upload as new release. For internal apps, upload previous APK to AppDistribution module.

---

## 19. Security Hardening Checklist

- [ ] `.env` permissions 600, excluded from git
- [ ] `APP_DEBUG=false`, `expose_php = Off`
- [ ] JWT_SECRET is 64+ random characters
- [ ] PostgreSQL listening on localhost only
- [ ] Redis password protected
- [ ] HTTPS enforced with TLS 1.2+ and HSTS
- [ ] CORS origins restricted
- [ ] Paystack webhook HMAC verification enabled
- [ ] Rate limiting active (auth: 10/min, general: 100/min)
- [ ] UFW firewall: allow 22, 80, 443 only
- [ ] SSH key-only access (password auth disabled)
- [ ] Android keystores backed up to encrypted cold storage
- [ ] Apple certificates backed up
- [ ] `google-services.json` / `GoogleService-Info.plist` in .gitignore
- [ ] All mobile apps use HTTPS-only API calls

---

## 20. Mobile App Update Strategy

### 20.1 Update Enforcement

| App | Policy | Mechanism |
|-----|--------|-----------|
| Guest | Soft update (prompt, allow skip) | In-app banner via AppDistribution check |
| Tablet | Force update (block until updated) | Kiosk mode, AppDistribution module |
| Staff apps | Force for major, soft for patch | AppDistribution check on launch |

### 20.2 Android Staged Rollout (Guest App)

1. Release to 10% → monitor 24hrs
2. Increase to 50% if crash-free
3. Full 100% rollout after 48hrs

---

## 21. Appendix A — App Identity Registry

| App | Bundle ID | minSdk | targetSdk | iOS Target |
|-----|-----------|--------|-----------|------------|
| Guest | `com.lodgik.guest` | 24 | 35 | 16.0 |
| Tablet | `com.lodgik.tablet` | 24 | 35 | 16.0 |
| Security | `com.lodgik.security` | 24 | 35 | 16.0 |
| Reception | `com.lodgik.reception` | 24 | 35 | 16.0 |
| Housekeeping | `com.lodgik.housekeeping` | 24 | 35 | 16.0 |
| Kitchen | `com.lodgik.kitchen` | 24 | 35 | 16.0 |
| POS | `com.lodgik.pos` | 24 | 35 | 16.0 |

---

## 22. Appendix B — CI/CD Pipeline

```yaml
name: Lodgik CI/CD
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }

jobs:
  backend-test:
    runs-on: ubuntu-latest
    services:
      postgres: { image: 'postgres:16', env: { POSTGRES_DB: test, POSTGRES_USER: test, POSTGRES_PASSWORD: test }, ports: ['5432:5432'] }
      redis: { image: 'redis:7-alpine', ports: ['6379:6379'] }
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
        with: { distribution: 'temurin', java-version: '17' }
      - uses: actions/setup-node@v4
        with: { node-version: '18' }
      - run: npm install -g nativescript
      - run: |
          for app in guest tablet security reception housekeeping kitchen pos; do
            cd apps/mobile/$app && npm ci
            ns build android --bundle --env.production
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

  deploy-web:
    needs: [backend-test, web-build]
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

*End of Lodgik Production Deployment Runbook v2.0*
