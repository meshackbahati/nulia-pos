# 🚀 Bordershop Setup Guide

Complete step-by-step guide to get your supermarket management system up and running.

## 📋 Prerequisites

- Node.js 18+ installed
- Git installed
- A Supabase account (free tier available)
- Basic knowledge of environment variables

## 🏁 Quick Start (5 Minutes)

### Step 1: Clone & Install
```bash
git clone https://github.com/your-username/bordershop-pos
cd bordershop-pos
npm install
```

### Step 2: Environment Setup
```bash
cp .env.example .env.local
```

### Step 3: Configure Supabase (Required)
1. Go to [supabase.com](https://supabase.com) and create account
2. Create new project
3. Copy your credentials to `.env.local`:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service role key → `SUPABASE_SERVICE_ROLE_KEY`

### Step 4: Set up Database
```bash
npm run db:setup
```

### Step 5: Start Development
```bash
npm run dev
```

Visit `http://localhost:3000` - Your supermarket system is ready! 🎉

---

## 🔧 Detailed Configuration

### 🗄️ Database Setup (Supabase)

#### Creating Your Supabase Project
1. **Sign Up**: Go to [supabase.com](https://supabase.com)
2. **New Project**: Click "New Project" 
3. **Project Details**:
   - Name: "Bordershop POS"
   - Database Password: Generate strong password
   - Region: Choose closest to your location
4. **Wait**: Project creation takes 2-3 minutes

#### Getting Your Credentials
1. **API Settings**: Go to Settings > API
2. **Copy Values**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL="https://abcdefgh.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIs..."
   SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIs..."
   ```
3. **JWT Secret**: Settings > API > JWT Settings > JWT Secret

#### Database Schema Setup
```bash
# Run all migrations
npm run db:migrate

# Create sample data
npm run db:seed

# Create your manager account
npm run setup:manager
```

---

### 💳 Payment Integration Setup

#### M-Pesa Setup (Kenya/East Africa)
1. **Developer Account**: Register at [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. **Create App**: Create new Daraja API app
3. **Get Credentials**:
   - Consumer Key & Secret from app details
   - Test credentials provided in sandbox
4. **Configure Environment**:
   ```env
   MPESA_CONSUMER_KEY="your_key_here"
   MPESA_CONSUMER_SECRET="your_secret_here"
   MPESA_PASSKEY="bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"
   MPESA_SHORTCODE="174379"
   MPESA_ENVIRONMENT="sandbox"
   ```

#### Stripe Setup (Card Payments)
1. **Stripe Account**: Sign up at [stripe.com](https://stripe.com)
2. **Get API Keys**: Dashboard > Developers > API keys
3. **Configure Environment**:
   ```env
   STRIPE_SECRET_KEY="sk_test_..."
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
   ```
4. **Webhook Setup**: 
   - Create webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
   - Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`

---

### 📱 Scanner Configuration

#### Network Scanner (Recommended)
1. **Install App**: Download "Barcode to PC" 
   - [Android](https://play.google.com/store/apps/details?id=com.eme.barcode.pc)
   - [iOS](https://apps.apple.com/app/barcode-to-pc-wireless/id1179750280)
2. **Configure Environment**:
   ```env
   NEXT_PUBLIC_NETWORK_SCANNER_ENABLED=true
   NEXT_PUBLIC_NETWORK_SCANNER_PORT=8080
   NEXT_PUBLIC_NETWORK_SCANNER_SECRET="your_secret_key"
   ```
3. **Connect**: Enter your computer's IP and port in the app

#### USB Scanner
Most USB barcode scanners work plug-and-play. Configure vendor/product IDs if needed:
```env
NEXT_PUBLIC_USB_SCANNER_ENABLED=true
NEXT_PUBLIC_USB_SCANNER_VENDOR_ID=1234
NEXT_PUBLIC_USB_SCANNER_PRODUCT_ID=5678
```

#### Camera Scanner
Uses device camera for barcode scanning:
```env
NEXT_PUBLIC_CAMERA_SCANNER_ENABLED=true
```

---

## 👥 User Account Setup

### Creating Manager Account
```bash
# Interactive setup
npm run setup:manager

# Or manually via Supabase dashboard:
# 1. Go to Authentication > Users
# 2. Create user with email/password
# 3. Add to users table with role='manager'
```

### Creating Salesperson Accounts
1. **Login as Manager**: Use your manager credentials
2. **User Management**: Go to dashboard → User Management
3. **Add Salesperson**: Fill form with email, name, role
4. **Custom Login**: Salespersons use custom token authentication

---

## 🏢 Business Configuration

### Basic Settings
```env
NEXT_PUBLIC_BUSINESS_NAME="Your Supermarket Name"
NEXT_PUBLIC_BUSINESS_ADDRESS="123 Main Street, City"
NEXT_PUBLIC_BUSINESS_PHONE="+1234567890"
NEXT_PUBLIC_BUSINESS_EMAIL="info@yourbusiness.com"
```

### Currency & Localization
```env
NEXT_PUBLIC_CURRENCY="USD"  # or KES, EUR, GBP, etc.
NEXT_PUBLIC_CURRENCY_SYMBOL="$"  # or KES, €, £, etc.
```

### Receipt Customization
Business information automatically appears on receipts. Customize in:
- `/components/enhanced-receipt-dialog.tsx`
- Receipt templates in `/components/ui/`

---

## 🚀 Production Deployment

### Vercel Deployment (Recommended)
1. **Connect GitHub**: Import your repository to Vercel
2. **Environment Variables**: Add all production values in Vercel dashboard
3. **Deploy**: Automatic deployment on git push

### Environment Checklist for Production
```env
NODE_ENV=production
DEBUG=false
NEXT_PUBLIC_SCANNER_DEBUG_MODE=false

# Use production URLs and keys
NEXT_PUBLIC_SUPABASE_URL="https://your-prod-project.supabase.co"
STRIPE_SECRET_KEY="sk_live_..."
MPESA_ENVIRONMENT="production"
```

### Supabase Production Setup
1. **Row Level Security**: Enable RLS on all tables
2. **API Limits**: Configure appropriate rate limits
3. **Backup**: Set up automated backups
4. **Monitoring**: Enable real-time monitoring

---

## 🔒 Security Checklist

### Database Security
- [ ] Enable Row Level Security (RLS)
- [ ] Review and test all RLS policies
- [ ] Use service role key only on server
- [ ] Regular security updates

### API Security
- [ ] Validate all inputs
- [ ] Implement rate limiting
- [ ] Use HTTPS in production
- [ ] Secure webhook endpoints

### Authentication Security
- [ ] Strong password requirements
- [ ] Enable 2FA for admin accounts
- [ ] Regular credential rotation
- [ ] Monitor failed login attempts

---

## 🧪 Testing Your Setup

### Database Test
```bash
npm run test:db
```

### Payment Test
```bash
# Test M-Pesa (sandbox)
npm run test:mpesa

# Test Stripe (test mode)
npm run test:stripe
```

### Scanner Test
1. **Network Scanner**: Scan test barcode from app
2. **USB Scanner**: Plug in and scan
3. **Camera Scanner**: Allow camera permissions and scan

### End-to-End Test
1. **Login as Manager**: Create products, users
2. **Login as Salesperson**: Process test sales
3. **Check Reports**: Verify data appears correctly

---

## 🆘 Troubleshooting

### Common Issues

#### "Supabase client not found"
- Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Verify project is active in Supabase dashboard

#### "Database connection failed"
- Verify `POSTGRES_URL` is correct
- Check if project is paused in Supabase

#### "Scanner not working"
- Verify scanner is enabled in environment
- Check browser permissions for camera
- Test network connectivity for network scanner

#### "Payment processing failed"
- Check API keys are for correct environment (test/live)
- Verify webhook endpoints are configured
- Check payment provider status pages

### Getting Help
- 📧 **Issues**: Create GitHub issue with error details
- 📖 **Documentation**: Check `/docs` folder
- 💬 **Community**: Join our Discord server

---

## 📚 Next Steps

### After Basic Setup
1. **Import Products**: Use bulk import feature
2. **Print Test Receipts**: Verify printer compatibility
3. **Train Staff**: Provide user training
4. **Backup Strategy**: Implement regular backups

### Advanced Features
1. **Custom Reports**: Modify reporting templates
2. **Brand Customization**: Update logos and colors
3. **Integration**: Connect with accounting software
4. **Multi-location**: Expand to multiple stores

---

## 🏆 You're Ready!

Your Bordershop supermarket management system is now configured and ready for business operations!

### Quick Access Links
- **Manager Dashboard**: `https://yourdomain.com/auth/login`
- **Salesperson POS**: Custom token login
- **Documentation**: This guide and README.md
- **Support**: GitHub issues for technical support

**Happy selling! 🛒✨**