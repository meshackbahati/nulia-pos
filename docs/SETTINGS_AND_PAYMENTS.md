# Settings Management & Payment Tracking

## Overview

BorderShop POS now manages integration credentials (M-Pesa, Brevo, Cloudinary) directly in the database through the admin/manager dashboard UI instead of environment variables.

---

## 🔐 Settings Management

### Architecture

**Before** (Environment Variables):
```bash
# .env file
MPESA_CONSUMER_KEY="xxx"
MPESA_CONSUMER_SECRET="xxx"
***REMOVED***="xxx"
```
❌ Hard to change  
❌ Same for all branches  
❌ Requires server restart  

**After** (Database-Managed):
```typescript
// Stored in database 'settings' table
{
  branchId: "uuid",
  category: "payment",
  key: "mpesa_consumer_key",
  value: "encrypted_value",
  isEncrypted: true
}
```
✅ Dynamic updates  
✅ Branch-specific configurations  
✅ No server restart needed  
✅ Encrypted storage  

### Database Schema

#### `settings` Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| branchId | UUID | NULL for global, UUID for branch-specific |
| category | STRING | `payment`, `email`, `storage`, `general` |
| key | STRING | Setting identifier (e.g., `mpesa_consumer_key`) |
| value | TEXT | Setting value (encrypted if sensitive) |
| isEncrypted | BOOLEAN | Whether value is encrypted |
| isActive | BOOLEAN | Enable/disable setting |
| createdBy | UUID | User who created setting |
| updatedBy | UUID | User who last updated |

**Unique Constraint**: `(branchId, category, key)` - prevents duplicates

### Setting Categories

#### 1. **Payment Settings** (`category: 'payment'`)
M-Pesa configuration per branch:
- `mpesa_consumer_key` (encrypted)
- `mpesa_consumer_secret` (encrypted)
- `mpesa_passkey` (encrypted)
- `mpesa_shortcode`
- `mpesa_environment` (`sandbox` or `production`)

#### 2. **Email Settings** (`category: 'email'`)
Brevo/Email configuration:
- `brevo_api_key` (encrypted)
- `sender_email`
- `sender_name`

#### 3. **Storage Settings** (`category: 'storage'`)
Cloudinary configuration:
- `cloudinary_cloud_name`
- `cloudinary_api_key` (encrypted)
- `cloudinary_api_secret` (encrypted)
- `cloudinary_upload_preset`

#### 4. **General Settings** (`category: 'general'`)
Other app configurations:
- `default_currency`
- `tax_rate`
- `receipt_footer_text`

### API Endpoints

**GET** `/settings/manage?category=payment&branchId=xxx`
- List settings (without decrypted values)
- Managers: Only their branch
- Admins: Any branch or global

**POST** `/settings/manage`
```json
{
  "category": "payment",
  "key": "mpesa_consumer_key",
  "value": "your_key_here",
  "isEncrypted": true,
  "branchId": "optional-branch-id"
}
```

**DELETE** `/settings/manage?category=payment&key=mpesa_consumer_key`

### Usage in Code

```typescript
import { getMpesaSettings } from '@/services/settings-service';

// Get M-Pesa settings for a branch
const mpesaConfig = await getMpesaSettings(branchId);
// Returns: { consumerKey, consumerSecret, passkey, shortcode, environment }

// Use in payment processing
const token = await getAccessToken(
  mpesaConfig.consumerKey,
  mpesaConfig.consumerSecret
);
```

---

## 💰 Payment Tracking & Verification

### Architecture

Comprehensive payment logging for:
- M-Pesa STK Push
- M-Pesa C2B  
- Cash payments
- Card payments
- **Offline payments** (bank deposit, transfer, etc.)

### Database Schema

#### `payment_logs` Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| paymentId | UUID | Link to `payments` table |
| branchId | UUID | Branch where payment occurred |
| saleId | UUID | Associated sale |
| transactionType | STRING | `mpesa_stk`, `mpesa_c2b`, `cash`, `card`, `offline` |
| transactionId | STRING | M-Pesa code, card ref, etc. |
| amount | DECIMAL | Payment amount |
| currency | STRING | `USD`, `KES`, etc. |
| customerPhone | STRING | Customer'sphone |
| customerName | STRING | Customer name |
| status | STRING | `pending`, `completed`, `failed`, `cancelled`, `verified` |
| paymentMethod | STRING | Payment method name |
| requestPayload | JSON | Original request to payment gateway |
| responsePayload | JSON | Gateway response |
| callbackData | JSON | Webhook/callback data |
| **verifiedBy** | UUID | **Admin/Manager who verified** |
| **verifiedAt** | DATE | **Verification timestamp** |
| **verificationNotes** | TEXT | **Notes from verifier** |
| errorMessage | TEXT | Error details if failed |
| metadata | JSON | Additional tracking data |

### Payment Flow

#### 1. **Online Payments** (M-Pesa STK, Card)
```
Sale Created → Payment Initiated → Log Created (status: pending)
              ↓
        Callback Received → Log Updated → Payment Verified
              ↓
        Sale Status: completed
```

#### 2. **Offline Payments** (Bank deposit, Transfer)
```
Sale Created → Offline Payment Selected → Log Created (status: pending)
              ↓
        Customer pays outside system
              ↓
        Manager verifies → Log Updated (status: verified)
              ↓
        Sale Status: completed
```

### Verification Workflow

**Manager/Admin Dashboard**:
1. Navigate to "Payments" → "Pending Verification"
2. See list of offline/pending payments
3. For each payment:
   - View customer details
   - Check transaction ID/reference
   - Verify amount received
   - Add verification notes
   - Mark as `verified` or `failed`

### API Endpoints

**GET** `/payments/logs`
```typescript
// Query parameters:
{
  status?: 'pending' | 'completed' | 'verified' | 'failed',
  transactionType?: 'mpesa_stk' | 'offline' | 'cash',
  startDate?: '2026-02-01',
  endDate?: '2026-02-28',
  customerPhone?: '+254712345678',
  branchId?: 'uuid',
  page?: 1,
  limit?: 50
}

// Response:
{
  logs: [...],
  pagination: { total, page, limit, pages }
}
```

**POST** `/payments/logs` (Verify Payment)
```json
{
  "paymentLogId": "uuid",
  "status": "verified",
  "notes": "Confirmed bank deposit. Ref: ABC123"
}
```

### Frontend Usage

```typescript
import apiClient from '@/lib/api-client';

// Get pending payments for verification
const result = await apiClient.getPaymentLogs({
  status: 'pending',
  transactionType: 'offline',
});

// Verify a payment
await apiClient.verifyPayment(
  paymentLogId,
  'verified',
  'Confirmed via bank statement'
);
```

---

## 🎨 UI Components Needed

### 1. **Settings Page** (`/dashboard/settings`)

**Tabs**:
- Payment Settings (M-Pesa)
- Email Settings (Brevo)
- Storage Settings (Cloudinary)
- General Settings

**Features**:
- Form to add/edit settings
- Masked display for encrypted values
- Test connection buttons
- Branch selector (admins only)

### 2. **Payment Logs Page** (`/dashboard/payments`)

**Filters**:
- Status (Pending, Completed, Verified, Failed)
- Date range
- Customer phone
- Transaction type

**Table Columns**:
- Date/Time
- Customer
- Amount
- Method
- Status
- Transaction ID
- Actions (View, Verify)

**Verification Modal**:
- Payment details
- Customer info
- Amount to verify
- Notes input
- Verify/Reject buttons

### 3. **Offline Payment Flow** (POS)

**When processing sale**:
1. Select "Offline Payment"
2. Enter:
   - Expected amount
   - Customer phone/email
   - Payment reference
   - Note (e.g., "Customer will deposit to bank")
3. Creates `payment_log` with status `pending`
4. Sale status: `pending_payment`
5. Manager verifies later

---

## 📝 Environment Variables (Simplified)

**Required Only**:
```bash
# Database
***REMOVED***="mysql://..."

# Security
***REMOVED***="..."
***REMOVED***="..."  # For encrypting settings

# App Config
NEXT_PUBLIC_API_URL="http://localhost:8888/.netlify/functions"
```

**NOT Required** (Managed in UI):
- ~~MPESA_CONSUMER_KEY~~
- ~~MPESA_CONSUMER_SECRET~~
- ~~***REMOVED***~~
- ~~CLOUDINARY_API_KEY~~

---

## 🔒 Security

### Encryption
- Sensitive settings encrypted using `***REMOVED***`
- AES-256-GCM encryption
- Keys never sent to frontend (only masked status)

### Access Control
- **Admins**: Manage global and all branch settings
- **Managers**: Only their branch settings
- **Others**: No access to settings

### Audit Trail
- `createdBy` and `updatedBy` track who modified settings
- Payment logs track verification by manager
- All changes logged in `audit_logs` table

---

## 🚀 Migration Guide

### From Environment Variables

**Step 1**: Remove from `.env`:
```bash
# Delete these lines
MPESA_CONSUMER_KEY="..."
MPESA_CONSUMER_SECRET="..."
***REMOVED***="..."
```

**Step 2**: Add to database via UI:
1. Login as Admin/Manager
2. Go to Settings → Payments
3. Enter M-Pesa credentials
4. Click "Save"

**Step 3**: Update code to fetch from database:
```typescript
// Before
const key = process.env.MPESA_CONSUMER_KEY;

// After
const { consumerKey } = await getMpesaSettings(branchId);
```

---

## 📊 Benefits

### For Admins
✅ Centralized configuration management  
✅ Branch-specific payment credentials  
✅ No server restarts needed  
✅ Audit trail of changes  

### For Managers
✅ Configure their branch independently  
✅ Verify offline payments  
✅ Track all payment attempts  
✅ Customer payment history  

### For Developers
✅ Cleaner environment files  
✅ Dynamic configuration  
✅ Better security (encrypted storage)  
✅ Easier deployment  

---

## Files Created

1. [`backend/migrations/20260203-create-settings.js`](file:///home/bealthguy/Public/bordershop/backend/migrations/20260203-create-settings.js)
2. [`backend/migrations/20260203-create-payment-logs.js`](file:///home/bealthguy/Public/bordershop/backend/migrations/20260203-create-payment-logs.js)
3. [`backend/models/Setting.ts`](file:///home/bealthguy/Public/bordershop/backend/models/Setting.ts)
4. [`backend/models/PaymentLog.ts`](file:///home/bealthguy/Public/bordershop/backend/models/PaymentLog.ts)
5. [`backend/services/settings-service.ts`](file:///home/bealthguy/Public/bordershop/backend/services/settings-service.ts)
6. [`backend/functions/settings/manage.ts`](file:///home/bealthguy/Public/bordershop/backend/functions/settings/manage.ts)
7. [`backend/functions/payments/logs.ts`](file:///home/bealthguy/Public/bordershop/backend/functions/payments/logs.ts)
8. [Updated `src/lib/api-client.ts`](file:///home/bealthguy/Public/bordershop/src/lib/api-client.ts)

---

**Next Step**: Create UI components for settings management and payment verification! 🎨
