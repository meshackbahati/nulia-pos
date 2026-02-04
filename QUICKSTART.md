# BorderShop POS - Quick Start Guide

## Project Structure

This project has **two separate applications**:

1. **backend/** - Netlify Functions API
2. **ui/** - React + Vite Frontend

Each is **self-contained** with its own dependencies and configuration.

## Running Locally

### Terminal 1 - Backend
```bash
cd backend
npm install    # First time only
npm run dev    # Starts on port 8888
```

Wait for: `◈ Server now ready on http://localhost:8888`

### Terminal 2 - Frontend  
```bash
cd ui
npm install    # First time only
npm run dev    # Starts on port 3000
```

Wait for: `➜ Local: http://localhost:3000/`

## First Time Setup

### 1. Get Neon PostgreSQL (FREE)
1. Sign up at https://neon.tech
2. Create project: `bordershop-pos`
3. Copy connection string

### 2. Configure Backend
```bash
cd backend
cp .env.example .env
# Edit .env and add your Neon connection string
```

### 3. Run Migrations
```bash
cd backend
npm run db:migrate
npm run db:seed  # Optional demo data
```

### 4. Configure Frontend
```bash
cd ui
cp .env.example .env
# Default config should work for local development
```

### 5. Start Both Servers
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2  
cd ui && npm run dev
```

### 6. Open Browser
Go to http://localhost:3000

## Deployment

### Backend → Netlify
```bash
cd backend
netlify deploy --prod
```

Add environment variables in Netlify dashboard.

### Frontend → Netlify/Vercel
```bash
cd ui
npm run build
# Deploy dist/ folder
```

Update `.env` with production backend URL.

## Common Issues

### "Port already in use"
- Kill the process: `lsof -ti:8888 | xargs kill -9`
- Or let it use a different port

### "Cannot connect to database"
- Check `***REMOVED***` in `backend/.env`
- Verify Neon connection string is correct

### "API calls failing"
- Ensure backend is running on port 8888
- Check `VITE_API_URL` in `ui/.env`

## Need Help?

- Backend docs: `backend/DEPLOYMENT.md`
- Settings: `SETTINGS_AND_PAYMENTS.md`
- Environment: `ENV_SETUP.md`
