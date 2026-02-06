# 🏪 Multi-Retail POS System - Configuration Guide

## 📋 Required Environment Variables

Create a `.env.local` file in the root directory with the following configuration:

### 🗄️ Database Configuration (Aiven PostgreSQL)
```env
# Aiven PostgreSQL Connection (with SSL)
***REMOVED***="postgresql://username:password@hostname:port/database?sslmode=require"
DB_HOST="your-aiven-host.aivencloud.com"
DB_PORT="12345"
DB_NAME="your_database_name"
DB_USER="your_username"
DB_PASSWORD="your_secure_password"
DB_SSL="true"
```

**How to get Aiven PostgreSQL credentials:**
1. Sign up at [aiven.io](https://aiven.io)
2. Create a PostgreSQL service
3. Copy connection details from service overview
4. Ensure SSL is enabled for security

### 🔐 Authentication & Security
```env
# JWT Configuration
***REMOVED***="your-super-secure-jwt-secret-key-minimum-32-characters"
JWT_EXPIRES_IN="7d"

# Encryption for sensitive data
***REMOVED***="your-32-character-encryption-key-here"

# Session Configuration
SESSION_SECRET="your-session-secret-key"
```

### 💳 M-Pesa Configuration (Per Branch)
```env
# Global M-Pesa Settings
MPESA_ENVIRONMENT="sandbox" # or "production"
MPESA_BASE_URL="https://sandbox.safaricom.co.ke" # or production URL

# Default M-Pesa Credentials (can be overridden per branch)
DEFAULT_MPESA_CONSUMER_KEY="your_default_consumer_key"
DEFAULT_MPESA_CONSUMER_SECRET="your_default_consumer_secret"
DEFAULT_MPESA_PASSKEY="your_default_passkey"
DEFAULT_MPESA_SHORTCODE="174379" # Sandbox shortcode

# M-Pesa Callback Configuration
NEXT_PUBLIC_APP_URL="https://your-domain.com" # For generating callback URLs
MPESA_CALLBACK_BASE_URL="https://your-domain.com/api/mpesa"
```

**Note:** Each branch can have its own M-Pesa credentials configured through the admin panel.

### 📧 Email Configuration (Brevo)
```env
# Brevo API Configuration
***REMOVED***="your-brevo-api-key"
BREVO_SENDER_EMAIL="noreply@yourdomain.com"
BREVO_SENDER_NAME="Your Company Name"

# Email Templates
EMAIL_TEMPLATE_RECEIPT="1" # Brevo template ID for receipts
EMAIL_TEMPLATE_ALERT="2"   # Brevo template ID for alerts
EMAIL_TEMPLATE_REPORT="3"  # Brevo template ID for reports
```

**How to get Brevo credentials:**
1. Sign up at [brevo.com](https://brevo.com)
2. Go to SMTP & API > API Keys
3. Create new API key with full permissions
4. Set up email templates in Templates section

### 🖼️ File Storage (Cloudinary)
```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
CLOUDINARY_UPLOAD_PRESET="your_upload_preset"
```

**How to get Cloudinary credentials:**
1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Go to Dashboard to find Cloud Name, API Key, and API Secret
3. Create upload preset in Settings > Upload

### 🏢 Application Configuration
```env
# Application Settings
NEXT_PUBLIC_APP_NAME="RetailPro POS"
NEXT_PUBLIC_COMPANY_NAME="Your Company Name"
NEXT_PUBLIC_SUPPORT_EMAIL="support@yourdomain.com"

# Default Currency (can be overridden per branch)
DEFAULT_CURRENCY="KES"
DEFAULT_CURRENCY_SYMBOL="$"

# Feature Flags
ENABLE_MULTI_CURRENCY="true"
ENABLE_EMAIL_RECEIPTS="true"
ENABLE_BARCODE_SCANNING="true"
ENABLE_AUDIT_LOGGING="true"

# Development Settings
NODE_ENV="development" # Change to "production" for deployment
DEBUG_MODE="true"      # Set to "false" in production
LOG_LEVEL="info"       # Options: error, warn, info, debug
```

### 🔧 Development & Testing
```env
# Test Configuration
TEST_***REMOVED***="postgresql://test_user:test_pass@localhost:5432/test_db"
TEST_***REMOVED***="test-jwt-secret-for-testing-only"

# Seed Data Configuration
SEED_ADMIN_EMAIL="admin@yourdomain.com"
SEED_ADMIN_PASSWORD="SecurePassword123!"
SEED_SAMPLE_DATA="true" # Creates sample branches, products, etc.
```

---

## 🚀 Setup Instructions

### 1. Environment Setup
```bash
# Copy the example environment file
cp .env.example .env.local

# Edit with your actual credentials
nano .env.local
```

### 2. Database Setup
```bash
# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

### 3. First Run Setup
```bash
# Start the development server
npm run dev

# Visit http://localhost:3000
# If no admin exists, you'll see the Installation Page
# Create your first admin user through the web interface
```

### 4. Branch Configuration
1. Login as admin
2. Go to "Branch Management"
3. Create your first branch
4. Configure M-Pesa credentials for the branch
5. Set up currency and regional settings

### 5. User Management
1. Create managers for each branch
2. Assign appropriate roles and permissions
3. Create salesperson accounts
4. Test login with different roles

---

## 🏗️ Architecture Overview

### Database Schema
- **users**: Multi-role user management with branch assignment
- **branches**: Store locations with individual M-Pesa configs
- **products**: Product catalog with variants and barcodes
- **inventory**: Branch-specific stock levels
- **sales**: Transaction records with line items
- **payments**: M-Pesa and cash payment tracking
- **audit_logs**: Complete activity logging

### Security Features
- JWT-based authentication
- Role-based access control (RBAC)
- Encrypted sensitive data storage
- Audit logging for all critical actions
- Branch-isolated data access

### Payment Integration
- M-Pesa STK Push per branch
- M-Pesa C2B validation
- Cash payment handling
- Payment reconciliation
- Multi-currency support

---

## 🔒 Security Best Practices

### Production Checklist
- [ ] Use strong, unique passwords for all accounts
- [ ] Enable SSL/TLS for all connections
- [ ] Regularly rotate JWT secrets
- [ ] Monitor audit logs for suspicious activity
- [ ] Keep dependencies updated
- [ ] Use environment-specific M-Pesa credentials
- [ ] Implement proper backup procedures

### Data Protection
- Sensitive data is encrypted at rest
- M-Pesa credentials are encrypted per branch
- User passwords are hashed with bcrypt
- Audit logs track all data modifications

---

## 🆘 Support & Troubleshooting

### Common Issues
1. **Database Connection**: Verify Aiven PostgreSQL credentials and SSL settings
2. **M-Pesa Integration**: Check credentials and callback URL configuration
3. **Email Delivery**: Verify Brevo API key and sender configuration
4. **File Uploads**: Ensure Cloudinary credentials are correct

### Getting Help
- 📧 Technical Support: Create GitHub issue
- 📖 Documentation: See `/docs` folder
- 🎥 Video Guides: [Link to video documentation]

---

## 🎯 Production Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Add all environment variables in Vercel dashboard
3. Deploy with automatic SSL and CDN

### Environment Variables for Production
```env
NODE_ENV="production"
DEBUG_MODE="false"
MPESA_ENVIRONMENT="production"
# Use production M-Pesa credentials
# Use production database URL
# Use production Brevo API key
```

---

**Your multi-retail POS system is now ready for enterprise operations! 🚀**