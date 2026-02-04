# UI-Managed Settings Configuration

## Settings Categories

All settings are managed through the Dashboard UI under **Settings** page.

### 1. Payment Settings (`category: 'payment'`)

#### M-Pesa Configuration (Per Branch)
| Setting Key | Description | Encrypted | Required |
|------------|-------------|-----------|----------|
| `mpesa_consumer_key` | M-Pesa API Consumer Key | ✅ Yes | Yes |
| `mpesa_consumer_secret` | M-Pesa API Consumer Secret | ✅ Yes | Yes |
| `mpesa_passkey` | M-Pesa Lipa Na M-Pesa Passkey | ✅ Yes | Yes |
| `mpesa_shortcode` | Business Shortcode (Paybill/Till) | ❌ No | Yes |
| `mpesa_environment` | `sandbox` or `production` | ❌ No | Yes |
| `mpesa_callback_url` | Payment callback URL | ❌ No | Optional |

#### Other Payment Gateways (Future)
| Setting Key | Description | Encrypted |
|------------|-------------|-----------|
| `stripe_secret_key` | Stripe API Secret | ✅ Yes |
| `paypal_client_id` | PayPal Client ID | ✅ Yes |
| `paypal_secret` | PayPal Secret | ✅ Yes |

---

### 2. Email Settings (`category: 'email'`)

#### Brevo (SendinBlue) Configuration
| Setting Key | Description | Encrypted | Required |
|------------|-------------|-----------|----------|
| `brevo_api_key` | Brevo API Key | ✅ Yes | Yes |
| `sender_email` | From email address | ❌ No | Yes |
| `sender_name` | From name | ❌ No | Yes |

#### Custom SMTP (Alternative)
| Setting Key | Description | Encrypted |
|------------|-------------|-----------|
| `smtp_host` | SMTP server host | ❌ No |
| `smtp_port` | SMTP port (587, 465) | ❌ No |
| `smtp_username` | SMTP username | ✅ Yes |
| `smtp_password` | SMTP password | ✅ Yes |
| `smtp_secure` | Use TLS (`true`/`false`) | ❌ No |

---

### 3. Storage Settings (`category: 'storage'`)

#### Cloudinary Configuration
| Setting Key | Description | Encrypted | Required |
|------------|-------------|-----------|----------|
| `cloudinary_cloud_name` | Cloudinary Cloud Name | ❌ No | Yes |
| `cloudinary_api_key` | Cloudinary API Key | ✅ Yes | Yes |
| `cloudinary_api_secret` | Cloudinary API Secret | ✅ Yes | Yes |
| `cloudinary_upload_preset` | Upload Preset | ❌ No | Optional |
| `cloudinary_folder` | Storage folder path | ❌ No | Optional |

#### AWS S3 (Alternative)
| Setting Key | Description | Encrypted |
|------------|-------------|-----------|
| `s3_bucket_name` | S3 Bucket Name | ❌ No |
| `s3_access_key` | AWS Access Key ID | ✅ Yes |
| `s3_secret_key` | AWS Secret Access Key | ✅ Yes |
| `s3_region` | AWS Region | ❌ No |

---

### 4. General Settings (`category: 'general'`)

#### Branch-Specific Settings
| Setting Key | Description | Type | Example |
|------------|-------------|------|---------|
| `tax_rate` | Default tax rate % | Number | `16` (for 16%) |
| `low_stock_threshold` | Alert when stock below | Number | `10` |
| `receipt_footer` | Receipt footer text | Text | "Thank you for shopping!" |
| `business_hours` | Operating hours | JSON | `{"mon": "9-5", "tue": "9-5"}` |
| `allow_negative_stock` | Allow overselling | Boolean | `false` |
| `auto_approve_orders` | Auto-approve new orders | Boolean | `true` |

#### Global Settings (branchId = null)
| Setting Key | Description | Type | Example |
|------------|-------------|------|---------|
| `company_name` | Legal company name | Text | "BorderShop Inc." |
| `company_address` | Registered address | Text | "123 Main St" |
| `company_phone` | Support phone | Text | "+254712345678" |
| `company_email` | Support email | Text | "support@bordershop.com" |
| `default_currency` | System-wide currency | Text | `USD` or `KES` |
| `enable_multi_currency` | Support multiple currencies | Boolean | `true` |

---

## How to Add Settings via UI

### Admin Dashboard Flow

```
1. Login as Admin
   ↓
2. Navigate to: Dashboard → Settings
   ↓
3. Select Category Tab:
   - Payment
   - Email
   - Storage
   - General
   ↓
4. Click "+ Add Setting" or edit existing
   ↓
5. Fill form:
   - Setting Key (select from dropdown or enter custom)
   - Value (text, number, or JSON)
   - Branch (select branch or "Global")
   - Encrypt? (checkbox for sensitive data)
   ↓
6. Click "Save"
   ↓
7. Setting stored in database (encrypted if marked)
   ↓
8. Immediately available (no restart needed)
```

### Manager Dashboard Flow

```
1. Login as Manager
   ↓
2. Navigate to: Dashboard → Settings
   ↓
3. Can only configure settings for their assigned branch
   ↓
4. Global settings shown as read-only
   ↓
5. Follow same steps as Admin (limited to their branch)
```

---

## API Usage Examples

### Backend: Fetching M-Pesa Settings

```typescript
import { getMpesaSettings } from '@/services/settings-service';

// Get M-Pesa config for a branch
const config = await getMpesaSettings(branchId);

console.log(config);
// {
//   consumerKey: "decrypted_key",
//   consumerSecret: "decrypted_secret",
//   passkey: "decrypted_passkey",
//   shortcode: "174379",
//   environment: "sandbox"
// }

// Use in M-Pesa payment
const token = await getMpesaAccessToken(
  config.consumerKey,
  config.consumerSecret
);
```

### Backend: Fetching Email Settings

```typescript
import { getEmailSettings } from '@/services/settings-service';

// Get global email settings
const emailConfig = await getEmailSettings();

console.log(emailConfig);
// {
//   apiKey: "decrypted_brevo_key",
//   senderEmail: "noreply@bordershop.com",
//   senderName: "BorderShop POS"
// }

// Send email
await sendEmail({
  apiKey: emailConfig.apiKey,
  from: { email: emailConfig.senderEmail, name: emailConfig.senderName },
  to: [{ email: "customer@example.com" }],
  subject: "Receipt",
  htmlContent: receiptHTML
});
```

### Backend: Fetching Cloudinary Settings

```typescript
import { getCloudinarySettings } from '@/services/settings-service';

const cloudinaryConfig = await getCloudinarySettings();

// Configure Cloudinary
cloudinary.config({
  cloud_name: cloudinaryConfig.cloudName,
  api_key: cloudinaryConfig.apiKey,
  api_secret: cloudinaryConfig.apiSecret
});

// Upload image
const result = await cloudinary.uploader.upload(file, {
  folder: 'products',
  upload_preset: cloudinaryConfig.uploadPreset
});
```

### Frontend: Managing Settings

```typescript
import apiClient from '@/lib/api-client';

// Get all payment settings
const result = await apiClient.getSettings('payment');
console.log(result.settings);
// [
//   { id: '1', category: 'payment', key: 'mpesa_shortcode', hasSensitiveValue: false },
//   { id: '2', category: 'payment', key: 'mpesa_consumer_key', hasSensitiveValue: true }
// ]
// Note: Actual decrypted values NOT sent to frontend for security

// Save a new setting
await apiClient.saveSetting({
  category: 'payment',
  key: 'mpesa_consumer_key',
  value: 'your_consumer_key_here',
  isEncrypted: true,
  branchId: currentBranchId
});

// Delete a setting
await apiClient.deleteSetting('payment', 'old_gateway_key', branchId);
```

---

## Setting Validation Rules

### Payment Settings
- M-Pesa shortcode must be 5-7 digits
- Environment must be 'sandbox' or 'production'
- Consumer key/secret required when shortcode provided

### Email Settings
- Sender email must be valid email format
- Brevo API key starts with '***REMOVED_BREVO_KEY***'
- SMTP port must be 25, 465, or 587

### Storage Settings
- Cloudinary cloud name: alphanumeric, hyphens only
- AWS S3 bucket: lowercase, DNS-compliant

### General Settings
- Tax rate: 0-100 (percentage)
- Low stock threshold: positive integer
- Currency: 3-letter ISO code (USD, KES, EUR, etc.)

---

## Security Considerations

### Encryption
- All `isEncrypted: true` values use AES-256-GCM
- Encryption key from environment variable `***REMOVED***`
- Never send decrypted values to frontend

### Access Control
- Admins: Full access to all settings
- Managers: Only their branch settings
- Others: No access to settings endpoint

### Audit Trail
- Every setting change logged
- `createdBy` and `updatedBy` tracked
- Timestamps recorded
- Compatible with audit_logs table

---

## Default Settings on Installation

When system is first installed, these defaults are created:

```sql
-- Default currency
INSERT INTO settings (branchId, category, key, value, isEncrypted)
VALUES (NULL, 'general', 'default_currency', 'USD', false);

-- Default tax rate
INSERT INTO settings (branchId, category, key, value, isEncrypted)
VALUES (NULL, 'general', 'tax_rate', '0', false);

-- Low stock threshold
INSERT INTO settings (branchId, category, key, value, isEncrypted)
VALUES (NULL, 'general', 'low_stock_threshold', '10', false);
```

---

## UI Component Structure

### Settings Page Layout

```
Dashboard → Settings
│
├── Tabs
│   ├── Payment Settings
│   ├── Email Settings
│   ├── Storage Settings
│   └── General Settings
│
├── For each tab:
│   ├── List of existing settings
│   │   ├── Key name
│   │   ├── Status (Active/Inactive)
│   │   ├── Masked value (if encrypted)
│   │   └── Actions (Edit/Delete)
│   │
│   └── "+ Add New Setting" button
│       ├── Modal/Form
│       │   ├── Dropdown: Select setting key
│       │   ├── Input: Enter value
│       │   ├── Checkbox: Encrypt this value
│       │   ├── Dropdown: Select branch (admins only)
│       │   └── Save button
│
└── Branch Filter (admins only)
    - View settings for specific branch or global
```

---

## Testing Settings

### Test M-Pesa Configuration
1. Add M-Pesa settings via UI
2. Process a test sale with M-Pesa
3. Check payment logs for success/failure
4. Verify credentials are loaded correctly

### Test Email Configuration
1. Add Brevo API key via UI
2. Process a sale with email receipt
3. Check customer receives email
4. Verify sender name/email correct

### Test Cloudinary Configuration
1. Add Cloudinary credentials via UI  
2. Upload product image
3. Verify image appears in Cloudinary dashboard
4. Check image URLs work

---

**Complete documentation**: [SETTINGS_AND_PAYMENTS.md](file:///home/bealthguy/Public/bordershop/SETTINGS_AND_PAYMENTS.md)
