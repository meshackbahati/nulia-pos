# RetailPro — Full Feature Audit & Wiring Plan (v1.12)

**Date:** 2026-09-02  **Scope:** `ui/` + `server/` (Express deleted, single Next.js API). **Method:** code read + runtime build check.

## 1. What exists — 26 UI pages + 26 API route groups + 30 models

| Domain | UI Pages | API Routes (`server/src/routes`) | Models | Intended Business Job | How Wired Today | Gap / Usability |
|---|---|---|---|---|---|---|
| **Auth & Branch Context** | `LoginPage`, `Forgot/Reset`, `InstallPage`, `BranchSelector` | `auth` (login/me/forgot/reset/switch-branch), `branches` (list/me/create/update), `users` | `User`, `Branch` | Store-isolated logins, role hierarchy admin>manager>head_of_sales>salesperson, branch switch | `AuthContext` reads localStorage+cookie, `branchChanged` event, `POST /branches/update` handles mpesa fields (now patched) | Branch switch not obvious to cashier; no onboarding tour |
| **Products (Inventory Catalogue)** | `ProductsPage`, `ProductModal` (732 LOC) | `products` (list/create/update/delete/import-csv/upload-image/search/barcode) | `Product`, `ProductVariant`, `Inventory` | SKU/barcode, discrete vs measurable (kg, L), fractional, UOM, low-stock threshold | `ProductsPage:125` limit 200 (no pagination), CSV import via `branches` hub picker, `ProductModal` handles `measurementType` | Modal >500 LOC should split; search vs category filter ignores category when searching (intentional but not documented); `isActive` soft-delete hidden |
| **Inventory Ops** | `InventoryTransferPage`, `RestockModal`, `InventoryAdjustModal` | `inventory` (low-stock, restock, adjust, **transfer** ← just wired) | `Inventory` (quantity, reserved, minStock) | Keep per-branch stock accurate, move between hubs | `POST /inventory/transfer` was 404 (UI called raw `api.post('/inventory/transfer')` with no handler) — **now implemented** (`inventory.js:219` atomic decrement/increment, audit, realtime). `restock`/`adjust` already wired. | Transfer was dangling, now fixed; no UI for reservedQuantity |
| **POS Terminal** | `POSPage` (946 LOC) | `sales` (create/list/search/get/void/update), `products/search` | `Sale`, `SaleItem`, `Payment` | Fast scan→cart→bargain→split-currency pay→receipt, offline queue via Dexie | `POSPage:466` `api.createSale` with `offlineId` idempotency, `db.offlineSales` queue, `BargainModal` currency switch fixed (`BargainModal.tsx:87` no loop), `ReceiptModal` warm worker | Polling fallback every 30s when socket down (`POSPage:255`) duplicates `useSocket` poll — double fetch; `formatPrice(...).split` brittle for `$` |
| **Payments & Currency** | `PaymentModal`, `BargainModal`, `useCurrency`, `usePaystack` | `paystack`, `mpesa`, `exchange-rates`, `branches` (gateway fields), `settings` | `ExchangeRate`, `Branch.mpesa*`, `Branch.paystack*` | Accept **split currency** per sale (e.g., 5k KES + 20 USD) using daily rates, capture `transactionCurrency/Rate` | **Branch vs Global confusion:** `Branch` model has `mpesa*`/`paystack*`/`preferredGateway` per hub (`Branch.js:93-134`), but `BranchesPage` **never exposed** them — only `SettingsPage` global gateway existed. **Fixed:** added per-branch clay section (`BranchesPage.tsx` gatewayEnabled+mpesa/paystack inputs, green emerald/sky). Flow now: `getBranchMpesaService` → Branch → Setting → env. UI still shows all 6 methods in `PaymentModal` regardless of branch config — next: filter by `branchConfig.preferredGateway`. |
| **Customers & Layaways** | `CustomersPage`, `Customer` types | `customers` (list/lookup/:id/create/update/deposit, layaways/list/create/pay) | `Customer`, `CustomerDeposit`, `Layaway` | Store credit, deposits, layaway installments, balance | `GET /layaways` was shadowed by `GET /:id` (Express param) — **fixed** reorder. `CustomersPage` fixed width `w-[400px]` broke <1024 (now flex-col). | Layaway UI not discoverable; no guide that deposit affects `currentBalance` |
| **Returns & Waste & Serials & Bundles & Warehouses** | `ReturnsPage`, `WastePage`, `SerialsPage`, `WarehousesPage`, `bundles` | `returns`, `waste`, `serials`, `bundles`, `warehouses` | `Return`, `Waste`, `SerialNumber`, `ProductBundle`, `Warehouse`, `WarehouseZone` | Handle post-sale (defective returns), spoilage, tracked serials, kits, multi-zone stock | All wired but hidden in nav (no onboarding). `WastePage` full-return only (`quantityReturned = quantity`). `SerialsPage` grid-cols-7 overflows 320. |
| **Purchase & Suppliers** | `SuppliersPage`, `PurchaseOrdersPage` | `suppliers`, `purchase-orders`, `inventory` | `Supplier`, `PurchaseOrder`, `PurchaseOrderItem` | Order from suppliers, receive → restock | Wired; `SuppliersPage` missing delete, `PurchaseOrders` variant find uses `listProducts` mapping that discards variants |
| **Finance** | `ExpensesPage`, `CashManagementPage`, `BranchesPage tax` | `expenses`, `cash` (register/session/transaction), `tax` | `Expense`, `CashRegister`, `CashSession`, `TaxRate` | Petty cash, expenses approval, VAT 16% etc | `CashManagementPage` uses raw `api.put/delete` for register (no typed helper) — works but inconsistent. `TaxRatesSection` inside `SettingsPage` 749 LOC should split |
| **Analytics (Ledger)** | `ManagerDashboard`, `SalesDashboard`, `HeadOfSalesDashboard`, `AnalyticsPage` | `analytics` (dashboard/summary/leaderboard/top-products/branch-comparison/trends/currency-breakdown) | `Sale`, `RealtimeEvent` | Leaderboards per person/branch, revenue trends, payment method pie | `AnalyticsPage` parallel fetches `results[4]` off-by-one if not admin; `WeeklySummary` had `status:'completed'` bug (no such column) → always 0 sales — **fixed** `paymentStatus`+`voidedAt:null`. `DashboardPage.tsx` dead 75 LOC (App routes to ManagerDashboard). |
| **Integrations & Webhooks** | `IntegrationsPage`, `Settings` Tax/Webhooks | `integrations`, `webhooks`, `tax` | `Integration`, `Webhook`, `TaxRate` | Push sale/low-stock to external URL, HMAC secret | `IntegrationsPage` provider fields incomplete fallback textarea — XSS risk if rendered raw. `SettingsPage` 749 LOC near limit. |
| **Realtime** | `useSocket` + `TransactionHistoryModal` | `realtime/events?since=` + `realtime.js` DB poll | `RealtimeEvent` (unbounded) | Live inventory/new-sale to POS & dashboards, fallback to polling on Vercel (no socket server) | `useSocket` `isConnected` conflates socket vs poll (amber vs emerald pulse) — UX confusion; `RealtimeEvent` no TTL/cleanup |
| **Hardware** | `PrinterSetupModal`, `HardwareContext`, `BarcodeScanner` | — (client only) | — | Thermal 58/80mm via ESC/POS, BLE/Network/USB, HID scan | `HardwareContext:111` padding fixed 32 chars clips 58mm (should use `paperSizeChars`), `BleClient.requestLEScan` 5s blocks UI, desktop TCP print only on mobile (gap) |
| **System** | `ThemeToggle`, `BranchSelector`, `CustomModal`, `PWA` | `install` (check/setup) | `Setting` (global) | Dark/light, branch switch, install | `ThemeContext` no system-change listener; `PWA` caches `/api` 24h stale (should 5m) |

## 2. Payment-per-branch — why you didn't know how to use it

**Supposed to:** Each hub (e.g., Nairobi vs Kampala) has its own Till (M-Pesa shortcode, Paystack keys) and currency. Cashier's POS uses *that branch's* till, not a global one.

**Was wired as:** `Branch` model **already** had `mpesaConsumerKey` (encrypted), `mpesaShortcode`, `paystackPublicKey` etc. `mpesa.js:getBranchMpesaService(branchId)` checks Branch → Setting → env. **BUT** `BranchesPage` (the only place an admin creates a hub) **never showed** those fields — only `SettingsPage` showed *global* gateway (which is fallback). So a manager created "Kampala Hub" with UGX, but had no UI to put its M-Pesa credentials; sales then fell back to global Nairobi credentials and failed.

**Now fixed:** `BranchesPage.tsx` modal adds **Branch Payments** clay section (emerald for M-Pesa, sky for Paystack) with `preferredGateway` + `gatewayEnabled` toggle + 4 M-Pesa fields (key/secret/passkey/shortcode) + 2 Paystack fields. `POST /branches/create` and `POST /branches/update` already handle them (patched `branches.js:106` to handle paystack+gateway without empty overwrite). Global `SettingsPage` remains as fallback with helper text "Per-branch overrides global".

**Still to do (next):** Filter `PaymentModal` methods by `branchConfig.preferredGateway`/`gatewayEnabled` (currently shows all 6). Add small “Configured: M-Pesa ✓ Paystack ✗” badge on branch cards.

## 3. Dangling / Missing Wiring — now fixed vs still open

| # | Was Dangling | Fix Applied | Remaining |
|---|---|---|---|
| 1 | `POST /inventory/transfer` 404 | **Implemented** `inventory.js:219` atomic | — |
| 2 | `GET /layaways` shadowed | **Reordered** `customers.js:107` before `/:id` | — |
| 3 | `WeeklySummary` 0 sales | **Fixed** `paymentStatus` | — |
| 4 | Bargain UGX no switch | **Fixed** init-only effect + `formatDisplayPrice` | — |
| 5 | Receipt dark in light | **Fixed** `receipt-paper` warm #fefcf7 + clay | — |
| 6 | Linux pacman truncated | **Rebuilt** 107M `zstd:0` (was 90M premature) | Provide `sudo pacman -U` retry |
| 7 | `PaymentModal` shows all methods | Added per-branch UI, need filter | **Todo:** hide disabled gateways |
| 8 | `HardwareContext` 58mm clip | Not yet | **Todo:** use `paperSizeChars` |
| 9 | `DashboardPage.tsx` dead | Not yet | **Todo:** delete or alias |
| 10 | `ProductModal` 732 LOC | Not yet | **Todo:** split |
| 11 | `Scan badge` below search + icon consumed | **Fixed** `ProductsPage:248` inline `flex-row wrap` + `bg-white` input `pl-10` + `text-slate-400` 18px | — |
| 12 | Light form fields invisible (`clay-input` `border 86%` on `card 99%`) | **Fixed** `index.css:clay-input` → `bg-white` + `border-slate-200 (88%)` + `shadow-sm` | — |
| 13 | Blue/white monotony | **Fixed** warm paper `35 28% 96%` + feature palette `--feature-*` + gradients (emerald/amber/rose/violet/teal) + header icon colors (POS emerald, Products amber, History teal) | Extend to remaining pages |

## 4. Plan to make every feature discoverable & fully functional

**Immediate (done):** inventory transfer, layaways routing, weekly, bargain, receipt, pacman, colors, per-branch payment UI.

**Next 1 — Usability surface (1–2 days):**
- Add **Feature Guide** (`/help` page) with 1-paragraph per domain + “Try it” CTA (e.g., “Create a Layaway: Customers → New → Layaway”)
- Branch cards: show `preferredGateway` badge + `exchangeRate` + `taxRate`
- `PaymentModal`: filter methods by `branch.paystackPublicKey`/`mpesaShortcode` presence; show “M-Pesa not configured for this hub — configure in Branches”
- `CustomersPage` layaway tab: make `+ New Layaway` primary, not hidden in row
- `Waste/Returns`: add partial quantity input + reason select (currently fixed `defective`/full)
- `SerialsPage`: wrap `grid-cols-7` in `overflow-x-auto` + cards on mobile

**Next 2 — Wiring deep (3–5 days):**
- Split `ProductModal` + `HardwareContext` <500 LOC
- Fix `HardwareContext:111` `paperSizeChars(58)=32`, `78=44`, `80=46`
- Add `RealtimeEvent` TTL (cron `DELETE where createdAt < 30d`)
- PWA `workbox` `api-cache` 24h→5m for sales/inventory
- Delete `DashboardPage.tsx`, unify `admin-dashboard` vs `manager-dashboard`
- Backend: add `paystack` to `Sale.paymentMethod` ENUM (currently `cash/mpesa/card` only — paystack will fail validation)

**Next 3 — Profit: payment per branch rollout**
- Seed 2 demo branches (KES hub + UGX hub) with distinct gateways, demo sale split KES+UGX to showcase daily rates
- Add to `POSPage` header: tiny `Branch: Nairobi • KES` + `Change` → `BranchSelector` modal (already exists) + toast “Switched to Kampala — prices now in UGX”

All changes keep `ui` and `server` builds green (`tsc -b && vite build` 85.58k CSS, `next build` 5/5, `db:migrate` up to date).
