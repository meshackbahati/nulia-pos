# 🚀 Running BorderShop POS Locally

## Quick Start (2 Terminals)

### Terminal 1: Backend (Netlify Functions on port 8888)
```bash
cd /home/bealthguy/Public/bordershop/backend
npm run dev
```
**Expected output**:
```
◈ Server now ready on http://localhost:8888
```

### Terminal 2: Frontend (Next.js on port 3000)
```bash
cd /home/bealthguy/Public/bordershop
npm run dev
```
**Expected output**:
```
▲ Next.js 16.1.6 (Turbopack)
- Local: http://localhost:3000
✓ Ready in X.Xs
```

---

## Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8888/.netlify/functions/
- **Example Endpoint**: http://localhost:8888/.netlify/functions/auth/login

---

## Common Issues

### 1. Port Already in Use
**Error**: `Port 3000 is in use`

**Solution**:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or let it use different port (3001, 3002, etc.)
```

### 2. Backend Can't Find app Directory
**Error**: `Couldn't find any pages or app directory`

**Cause**: Running `netlify dev` from wrong directory

**Solution**: 
- Backend should be run from `/backend` directory
- Frontend should be run from **root** directory
- Don't run `netlify dev` from root!

### 3. Module Not Found Errors
**Solution**:
```bash
# Frontend
cd /home/bealthguy/Public/bordershop
rm -rf node_modules package-lock.json
npm install

# Backend
cd backend
rm -rf node_modules package-lock.json
npm install
```

### 4. Database Connection Errors
Check `.env` file has correct `***REMOVED***` from Neon:
```bash
***REMOVED***="postgresql://user:pass@ep-xxx.region.aws.neon.tech/db?sslmode=verify-full"
```

---

## Development Workflow

```
┌─────────────────────────────────────────┐
│   Browser: http://localhost:3000       │
│   (Next.js Frontend)                    │
└────────────┬────────────────────────────┘
             │
             │ API Calls
             ↓
┌─────────────────────────────────────────┐
│   Backend: http://localhost:8888       │
│   (Netlify Functions)                   │
└────────────┬────────────────────────────┘
             │
             │ SQL Queries
             ↓
┌─────────────────────────────────────────┐
│   Database: Neon PostgreSQL             │
│   (Serverless)                          │
└─────────────────────────────────────────┘
```

---

## Correct Setup

### ✅ DO THIS:

**Terminal 1** (Backend):
```bash
cd /home/bealthguy/Public/bordershop/backend
npm run dev
# Wait for: "Server now ready on http://localhost:8888"
```

**Terminal 2** (Frontend):
```bash
cd /home/bealthguy/Public/bordershop
npm run dev
# Wait for: "Ready in X.Xs"
```

### ❌ DON'T DO THIS:

```bash
# Wrong! Don't run netlify dev from root
cd /home/bealthguy/Public/bordershop
netlify dev  # ❌ This causes the error!

# Wrong! Don't run next dev from backend
cd /home/bealthguy/Public/bordershop/backend
npm run dev  # This should work, but only if netlify.toml is fixed
```

---

## First Time Setup Checklist

- [ ] Neon database created and `***REMOVED***` in `.env`
- [ ] Root `.env` file configured
- [ ] Backend `.env` file (copy from root)
- [ ] Dependencies installed in root: `npm install`
- [ ] Dependencies installed in backend: `cd backend && npm install`
- [ ] Start backend: `cd backend && npm run dev`
- [ ] Start frontend (new terminal): `npm run dev`
- [ ] Open browser: http://localhost:3000

---

## Stopping Servers

Press `Ctrl+C` in each terminal to stop the servers.

---

Now you're ready to run both servers! 🎉
