# Nulia POS

Self-hosted POS for shops that deal with cash, multiple currencies and unreliable internet.

Nulia runs the same workflow on browser, Android and desktop. Add products once, sell from any till, keep a single ledger. When offline, it queues sales and syncs when back online. When a customer pays in two currencies, it splits the payment and balances the till correctly. No monthly fees, no vendor lock.

<p align="center">
  <img src="ui/public/logo.svg" width="120" alt="Nulia">
</p>

## Quick start

```bash
git clone https://github.com/meshackbahati/nulia-pos.git
cd nulia-pos

# server
cd server
cp .env.example .env.local
# set DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY
npm install
npm run db:migrate
npm run dev          # http://localhost:3000

# client
cd ../ui
npm install
npm run dev          # http://localhost:5173
```

`curl http://localhost:3000/health` should return `OK`.

First business:

```bash
curl -X POST http://localhost:3000/api/install/setup \
  -H "Content-Type: application/json" \
  -d '{"branch":{"name":"Main"},"admin":{"email":"admin@test.com","password":"Strong123!","firstName":"Admin"}}'
```

## Build from source

```bash
# web
cd ui && npm run build

# android
cd ui && npm run build && npx cap sync android
cd android && ./gradlew assembleDebug

# desktop
cd ui && npm run build
npx electron-builder --win --publish never
npx electron-builder --linux --publish never
```

Details and deploy notes are in `QUICKSTART.md`. Prebuilt binaries are in Releases.

## What it does

- Sell offline after the first sync. Catalog cached, sales queued.
- Split payments across currencies in one transaction.
- Single ledger for all tills, with audit trail and reports.
- Inventory, warehouses, serials, suppliers and purchase orders in one place.

## License

MIT
