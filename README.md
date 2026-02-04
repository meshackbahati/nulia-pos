# BorderShop POS

**Modern serverless POS system with clean architecture**

## Quick Start

```bash
# 1. Install dependencies
npm run install:all

# 2. Setup backend (see backend/README.md)
cd backend && cp .env.example .env
# Add your Neon database URL to backend/.env

# 3. Run migrations
cd backend && npm run db:migrate

# 4. Start backend (Terminal 1)
cd backend && npm run dev

# 5. Start frontend (Terminal 2)
cd ui && npm run dev
```

Open http://localhost:3000

## Architecture

```
bordershop/
├── backend/        # Netlify Functions API (port 8888)
├── ui/             # React + Vite Frontend (port 3000)
└── docs/           # Documentation
```

## Documentation

- [Quick Start Guide](QUICKSTART.md)
- [Backend Setup](backend/README.md)
- [Backend Deployment](backend/DEPLOYMENT.md)
- [Settings & Payments](docs/SETTINGS_AND_PAYMENTS.md)
- [Database Options](docs/DATABASE_OPTIONS.md)

## Tech Stack

**Backend**: Netlify Functions + Neon PostgreSQL + Sequelize  
**Frontend**: React 19 + Vite + TailwindCSS + React Router

## Features

✅ Multi-branch POS  
✅ Product management  
✅ Sales tracking  
✅ M-Pesa integration  
✅ Payment verification  
✅ Database-stored settings  
✅ Role-based access

---

**Two separate deployments**: Backend → Netlify | Frontend → Netlify/Vercel