# BorderShop Enterprise Roadmap

## Guiding Principles

1. **Zero breakage** — all changes must be additive; existing tables, routes, and UI components stay untouched. New features use new models/routes/components.
2. **Backward-compatible DB** — new columns have defaults or are nullable. No `DROP COLUMN` or `ALTER COLUMN NOT NULL` on existing tables.
3. **Feature-gated UI** — new settings/features appear only when configured; existing users see no change unless they opt in.
4. **Branch as business unit** — each branch is already a separate business. Multi-tenant will add an organization layer above branches.

---

## Phase 0 — Foundation (Weeks 1-2)

### 0.1 Health Check (already exists, enhance)
`GET /health` exists at `backend/server.js:48` and `backend/app.js:95`. Add:
- DB connection status
- Redis/memory usage
- Uptime
- Version info from `package.json`

### 0.2 Docker Compose for Backend + DB
Current `Dockerfile` at root works for production single-container. Add:

```yaml
# docker-compose.yml (root of project)
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    env_file: .env
    depends_on:
      - db
    volumes:
      - ./backend/tmp:/app/tmp

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: bordershop
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

Enables `docker compose up` for local dev and single-server production.

### 0.3 API Rate Limiting
Install `express-rate-limit`. Apply to:

- `/api/auth/*` — 10 req/min (brute force)
- `/api/install/*` — 5 req/min
- `/api/receipts/*` — 20 req/min (email spam)
- Public endpoints (`/health`, `/api/yo-pay-up`) — 30 req/min
- All other authenticated routes — 120 req/min

Middleware in `backend/lib/rateLimiter.js`, applied per-route in `app.js`.

**No user impact** — existing clients never hit these limits during normal use.

### 0.4 Swagger / OpenAPI Documentation
- Install `swagger-jsdoc` + `swagger-ui-express`
- Annotate all route files with JSDoc `@openapi` blocks
- Serve at `GET /api-docs`
- Group by resource (Sales, Products, Inventory, Auth, etc.)
- Document request/response schemas, auth header, error codes

### 0.5 Webhook System (Engine)
New models and route:

```js
// models/Webhook.js
Webhook {
  id: UUID PK,
  branchId: UUID FK,
  name: string,
  url: string (validated URL),
  events: string[] (enum: ['sale.created', 'sale.voided', 'product.low_stock', 'inventory.adjustment', 'sale.refunded']),
  secret: string (encrypted, for HMAC signing),
  isActive: boolean,
  lastTriggeredAt: date,
  failureCount: integer,
  createdBy: UUID FK
}

// routes/webhooks.js
GET    /api/webhooks
POST   /api/webhooks
PUT    /api/webhooks/:id
DELETE /api/webhooks/:id
POST   /api/webhooks/:id/test  (fires a test payload)
```

Webhook engine (`backend/services/webhookService.js`):
- On trigger events (sale created, inventory changed, etc.) — non-blocking, fire-and-forget
- POST JSON payload to each matching webhook URL with HMAC-SHA256 signature header `X-Webhook-Signature`
- Retry 3x with exponential backoff (2s, 4s, 8s)
- Track `lastTriggeredAt` and `failureCount`; disable after 10 consecutive failures
- Admin alert email when webhook disabled

**UI:** New "Webhooks" tab in `SettingsPage.tsx` — list/create/edit/delete webhooks, test button, event checkboxes, view failure count and last trigger timestamp.

**No user impact** — new optional feature; no existing code changes.

---

## Phase 1 — Core Operations (Weeks 3-5)

### 1.1 Waste / Spoilage / Breakage Tracking
New table + route separate from general inventory adjustment:

```js
// models/Waste.js
Waste {
  id: UUID PK,
  branchId: UUID FK,
  productId: UUID FK,
  variantId: UUID FK?,
  quantity: DECIMAL(14,4),
  reason: ENUM('spoilage', 'damage', 'expired', 'theft', 'breakage', 'other'),
  notes: TEXT,
  costValue: DECIMAL(10,2),  // (quantity × costPrice at time of record)
  recordedBy: UUID FK (userId),
  recordedAt: date
}
```

Route: `POST /api/waste` (deducts from inventory + records waste + audit log).
Route: `GET /api/waste` (list with filters: date range, reason, product, branch).
Route: `GET /api/waste/summary` (aggregated waste cost by reason/month).

**UI:** New "Waste & Breakage" page or section in Products. Plus a "Record Waste" button on product detail. Waste summary card in Manager/Admin dashboards.

**No user impact** — new model, new route. Existing inventory adjustment unchanged.

### 1.2 Tax Configuration (in Settings)
Currently `Branch.taxRate` is a single percentage. Replace/extend with structured tax:

```js
// models/TaxRate.js
TaxRate {
  id: UUID PK,
  branchId: UUID FK (nullable — global if null),
  name: string (e.g. "VAT 16%", "Zero Rated", "Exempt"),
  rate: DECIMAL(5,2),
  type: ENUM('inclusive', 'exclusive'),
  isDefault: boolean,
  appliesTo: JSONB (categories or product IDs — null means all),
  isActive: boolean
}
```

- Add `taxRateId` FK to `Product` (nullable, defaults to branch default)
- `Sale.taxAmount` already exists — calculation logic in `sales.js` picks product's `taxRateId`
- Settings page gets a "Tax Rates" section: list/create/edit with name, rate, type, applicability

**Backward compatible:**
- `Branch.taxRate` remains for fallback if no `TaxRate` records exist
- New `taxRateId` column on `Product` has `defaultValue: null`
- Sale calculation: if product has `taxRateId`, use that; else fall back to `Branch.taxRate`

### 1.3 Cash Management (Till / Float / Reconciliation)

```js
// models/CashRegister.js
CashRegister {
  id: UUID PK,
  branchId: UUID FK,
  name: string (e.g. "Till 1", "Main Register"),
  isActive: boolean
}

// models/CashSession.js
CashSession {
  id: UUID PK,
  registerId: UUID FK,
  openedBy: UUID FK (userId),
  closedBy: UUID FK (userId, nullable),
  openingBalance: DECIMAL(10,2),
  closingBalance: DECIMAL(10,2, nullable),
  expectedBalance: DECIMAL(10,2, nullable),  // opening + cash sales - cash expenses
  difference: DECIMAL(10,2, nullable),
  openedAt: date,
  closedAt: date (nullable),
  notes: TEXT
}

// models/CashTransaction.js
CashTransaction {
  id: UUID PK,
  sessionId: UUID FK,
  type: ENUM('sale', 'expense', 'payout', 'topup', 'adjustment'),
  amount: DECIMAL(10,2),
  reference: string (saleId, expenseId, etc.),
  reason: TEXT,
  createdBy: UUID FK,
  createdAt: date
}
```

Routes:
- `POST /api/cash/register` — CRUD for registers
- `POST /api/cash/session/open` — open a session with opening float
- `POST /api/cash/session/close` — close session, record closing float, calculate difference
- `GET /api/cash/session/active` — get current open session
- `GET /api/cash/sessions` — history with filters

**Key integration:** When a cash sale is completed, auto-record a `CashTransaction.type = 'sale'`. When a cash expense is recorded (Phase 1.4), auto-record a `CashTransaction.type = 'expense'`.

**UI:** "Cash Management" page — open float, close float, view session history, till differences. Dashboard widget showing current float status.

### 1.4 Expense Tracking

```js
// models/Expense.js
Expense {
  id: UUID PK,
  branchId: UUID FK,
  category: ENUM('utilities', 'rent', 'salaries', 'supplies', 'maintenance', 'transport', 'marketing', 'other'),
  amount: DECIMAL(10,2),
  description: TEXT,
  paidBy: UUID FK (userId),
  paidAt: date,
  receiptUrl: string (nullable),
  approvedBy: UUID FK (userId, nullable),
  currency: STRING(3),
  exchangeRate: DECIMAL(18,6),
  baseAmount: DECIMAL(10,2),  // amount converted to branch base currency
  createdAt: date
}
```

Routes: `CRUD /api/expenses`. `GET /api/expenses/summary` (by category, by month).

**UI:** "Expenses" page — list with filters, add expense form, category breakdown chart.

---

## Phase 2 — Product & Inventory Enhancement (Weeks 6-8)

### 2.1 Composite / Kit Products (Bundles)

```js
// models/ProductBundle.js
ProductBundle {
  id: UUID PK,
  productId: UUID FK (the bundle "parent" product),
  componentProductId: UUID FK,
  componentVariantId: UUID FK?,
  quantity: DECIMAL(14,4) (how many of component in one bundle),
  isActive: boolean
}
```

- `Product.isBundle` boolean flag on existing Product model
- When selling a bundle, auto-deduct component quantities from inventory
- Bundle price can be independent of sum-of-parts or calculated dynamically
- BOM (bill of materials) view in product detail

**UI:** New "Bundle Components" tab in ProductModal when `isBundle` is toggled. Add/remove components with quantities.

### 2.2 Serial Number / Batch Tracking

```js
// models/SerialNumber.js
SerialNumber {
  id: UUID PK,
  productId: UUID FK,
  branchId: UUID FK,
  serialNumber: string UNIQUE,
  batchNumber: string (nullable),
  expiryDate: date (nullable),
  status: ENUM('in_stock', 'sold', 'voided', 'returned'),
  saleItemId: UUID FK (nullable, set when sold),
  costPrice: DECIMAL(10,2),
  soldPrice: DECIMAL(10,2, nullable),
  receivedAt: date,
  soldAt: date (nullable)
}
```

- New `Product.trackingMethod` ENUM: `'quantity' | 'serial' | 'batch'` (default `'quantity'`)
- Restock flow: if `trackingMethod = 'serial'`, show serial number input
- Sale flow: if `trackingMethod = 'serial'`, show serial number selection/picker
- Quick sale mode (skip serial) allowed with config setting

**UI:** Product form gets a "Tracking" section — select Quantity / Serial Number / Batch. Serial numbers page for lookup, scanning, history.

### 2.3 Multi-Warehouse / Locations

```js
// models/Warehouse.js
Warehouse {
  id: UUID PK,
  branchId: UUID FK,
  name: string,
  location: TEXT,
  isActive: boolean
}

// models/WarehouseZone.js
WarehouseZone {
  id: UUID PK,
  warehouseId: UUID FK,
  name: string (e.g. "Aisle 3", "Shelf B2"),
  code: string (e.g. "A3-B2")
}

// Add to Inventory:
// warehouseId: UUID FK (nullable)
// zoneId: UUID FK (nullable)
// locationCode: string (nullable, e.g. "A3-B2-01")
```

- Existing `Inventory` records with `warehouseId = null` = "main stock" (backward compatible)
- Transfer between warehouses within same branch
- Transfer between warehouses across branches (reuses existing inventory transfer flow)

**UI:** "Warehouses" section in Branches page. Product inventory view shows stock per warehouse.

---

## Phase 3 — Customer & Financial (Weeks 9-11)

### 3.1 Customer Deposits / Buy Now Pay Later

```js
// models/Customer.js
Customer {
  id: UUID PK,
  branchId: UUID FK,
  firstName: string,
  lastName: string,
  phone: string (unique per branch),
  email: string,
  idNumber: string (national ID/passport),
  creditLimit: DECIMAL(10,2),
  currentBalance: DECIMAL(10,2),
  notes: TEXT,
  createdAt: date
}

// models/CustomerDeposit.js
CustomerDeposit {
  id: UUID PK,
  customerId: UUID FK,
  amount: DECIMAL(10,2),
  type: ENUM('deposit', 'payment', 'credit', 'refund'),
  referenceType: ENUM('sale', 'manual'),
  referenceId: UUID (saleId or null),
  notes: TEXT,
  recordedBy: UUID FK,
  recordedAt: date
}

// models/Layaway.js
Layaway {
  id: UUID PK,
  branchId: UUID FK,
  customerId: UUID FK,
  saleId: UUID FK?,
  totalAmount: DECIMAL(10,2),
  depositAmount: DECIMAL(10,2),
  balance: DECIMAL(10,2),
  installmentCount: integer,
  installmentAmount: DECIMAL(10,2),
  frequency: ENUM('weekly', 'biweekly', 'monthly'),
  nextDueDate: date,
  status: ENUM('active', 'completed', 'defaulted', 'cancelled'),
  startedAt: date,
  completedAt: date (nullable),
  notes: TEXT
}
```

**Modifications to Sale flow:**
- POS gets "Customer" lookup (search by phone or name)
- Payment type gets new options: `'deposit'`, `'credit'`
- If customer selected and partial payment: auto-create layaway
- Credit payment type checks `creditLimit` and reduces `currentBalance`
- Layaway due-date reminder via Brevo email

**UI:** New "Customers" page (CRUD, search, transaction history, credit balance). "Layaway" section in Customers or Sales. POS modal gets customer selector.

### 3.2 Returns / RMA (Return Merchandise Authorization)

```js
// models/Return.js
Return {
  id: UUID PK,
  branchId: UUID FK,
  saleId: UUID FK,
  customerId: UUID FK?,
  returnNumber: string (auto-generated, e.g. "RET-001"),
  reason: ENUM('defective', 'wrong_item', 'customer_decision', 'expired', 'damaged', 'other'),
  status: ENUM('pending', 'approved', 'rejected', 'completed'),
  notes: TEXT,
  approvedBy: UUID FK?,
  createdBy: UUID FK,
  createdAt: date,
  processedAt: date (nullable)
}

// models.ReturnItem.js
ReturnItem {
  id: UUID PK,
  returnId: UUID FK,
  saleItemId: UUID FK,
  productId: UUID FK,
  variantId: UUID FK?,
  quantityReturned: DECIMAL(14,4),
  refundAmount: DECIMAL(10,2),
  restock: boolean (should item go back to inventory?),
  condition: ENUM('new', 'used', 'damaged'),
  serialNumber: UUID FK (if serial tracked)
}
```

- Return automatically: generates refund payment, restocks (if `restock = true`), sets `paymentStatus = 'refunded'` on related payments, creates audit log
- Partial returns allowed (some items in a sale)
- Restock with serial number validation
- Return flow accessible from Sales History page

**UI:** "Returns" page — list with status filter, create return from sale, approve/reject workflow. Return Reason dropdown + restock toggle per item.

---

## Phase 4 — Platform & Integration (Weeks 12-14)

### 4.1 Third-Party Integration Framework
Add `backend/services/integrationService.js` as a pluggable adapter system:

```js
// models/Integration.js
Integration {
  id: UUID PK,
  branchId: UUID FK,
  name: string,
  provider: ENUM('quickbooks', 'zoho_books', 'sage', 'xero', 'shopify', 'woocommerce', 'custom'),
  config: JSONB (encrypted),
  isActive: boolean,
  lastSyncAt: date,
  syncDirection: ENUM('import', 'export', 'bidirectional'),
  syncFrequency: ENUM('manual', 'hourly', 'daily'),
  lastStatus: string
}
```

Each provider implements a standard interface:
- `connect(config)` — test and store credentials
- `syncProducts()` — push/pull products
- `syncSales()` — push sales
- `syncInventory()` — push stock levels
- `disconnect()` — clean up

Start with **QuickBooks Online** (via OAuth2) as first integration, then **Shopify** (REST API).

**UI:** "Integrations" tab in Settings — list connected integrations, connect flow (OAuth redirect or manual config), manual sync button, sync status/history.

### 4.2 Webhook Events for Integration
Wire webhook engine into all trigger points:
- `sale.created` — on sale completion
- `sale.voided` — on sale void
- `product.created`, `product.updated` — on product changes
- `inventory.adjusted` — on inventory changes
- `inventory.low_stock` — when stock drops below min
- `return.created`, `return.completed` — on returns

### 4.3 ERP Export / Reporting
- Date-range CSV export for Sales, Inventory, Expenses, Customers
- QuickBooks-compatible CSV export format
- Summary PDF reports (daily sales, monthly P&L summary)

---

## Phase 5 — Multi-Tenant Architecture (Weeks 15-18)

### 5.1 The Model

```
┌─────────────────────────────────────────────┐
│                 Organization                 │
│  (id, name, slug, email, phone, isActive)    │
├─────────────────────────────────────────────┤
│                     │ has_many               │
│               ┌─────┴──────┐                  │
│               │  Branch    │  (already exists) │
│               │            │                  │
│         ┌─────┴──────┐                        │
│         │   User     │  (already exists)       │
│         └────────────┘                        │
└─────────────────────────────────────────────┘
```

New model:

```js
// models/Organization.js
Organization {
  id: UUID PK,
  name: string,
  slug: string UNIQUE,
  email: string,
  phone: string,
  address: TEXT,
  logo: string?,
  isActive: boolean,
  settings: JSONB (org-level defaults for tax, currency, etc.),
  createdAt: date
}
```

**Migrations (backward compatible):**
- Add `Organization.organizationId` UUID FK to `Branch` (nullable, defaults to null = single-tenant mode)
- Add `Organization.organizationId` UUID FK to `User` (nullable)
- All existing data works as-is with `organizationId = null`
- Soft isolation via `organizationId` on all queries — no separate databases

### 5.2 Auth Changes
- JWT payload gets `orgId` field
- Login validates user belongs to organization
- Admin becomes "org admin" — manages their org only
- Super admin role added for platform-level management (manage orgs, view all)

### 5.3 Data Isolation Strategy

| Pattern | How |
|---------|-----|
| **Read isolation** | All queries filter by `organizationId` (via Sequelize scopes or middleware) |
| **Branch ownership** | Each branch belongs to one org; users see only their org's branches |
| **Cross-org protection** | No route allows fetching data across org boundaries |
| **Super admin** | Special role bypasses org filter for platform ops (billing, support) |

Implementation approach:
1. Express middleware `attachOrgScope` reads `req.user.orgId` and sets it on `req`
2. Sequelize `defaultScope` on each model filters by `organizationId`
3. Super admin routes use `.unscoped()` to bypass
4. New `POST /api/auth/switch-org` for users belonging to multiple organizations (rare but supported)

### 5.4 Registration Flow
- Public registration at `GET /api/install/org` (new org + admin user + first branch)
- Existing `/api/install/setup` remains for single-tenant mode
- Org gets a unique slug (e.g. `acme-corp`) used in subdomain routing

### 5.5 URL / Subdomain Strategy
- Multi-tenant uses subdomain: `acme.api.bordershop.app`
- Single-tenant (existing) stays on current domain
- Nginx/Caddy routes `*.api.bordershop.app` → extract subdomain → set `X-Organization` header

### 5.6 Migration Path for Existing Users
Existing installations auto-create a single `Organization` record:
- Name from `Setting.company.name` or "My Business"
- All branches linked to this org
- All users linked to this org
- Single-tenant behavior preserved — zero configuration change

---

## Phase 6 — Polish & Production (Weeks 19-20)

- **API Versioning** — `/api/v1/sales`, `/api/v2/sales` for breaking changes
- **Database Backup** — `GET /api/backup` (admin only) — triggers pg_dump, returns download
- **Database Restore** — `POST /api/restore` with upload validation
- **Health endpoint enhancement** — add memory, uptime, version, DB pool stats
- **Load testing** — k6 scripts for critical paths (POS transaction, analytics query)
- **Performance** — Redis caching for analytics queries, product listings, settings
- **Official API client** — npm package `@bordershop/api-client` for third-party devs

---

## File Change Summary

| Phase | New Files | Modified Files |
|-------|-----------|----------------|
| 0.1 | — | `backend/app.js` |
| 0.2 | `docker-compose.yml` | — |
| 0.3 | `backend/lib/rateLimiter.js` | `backend/app.js`, `backend/package.json` |
| 0.4 | `backend/lib/swagger.js` | `backend/app.js`, all route files (JSDoc), `backend/package.json` |
| 0.5 | `models/Webhook.js`, `routes/webhooks.js`, `services/webhookService.js` | `backend/app.js`, `models/index.js`, `ui/src/pages/SettingsPage.tsx` |
| 1.1 | `models/Waste.js`, `routes/waste.js` | `models/index.js`, `backend/app.js`, `ui/src/pages/ProductsPage.tsx` (add button) |
| 1.2 | `models/TaxRate.js`, `routes/tax.js` | `models/Product.js` (+ `taxRateId`), `routes/sales.js` (tax calc), `models/index.js`, `backend/app.js`, `ui/src/pages/SettingsPage.tsx` |
| 1.3 | `models/CashRegister.js`, `models/CashSession.js`, `models/CashTransaction.js`, `routes/cash.js` | `models/index.js`, `backend/app.js`, `routes/sales.js` (auto cash tx on cash sale), `ui` (new page) |
| 1.4 | `models/Expense.js`, `routes/expenses.js` | `models/index.js`, `backend/app.js`, `ui` (new page) |
| 2.1 | `models/ProductBundle.js`, `routes/bundles.js` | `models/Product.js` (+ `isBundle`), `routes/sales.js` (bundle deduction), `models/index.js`, `ui/src/components/ProductModal.tsx` |
| 2.2 | `models/SerialNumber.js`, `routes/serials.js` | `models/Product.js` (+ `trackingMethod`), `routes/inventory.js` (restock serial input), `routes/sales.js` (serial assignment), `models/index.js`, `ui` |
| 2.3 | `models/Warehouse.js`, `models/WarehouseZone.js`, `routes/warehouses.js` | `models/Inventory.js` (+ `warehouseId`, `zoneId`, `locationCode`), `routes/inventory.js`, `models/index.js`, `ui` |
| 3.1 | `models/Customer.js`, `models/CustomerDeposit.js`, `models/Layaway.js`, `routes/customers.js`, `routes/layaways.js` | `models/Payment.js` (+ `customerId`, `depositId`), `routes/sales.js` (customer + credit/deposit payment flow), `models/index.js`, `backend/app.js`, `ui/src/components/PaymentModal.tsx` (customer selector + credit payment), `ui` (Customers page) |
| 3.2 | `models/Return.js`, `models/ReturnItem.js`, `routes/returns.js` | `models/index.js`, `backend/app.js`, `ui/src/pages/SalesHistoryPage.tsx` (return button), `routes/sales.js` (refund payment logic), `ui` (Returns page) |
| 4.1 | `models/Integration.js`, `services/integrationService.js`, `routes/integrations.js`, providers `lib/integrations/quickbooks.js`, `lib/integrations/shopify.js` | `models/index.js`, `backend/app.js`, `ui/src/pages/SettingsPage.tsx` (Integrations tab) |
| 4.2 | — | `backend/services/webhookService.js` (wire trigger events), multiple routes (fire webhooks) |
| 5.1 | `models/Organization.js`, `lib/tenant.js` (scope middleware) | `models/Branch.js`, `models/User.js` (+ `organizationId`), `models/index.js`, `backend/app.js`, `backend/lib/auth.js` (+ org context), ALL route files (org scope) |
| 5.4 | — | `backend/routes/install.js` (+ org registration) |
| 6 | — | `backend/app.js` (versioning, backup), `backend/routes/backup.js`, `backend/package.json` |

---

## Timeline Summary

```
Wk 1-2  │ Phase 0: Health check, Docker, Rate limit, Swagger, Webhooks
Wk 3-5  │ Phase 1: Waste, Tax config, Cash mgmt, Expenses
Wk 6-8  │ Phase 2: Kits, Serials, Multi-warehouse
Wk 9-11 │ Phase 3: Customers, Deposits/Layaway, Returns/RMA
Wk 12-14│ Phase 4: Integrations (QB, Shopify), Webhook events, ERP export
Wk 15-18│ Phase 5: Multi-tenant (Organization model, scoping, migration)
Wk 19-20│ Phase 6: Versioning, Backup/Restore, Redis caching, Load test
```

Each phase can be released independently in order. Phases 1 and 2 can overlap (different developers).
