# Backend Self-Contained Deployment

This backend folder is **completely self-contained** and can be deployed to Netlify independently.

## Structure

```
backend/
├── functions/          # Netlify Functions (API endpoints)
├── lib/               # Database connection, utilities
├── models/            # Sequelize models
├── middleware/        # Auth middleware
├── services/          # Business logic
├── types/             # TypeScript types
├── config/            # Configuration files
├── migrations/        # Database migrations
├── seeders/           # Database seeders
├── public/            # Static files (minimal)
├── package.json       # Dependencies
├── netlify.toml       # Netlify configuration
└── .env               # Environment variables
```

## Deployment to Netlify

### 1. Push Backend to Git

```bash
cd /home/bealthguy/Public/bordershop/backend
git init
git add .
git commit -m "Initial backend commit"
git remote add origin <your-backend-repo-url>
git push -u origin main
```

### 2. Deploy to Netlify

**Option A: Netlify CLI**
```bash
cd /home/bealthguy/Public/bordershop/backend
netlify deploy --prod
```

**Option B: Netlify Dashboard**
1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect your git repository
4. **Base directory**: `.` (root of backend repo)
5. **Build command**: `echo 'Functions only'`
6. **Publish directory**: `public`
7. **Functions directory**: `functions`

### 3. Set Environment Variables

In Netlify Dashboard → Site settings → Environment variables:

```
***REMOVED***=postgresql://user:pass@ep-xxx.region.aws.neon.tech/db?sslmode=verify-full
***REMOVED***=your-jwt-secret-here
***REMOVED***=your-encryption-key-here
NODE_ENV=production
```

### 4. Your API Will Be Available At

```
https://your-backend-name.netlify.app/.netlify/functions/
```

Example endpoints:
- `https://your-backend-name.netlify.app/.netlify/functions/auth/login`
- `https://your-backend-name.netlify.app/.netlify/functions/products/list`
- `https://your-backend-name.netlify.app/.netlify/functions/sales/create`

## Local Development

```bash
cd /home/bealthguy/Public/bordershop/backend
npm install
npm run dev
```

Functions available at: `http://localhost:8888/.netlify/functions/`

## Important Notes

✅ **Self-Contained**: This folder has everything needed - models, migrations, types, etc.

✅ **No Next.js**: Backend is functions-only, no framework

✅ **Separate from Frontend**: Frontend deploys separately to Vercel/Netlify

✅ **Database**: Uses Neon PostgreSQL (serverless)

## Frontend Configuration

After deploying backend, update frontend `.env`:

```bash
NEXT_PUBLIC_API_URL=https://your-backend-name.netlify.app/.netlify/functions
```

Then deploy frontend separately to Vercel or Netlify.

---

**Two Separate Deployments**:
1. **Backend** (this folder) → Netlify Functions
2. **Frontend** (root folder) → Vercel or Netlify Static
