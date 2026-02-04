# BorderShop POS - Serverless Backend

## Quick Start Guide

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Set Up PlanetScale Database

1. Sign up at [planetscale.com](https://planetscale.com)
2. Create a new database (e.g., `bordershop-db`)
3. Create a connection string:
   - Click "Connect"
   - Select "Sequelize" or "General"
   - Copy the connection string
4. Update `backend/.env` with your ***REMOVED***

### 3. Run Migrations

```bash
cd backend
npm run db:migrate
npm run db:seed  # Optional: seed demo data
```

### 4. Start Backend (Local Development)

```bash
cd backend
npm run dev
```

Backend will be available at: `http://localhost:8888/.netlify/functions`

### 5. Start Frontend

```bash
# In project root
npm run dev
```

Frontend will be available at: `http://localhost:3000`

## Environment Variables

Copy `.env.example` to `.env` in both root and backend directories:

```bash
cp .env.example .env
cd backend
cp .env.example .env
```

Update with your actual credentials.

## Netlify Deployment

### Deploy Backend

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Login to Netlify:
```bash
netlify login
```

3. Deploy:
```bash
cd backend
netlify deploy --prod
```

4. Set environment variables in Netlify dashboard

### Deploy Frontend

Deploy your Next.js app to Vercel or Netlify as usual.

Update `NEXT_PUBLIC_API_URL` in frontend `.env` to point to your deployed Netlify Functions URL.

## API Endpoints

All functions are prefixed with `/.netlify/functions/`:

- **POST** `/auth/login` - User login
- **GET** `/install/setup` - Check installation status
- **POST** `/install/setup` - Create first admin
- **GET** `/products/list` - List products
- **POST** `/products/create` - Create product
- **GET** `/products/barcode/:barcode` - Get product by barcode
- **POST** `/sales/create` - Create sale
- **GET** `/admin/dashboard` - Admin dashboard data
- **GET** `/manager/dashboard` - Manager dashboard data

## Architecture

```
┌─────────────────┐
│   Next.js UI    │
│  (Frontend)     │
└────────┬────────┘
         │
         │ HTTP/REST
         ▼
┌─────────────────┐
│ Netlify         │
│ Functions       │
│ (Backend)       │
└────────┬────────┘
         │
         │ MySQL
         ▼
┌─────────────────┐
│  PlanetScale    │
│  (Database)     │
└─────────────────┘
```

## Key Features

- ✅ Serverless backend with Netlify Functions
- ✅ PlanetScale MySQL database (serverless-optimized)
- ✅ JWT authentication
- ✅ Role-based access control
- ✅ Transaction handling for sales
- ✅ M-Pesa payment integration
- ✅ Email notifications via Brevo
- ✅ File storage with Cloudinary
- ✅ Audit logging

## Troubleshooting

**Connection Errors:**
- Verify PlanetScale connection string
- Check if database branch is active
- Ensure SSL is enabled

**Function Timeout:**
- PlanetScale connections are optimized with pooling
- Functions timeout after 10s by default (can be increased in Netlify)

**CORS Issues:**
- All functions include CORS headers
- Check `NEXT_PUBLIC_API_URL` matches your deployed URL
