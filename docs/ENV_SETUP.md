# Environment Variables Summary

## What Goes Where?

### 🔧 Environment Variables (.env file)
**Only 3 critical settings:**
1. `***REMOVED***` - PlanetScale connection string
2. `***REMOVED***` - Authentication secret key
3. `***REMOVED***` - For encrypting database credentials

Plus optional: URLs, branding, debug mode

### 🎨 Dashboard UI (Settings Page)
**Everything else is managed here:**

#### Payment Settings (Per Branch)
- M-Pesa Consumer Key
- M-Pesa Consumer Secret
- M-Pesa Passkey
- M-Pesa Shortcode
- M-Pesa Environment (sandbox/production)
- Payment gateway credentials

#### Email Settings (Global or Per Branch)
- Brevo API Key
- Sender Email Address
- Sender Name
- SMTP credentials (if using custom)

#### Storage Settings (Global or Per Branch)
- Cloudinary Cloud Name
- Cloudinary API Key
- Cloudinary API Secret
- Cloudinary Upload Preset
- File upload configurations

#### General Settings (Per Branch)
- Tax Rate %
- Low Stock Alert Threshold
- Receipt Footer Text
- Business Hours
- Contact Information

---

## Complete Environment Variable Reference

### Backend `.env` (Minimal Setup)

```bash
# Database
***REMOVED***="mysql://user:pass@aws.connect.psdb.cloud/db?ssl={\"rejectUnauthorized\":true}"

# Security
***REMOVED***="your-jwt-secret-32-chars-minimum"
***REMOVED***="your-encryption-key-32-chars"

# URLs (Development)
NEXT_PUBLIC_API_URL="http://localhost:8888/.netlify/functions"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# URLs (Production)
# NEXT_PUBLIC_API_URL="https://your-backend.netlify.app/.netlify/functions"
# NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"

# Optional
NEXT_PUBLIC_APP_NAME="BorderShop POS"
DEFAULT_CURRENCY="KES"
NODE_ENV="development"
DEBUG_MODE="true"
```

### Frontend `.env` (Same as Backend)

Use the same environment variables as backend for consistency.

---

## Why This Approach?

### ✅ Benefits of UI-Managed Settings

1. **Branch-Specific Configurations**
   - Each location can have its own M-Pesa account
   - Different email senders per region
   - Custom settings per branch

2. **No Server Restarts**
   - Update credentials instantly
   - A/B test different payment gateways
   - Switch between sandbox/production easily

3. **Security**
   - Credentials encrypted in database
   - Not exposed in version control
   - Access controlled by user roles

4. **Audit Trail**
   - Track who changed what
   - When settings were updated
   - Compliance and debugging

5. **Easier Deployment**
   - Fewer environment variables
   - Less configuration management
   - Simpler CI/CD pipelines

### ❌ Downsides of Environment Variables

- Hard to change (requires redeployment)
- Same for all branches
- Exposed in build logs
- No audit trail
- Version control issues

---

## Migration Steps

### If you have existing .env with credentials:

**Step 1**: Note your existing credentials
```bash
# .env (OLD)
MPESA_CONSUMER_KEY="abc123"
MPESA_CONSUMER_SECRET="xyz789"
***REMOVED***="brevo_xyz"
```

**Step 2**: Remove them from .env
```bash
# .env (NEW - cleaned up)
***REMOVED***="..."
***REMOVED***="..."
***REMOVED***="..."
```

**Step 3**: Add through Dashboard UI
1. Login as Admin
2. Go to **Settings** → **Payments**
3. Click **"Add M-Pesa Configuration"**
4. Enter credentials:
   - Consumer Key: `abc123`
   - Consumer Secret: `xyz789`
   - Shortcode: `174379`
   - Environment: `sandbox`
5. Save

**Step 4**: Verify it works
- Process a test sale
- Check if M-Pesa integration works
- Credentials loaded from database ✅

---

## Setting Categories in Database

```sql
-- Payment settings (category = 'payment')
INSERT INTO settings VALUES (
  branchId: '123-branch-uuid',
  category: 'payment',
  key: 'mpesa_consumer_key',
  value: 'encrypted_value_here',
  isEncrypted: true
);

-- Email settings (category = 'email')
INSERT INTO settings VALUES (
  branchId: NULL, -- global setting
  category: 'email',
  key: 'brevo_api_key',
  value: 'encrypted_value_here',
  isEncrypted: true
);

-- Storage settings (category = 'storage')
INSERT INTO settings VALUES (
  branchId: NULL,
  category: 'storage',
  key: 'cloudinary_cloud_name',
  value: 'my-cloud-name',
  isEncrypted: false
);
```

---

## UI Configuration Guide

### For Admins

**Access**: Dashboard → Settings → All Categories

**Capabilities**:
- Configure global settings (branchId = null)
- Configure settings for any branch
- View all settings
- Update/delete any setting

### For Managers

**Access**: Dashboard → Settings → Their Branch Only

**Capabilities**:
- Configure settings for their assigned branch only
- Cannot see other branches' settings
- Cannot modify global settings (read-only)

---

## Development vs Production

### Development (.env)
```bash
***REMOVED***="mysql://...sandbox.psdb.cloud/dev-db..."
NEXT_PUBLIC_API_URL="http://localhost:8888/.netlify/functions"
NODE_ENV="development"
DEBUG_MODE="true"
```

### Production (.env on Netlify/Vercel)
```bash
***REMOVED***="mysql://...production.psdb.cloud/prod-db..."
NEXT_PUBLIC_API_URL="https://api.yourdomain.com/.netlify/functions"
NODE_ENV="production"
DEBUG_MODE="false"
```

Settings in database remain the same (no environment-specific configs needed).

---

## Quick Reference

| Setting | Location | Why |
|---------|----------|-----|
| Database URL | .env | Required for app to start |
| JWT Secret | .env | Required for auth |
| Encryption Key | .env | Required to decrypt DB settings |
| M-Pesa Keys | Dashboard UI | Branch-specific, changes often |
| Brevo API | Dashboard UI | May differ per region |
| Cloudinary | Dashboard UI | Different accounts per branch |
| Tax Rates | Dashboard UI | Varies by location |
| Receipt Text | Dashboard UI | Customizable per branch |

---

**See also**: [SETTINGS_AND_PAYMENTS.md](file:///home/bealthguy/Public/bordershop/SETTINGS_AND_PAYMENTS.md) for complete technical documentation.
