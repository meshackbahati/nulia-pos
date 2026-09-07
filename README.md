# Nulia POS - Open Source Edition

Nulia is a high-performance, resilient, multi-platform POS for modern retail and cross-border trade. Offline-first, split-currency, and built for zero-connectivity operation. This repository is the **open-source, single-tenant, self-hosted** edition (MIT). The proprietary multi-tenant cloud edition lives on the `proprietary` branch in the private repo.

![Nulia Logo](ui/public/logo.svg)

## What is Nulia?

Sell smarter. One stack for **Web, Android, and Desktop**. Every sale is currency-aware (KES/USD/UGX/TZS), every receipt is printable, every inventory move is audited.

- **Mobile (Android):** Capacitor + MLKit Vision barcode scanning.
- **Desktop (Windows/Linux):** Electron + silent thermal printing + HID scanner isolation. Linux fix for Wayland fontconfig included.
- **Web:** Fully responsive PWA (React 19 + Vite + Tailwind Clay Design).

## Key Features

- **Offline-First:** IndexedDB (Dexie) catalog cache, sales queue + background sync.
- **Split-Currency:** Multiple currencies per sale, daily exchange rates, whole-number rounding.
- **Idempotent API:** `Idempotency-Key` header prevents duplicate sales/stock deductions.
- **Ledger:** Uneditable `audit_logs`, leaderboards, branch rankings, PDF Intelligence Reports.
- **Integrations:** Jumia Vendor, Uber Direct, JumiaPay wallet, warehouses, serials, bundles.

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Dexie, Capacitor, Electron 41.
- **Backend:** Next.js 14 App Router, Express bridge, Sequelize 6 ORM, PostgreSQL 16, `pg` driver.
- **Infra:** Vercel (serverless, crons), Docker Compose, Cloudinary, Brevo.

## Getting Started (Local)

1. **Clone:**
```bash
git clone https://github.com/meshackbahati/nulia-pos.git
cd nulia-pos
```
2. **Backend:**
```bash
cd backend-nextjs
npm install
cp .env.example .env.local  # fill DATABASE_URL + JWT_SECRET + ENCRYPTION_KEY
npm run db:migrate
npm run build   # must pass - no JWT throw during build
npm run dev     # http://localhost:3000
```
3. **Frontend:**
```bash
cd ../ui
npm install
npm run build
npm run dev          # Vite
npx cap sync android # Android
npm run electron:build  # desktop - Windows .exe, Debian .deb, Arch .pkg.tar.zst, AppImage
```

## Build Verification

Both builds must pass with no errors:
```bash
cd backend-nextjs && npm run build
cd ui && npm run build
```

Linux desktop fix: Wayland color manager disabled, GPU fallback, NULIA_DISABLE_GPU=0 to re-enable. Fontconfig 2.15 warning is harmless.

## License

MIT - see `LICENSE`. Commercial warranty and multi-tenant cloud are proprietary.
