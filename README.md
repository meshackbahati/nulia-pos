# RetailPro POS

RetailPro is a high-performance, resilient, and multi-platform Point of Sale (POS) ecosystem designed for cross-border trade and modern retail environments. Built with a local-first philosophy, it ensures your business stays operational even in zero-connectivity environments.

## Key Features

*   **Multi-Platform Native Support:**
    *   **Mobile (Android):** High-performance Capacitor-based app with native MLKit barcode scanning.
    *   **Desktop (Windows/Linux):** Electron-based terminal with silent thermal printing and HID scanner isolation.
    *   **Web:** Fully responsive PWA (Progressive Web App).
*   **Offline-First Architecture:**
    *   Full product catalog caching via IndexedDB (Dexie).
    *   Sales queueing during network outages with automatic background synchronization.
*   **Advanced Financial Engine:**
    *   **Split-Currency Payments:** Accept multiple currencies in a single transaction (e.g., USD + KES + UGX).
    *   **Daily Exchange Rates:** Real-time rate management with automatic whole-number rounding.
    *   **Idempotent API:** Prevents duplicate sales or stock deductions during network retries.
*   **Intelligence Node (The Ledger):**
    *   Uneditable transaction history for Admins and Managers.
    *   Personnel efficiency leaderboards and branch performance rankings.
    *   Professional PDF Intelligence Report generation.

## 🏗️ Technical Architecture

*   **Frontend:** React 19, Vite, Tailwind CSS (Clay Design — warm paper, soft extrusion, mixed with flat for dense POS grid).
*   **Backend:** Next.js 14 App Router (single API), Sequelize ORM (PostgreSQL) — Express bridge via `src/lib/express-bridge.js` for Vercel serverless.
*   **Mobile:** Capacitor + MLKit Vision.
*   **Desktop:** Electron + Native Printer Bridge (warm worker, 7s cap).

## 🛠️ Getting Started.

Refer to [QUICKSTART.md](./QUICKSTART.md) for detailed installation and deployment instructions.

## 📄 License.

Proprietary Software - All Rights Reserved.
