# Nulia POS

Sell smarter. High-performance, offline-first POS for retail and cross-border trade. One stack for Web, Android, and Desktop. Every sale is currency-aware, every receipt is printable, every move is audited.

![Nulia Logo](ui/public/logo.svg)

## Features

- **Multi-Platform:** Web PWA (React 19 + Vite), Android (Capacitor + MLKit Vision), Desktop (Electron 41 + silent thermal printing + HID scanner).
- **Offline-First:** Dexie IndexedDB catalog, sales queue, background sync - works with zero connectivity.
- **Split-Currency:** Pay with multiple currencies per sale (KES/USD/UGX/TZS), daily exchange rates, whole-number rounding.
- **Idempotent API:** `Idempotency-Key` prevents duplicate sales and stock deductions on retry.
- **Ledger & Intelligence:** Uneditable `audit_logs`, staff leaderboards, branch rankings, PDF reports.
- **Inventory & Commerce:** Warehouses, serials, bundles, purchase orders, transfers, suppliers, customers, layaways, returns, expenses, waste, cash registers.
- **Integrations:** Jumia Vendor, Uber Direct, JumiaPay wallet, Cloudinary, Brevo.

## Tech Stack

- **Frontend:** React 19, Vite 7, Tailwind CSS 4, Dexie, Capacitor 8, Electron 41, Workbox PWA.
- **Backend:** Next.js 14 App Router, Express bridge (`src/lib/express-bridge.js`), Sequelize 6, PostgreSQL 16, `pg`.
- **Infra:** Vercel serverless + crons, Docker Compose, Cloudinary, Brevo, Daraja.

## Quick Start

```bash
git clone https://github.com/meshackbahati/nulia-pos.git
cd nulia-pos
```

### Backend (Next.js, single API)

```bash
cd backend-nextjs
npm install
cp .env.example .env.local
# fill DATABASE_URL (postgres://...?sslmode=require)
# fill JWT_SECRET (>=32 chars), ENCRYPTION_KEY (>=32 chars)
npm run db:migrate   # creates tables + indexes
npm run build        # must pass with no errors
npm run dev          # http://localhost:3000  API at /api/*
```

Health: `curl http://localhost:3000/health` → `{"status":"OK"}`

Create first business:

```bash
curl -X POST http://localhost:3000/api/install/setup \
  -H "Content-Type: application/json" \
  -d '{"branch":{"name":"Main"},"admin":{"email":"admin@test.com","password":"Strong123!","firstName":"Admin"}}'
```

### Frontend (Web, Android, Desktop)

```bash
cd ../ui
npm install
cp .env.example .env  # VITE_API_URL=http://localhost:3000/api
npm run build         # tsc -b + vite build, PWA dist/
npm run dev           # http://localhost:5173
```

**Web PWA:** `npm run build` outputs `dist/` - deploy to Vercel/Netlify/Nginx.

**Android (Capacitor):**

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug   # testing
./gradlew assembleRelease # release - sign with uber-apk-signer
# Signed APK needs JDK21: /tmp/jdk-21.0.12.1+1/bin/java
# Sign: uber-apk-signer -a app-release-unsigned.apk --ks nulia-release.jks --ksAlias nulia --ksPass nulia2026 --ksKeyPass nulia2026 -o /tmp/nulia-apk
```

Requires Android SDK, `ANDROID_HOME`, JDK 21 for `compileSdk 36`.

**Desktop (Electron):**

```bash
npm run build
npx electron-builder --win --publish never      # Windows nsis: dist-electron/Nulia Setup 1.12.0.exe
npx electron-builder --linux pacman --publish never # Arch: nulia-1.12.0-x64.pkg.tar.zst
npx electron-builder --linux deb --publish never    # Debian: nulia_1.12.0_amd64.deb
npx electron-builder --linux AppImage --publish never # AppImage: nulia-1.12.0-x86_64.AppImage
# or all linux: npx electron-builder --linux --publish never
```

Linux fix included: `ozone-platform-hint auto`, `WaylandWpColorManager` disabled, GPU fallback - fixes Arch Wayland error `Unable to set image transfer function`. Set `NULIA_DISABLE_GPU=0` to keep GPU. Fontconfig 2.15 warning is harmless.

## Verification

Both must pass with no errors:

```bash
cd backend-nextjs && npm run build
cd ui && npm run build
```

## Releases

Prebuilt binaries are attached to GitHub Releases `v1.12.0` (Windows, Arch, Debian, AppImage, Android APK). See Releases tab.

## Project Structure

```
backend-nextjs/  # Next.js API, Sequelize, migrations
ui/              # React + Vite + Electron + Capacitor
  electron/      # main.cjs, preload.cjs
  android/       # Capacitor Android
docs/            # guides
```

## License

MIT - see `LICENSE`.
