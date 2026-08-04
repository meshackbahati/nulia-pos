# BorderShop POS — Backend (Next.js / Vercel)

Next.js port of the BorderShop POS Express backend, designed to run on **Vercel (serverless)**.

The entire Express app (`src/lib/app.js`) is bridged into a Next.js App Router catch-all route, so **every endpoint works exactly as before** — JSON bodies, urlencoded forms, and `multipart/form-data` file uploads (multer) are all supported. Existing cron jobs run as Vercel Cron triggers instead of `node-cron`.

---

## 1. Architecture

```
backend-nextjs/
├── src/
│   ├── app/
│   │   ├── [[...path]]/route.js            # Root catch-all: /, /health, /api-docs, non-/api paths
│   │   └── api/
│   │       ├── [...path]/route.js          # Bridges ALL /api/* requests to Express
│   │       └── cron/                       # Vercel Cron triggers (replace node-cron)
│   │           ├── daily-product-status/
│   │           ├── weekly-summary/
│   │           └── hosting-invoice/
│   ├── lib/            # Database, auth, email (Brevo), encryption, cloudinary, rate limiters, etc.
│   ├── models/         # Sequelize models (identical to Express backend)
│   ├── routes/         # Express routers — ALL original endpoints (identical to backend/routes)
│   └── services/       # Business logic (notifications, invoices, webhooks, integrations)
├── next.config.mjs     # serverComponentsExternalPackages: sequelize, pg, pdfkit
├── vercel.json         # Cron schedules
├── .env.example        # All environment variables documented
└── package.json
```

**How the bridge works** (`src/lib/express-bridge.js`):

1. Next.js receives the Web `Request` and calls `runExpress(req, app)`.
2. The bridge builds a Node-style `req` (a real `Readable` stream so `express.json()`, `express.urlencoded()` and `multer` work) and an Express-compatible `res`.
3. The Express app handles routing exactly as in the original backend.
4. The bridge converts the Express `res` into a `NextResponse`.

---

## 2. Prerequisites

- **Node.js ≥ 18**
- **PostgreSQL database** (recommended: [Neon](https://neon.tech), [Supabase](https://supabase.com), or any managed Postgres with SSL)
- A **Vercel** account for deployment
- Optional accounts: **Brevo** (email), **Cloudinary** (product images), **Paystack** (payments), **Safaricom Daraja** (M-Pesa)

---

## 3. Database Setup

The schema is created via migrations — the migration files live in `../backend/migrations` (the same DB used by the production backend). The Next.js port does **not** own schema creation; it expects an existing, migrated database.

### Option A — Use the existing production database

Point `***REMOVED***` at your existing BorderShop PostgreSQL database. All tables already exist; nothing to migrate.

### Option B — Provision a fresh database

1. Create a new PostgreSQL database (e.g. on Neon/Supabase).
2. From the `../backend` folder, run the migrations against the **new** `***REMOVED***`:

   ```bash
   cd ../backend
   cp .env.example .env          # set ***REMOVED*** to the NEW database
   npm install
   npm run db:migrate            # sequelize-cli + SQL migrations
   ```

3. (Optional) seed demo data:

   ```bash
   npm run db:seed
   ```

4. Point this project's `***REMOVED***` at the same new database.

> **Important:** The migration files themselves are not bundled into this Next.js project. Keep them with the Express backend, or copy `backend/migrations` into this repo and add a `db:migrate` script if you want this project to own migrations.

### Serverless pool sizing

In `src/lib/database.js` the Sequelize pool is already optimized for serverless (`max: 1` per function instance). If you hit connection errors on a provider that keeps instances warm, you can raise it slightly:

```js
pool: { max: 2, min: 0, acquire: 30000, idle: 10000 }
```

---

## 4. Environment Variables

Copy `.env.example` to `.env.local` for local dev, or set them in the Vercel project dashboard.

| Variable | Required | Description |
|---|---|---|
| `***REMOVED***` | ✅ | PostgreSQL connection string, e.g. `***REMOVED_DB_URL***user:pass@host:5432/bordershop?sslmode=require` |
| `***REMOVED***` | ✅ | Secret for signing JWTs (generate a long random string) |
| `JWT_EXPIRES_IN` | | JWT lifetime, default `7d` |
| `***REMOVED***` | ✅ | Key used to decrypt stored secrets (Settings/Integrations). **Must be 32 chars** for AES-256; changing it breaks decryption of stored secrets |
| `CRON_SECRET` | ✅ | Guards `/api/cron/*` endpoints. Vercel Cron sends it as `Authorization: Bearer <CRON_SECRET>` automatically |
| `***REMOVED***` | | Brevo transactional email API key (falls back to DB settings) |
| `BREVO_SENDER_EMAIL` | | From address for emails |
| `BREVO_SENDER_NAME` | | From name for emails, default `BorderShop POS` |
| `ENABLE_EMAILING` | | `true`/`false`, default `true` |
| `FRONTEND_URL` | | Frontend URL used for password-reset links, e.g. `https://your-app.vercel.app` |
| `CLOUDINARY_CLOUD_NAME` | | Cloudinary cloud name (product image uploads) |
| `CLOUDINARY_API_KEY` | | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | | Cloudinary API secret |
| `PAYSTACK_PUBLIC_KEY` | | Paystack public key |
| `VITE_PAYSTACK_PUBLIC_KEY` | | Same as above (kept for compatibility) |
| `MPESA_ENVIRONMENT` | | `sandbox` or `production` |
| `DEFAULT_MPESA_CONSUMER_KEY` | | M-Pesa Daraja consumer key fallback |
| `DEFAULT_MPESA_CONSUMER_SECRET` | | M-Pesa Daraja consumer secret fallback |
| `DEFAULT_MPESA_PASSKEY` | | M-Pesa passkey fallback |
| `DEFAULT_MPESA_SHORTCODE` | | M-Pesa shortcode fallback |
| `MPESA_CALLBACK_BASE_URL` | | Base URL where M-Pesa sends callbacks, e.g. `https://your-app.vercel.app` |
| `DEFAULT_CURRENCY` | | Fallback base currency, default `KES` |
| `DEFAULT_CURRENCY_SYMBOL` | | Fallback symbol, default `KSh` |
| `HOSTING_INVOICE_RECIPIENT` | | Email address that receives the monthly hosting invoice (cron) |
| `HOSTING_FEE_AMOUNT` | | Override total hosting fee; otherwise computed from line items below |
| `HOSTING_FEE_DB` | | Default `3.00` |
| `HOSTING_FEE_BACKEND` | | Default `3.00` |
| `HOSTING_FEE_SOCKETS` | | Default `2.00` |
| `HOSTING_FEE_STORAGE` | | Default `1.50` |
| `HOSTING_FEE_EMAIL` | | Default `1.00` |
| `HOSTING_FEE_SSL` | | Default `2.05` |
| `DEBUG_MODE` | | `true` to enable SQL logging |
| `NEXT_PUBLIC_APP_URL` | | Public app URL (optional) |

> Many credentials (Brevo keys, M-Pesa, Paystack, exchange-rate keys) can also be stored **per-branch in the Settings/Integrations tables** (encrypted with `***REMOVED***`). The env vars are fallbacks used when no DB setting exists.

---

## 5. Local Development

```bash
cd backend-nextjs
npm install
cp .env.example .env.local     # set ***REMOVED***, ***REMOVED***, ***REMOVED***, CRON_SECRET
npm run dev
```

Server runs at `http://localhost:3000`. The whole API is live:

- Health check: `http://localhost:3000/health`
- API docs: `http://localhost:3000/api-docs`
- Root: `http://localhost:3000/`

### Running the smoke tests (no server needed)

In-process tests that drive the ported Express app through the exact bridge used in production, against the configured database:

```bash
npm test
```

Covers: root/health/install-check, JSON body parsing (login), auth guards, and multer multipart uploads.

---

## 6. Deploying to Vercel

### Via the Vercel Dashboard

1. Push `backend-nextjs` to a git repo (or a subfolder of an existing repo).
2. In Vercel → **Add New → Project** → import the repo.
3. **Root Directory:** `backend-nextjs` (if it's a subfolder of a monorepo).
4. Framework preset: **Next.js** (auto-detected).
5. Add the environment variables from [Section 4](#4-environment-variables) (at least `***REMOVED***`, `***REMOVED***`, `***REMOVED***`, `CRON_SECRET`).
6. Deploy. Build command is `npm run build` (or `next build`).

### Via the Vercel CLI

```bash
cd backend-nextjs
npm i -g vercel
vercel login
vercel                            # preview
vercel --prod                     # production
vercel env add ***REMOVED***       # add env vars (repeat per variable)
vercel cron list                  # verify cron jobs were registered
```

### Setting env vars from CLI (non-interactive)

```bash
vercel env add ***REMOVED*** production
vercel env add ***REMOVED*** production
vercel env add CRON_SECRET production
vercel env add ***REMOVED*** production
```

### Cron jobs

Cron schedules are declared in `vercel.json` (Vercel requires the **Hobby** plan or above for cron jobs). They call the same service functions the old `node-cron` scheduler ran:

| Schedule | Endpoint | Purpose |
|---|---|---|
| `0 23 * * *` | `/api/cron/daily-product-status` | Emails daily out-of-stock / low-stock report per branch |
| `0 8 * * 1` | `/api/cron/weekly-summary` | Emails weekly summary |
| `0 0 1,3 * *` | `/api/cron/hosting-invoice` | Emails monthly hosting invoice |

Vercel automatically adds the `Authorization: Bearer <CRON_SECRET>` header. Verify with `vercel cron list` after deploy. If you need manual triggers, call the endpoint with `Authorization: Bearer <CRON_SECRET>` yourself.

---

## 7. Verification / Smoke Test

After deploying, check:

```bash
curl https://<your-deployment>.vercel.app/health
# {"status":"OK","version":"1.10.0","database":"connected",...}

curl https://<your-deployment>.vercel.app/api/install/check
# {"needsSetup":false,"database":"connected","stats":{...}}
```

- `/health` → `status: OK`, `database: connected` once `***REMOVED***` is valid.
- `/api/install/check` → `needsSetup: false` once the DB has at least one branch and user.
- If you are starting truly from scratch (empty DB), run `/api/install/setup` (POST) with `{ branch, admin }` to create the first branch and admin — or seed via the `../backend` migration scripts.

---

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| `Module not found` during build | Run `npm install`. Ensure `sequelize`, `pg`, `pg-hstore`, `pdfkit` are in `serverComponentsExternalPackages` in `next.config.mjs`. |
| `/health` shows `database: disconnected` | Check `***REMOVED***` is set and reachable; SSL may be required (`?sslmode=require`). |
| `Too many clients` / connection errors | Lower Sequelize `pool.max` in `src/lib/database.js` (try `1`) for serverless. |
| Cron endpoints return `401` | `CRON_SECRET` must be set in Vercel env vars. |
| `Invalid version` errors | This package uses `1.10.0` (valid semver). Do not use `1.10` without the patch version. |
| Product image uploads fail | Verify `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET`, or Cloudinary config saved in Settings. |
| Email not sending | Verify `***REMOVED***` + `BREVO_SENDER_EMAIL`, and `ENABLE_EMAILING=true`. |

---

## 9. API Surface

All original endpoints are mounted under `/api` (see `src/lib/app.js` for the full list). Notable groups:

- **Auth / Users**: `/api/auth`, `/api/users`
- **Catalog**: `/api/products` (incl. `upload-image`), `/api/bundles`, `/api/serials`, `/api/tax-rates`
- **Sales & Inventory**: `/api/sales`, `/api/purchase-orders`, `/api/inventory`, `/api/warehouses`, `/api/waste`, `/api/returns`
- **Payments**: `/api/payments`-related logic within `/api/sales`, `/api/mpesa`, `/api/paystack`
- **Money & Reporting**: `/api/cash`, `/api/expenses`, `/api/analytics`, `/api/export`
- **Customers / Suppliers**: `/api/customers`, `/api/suppliers`
- **Config**: `/api/settings`, `/api/branches`, `/api/exchange-rates`, `/api/integrations`, `/api/webhooks`
- **Setup**: `/api/install` (`/check`, `/setup`)
- **Docs**: `/api-docs` (Swagger UI)
- **Health**: `/health`

Interactive Swagger docs: `<deployment-url>/api-docs`.
