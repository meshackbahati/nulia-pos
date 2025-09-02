# 🏪 RetailPro - Multi-Branch POS & Inventory Management System

A comprehensive, enterprise-grade Point of Sale and inventory management system built with Next.js 15, Sequelize ORM, and Aiven PostgreSQL. Designed for multi-branch retail operations with advanced features like M-Pesa integration, role-based access control, and intelligent automation.

## 🎯 **System Overview**

### **Enterprise Features**
- 🏢 **Multi-Branch Management** - Centralized control with branch-specific operations
- 👥 **Role-Based Access Control** - Admin, Manager, Head of Sales, Salesperson roles
- 💳 **Payment Integration** - M-Pesa STK Push, C2B, Cash, and Card payments
- 📱 **Mobile-Friendly POS** - Responsive interface with barcode scanning
- 📊 **Real-Time Analytics** - Branch performance and business intelligence
- 🔐 **Enterprise Security** - JWT authentication, encrypted credentials, audit logging
- 📧 **Communication System** - Email receipts, alerts, and reports via Brevo
- 🌍 **Multi-Currency Support** - Different currencies per branch with conversion rates

### **Intelligent Automation**
- ✅ **Auto-Setup**: Automatic M-Pesa callback URL generation per branch
- ✅ **Smart Inventory**: Real-time stock tracking with automated alerts
- ✅ **Audit Trail**: Complete logging of all critical system actions
- ✅ **AI-Powered Insights**: Branch performance analytics and recommendations

---

## 🚀 **Quick Start**

### **1. Clone & Install**
```bash
git clone https://github.com/your-username/retailpro-pos
cd retailpro-pos
npm install
```

### **2. Environment Configuration**
```bash
cp .env.example .env.local
# Edit .env.local with your credentials (see CONFIG_INSTRUCTIONS.md)
```

### **3. Database Setup**
```bash
npm run db:setup
```

### **4. First Run**
```bash
npm run dev
# Visit http://localhost:3000
# Complete installation if no admin exists
```

---

## 🏗️ **Architecture**

### **Database Schema (Sequelize + PostgreSQL)**
```
├── users (roles + branch assignment)
├── branches (metadata + M-Pesa credentials)
├── products (variants + barcodes + images)
├── product_variants (size, color, etc.)
├── inventory (branch-specific stock levels)
├── sales (receipts + payment tracking)
├── sale_items (line items with pricing)
├── payments (M-Pesa + cash + card tracking)
└── audit_logs (complete activity tracking)
```

### **Authentication & RBAC**
- **JWT-based authentication** with role hierarchy
- **Admin**: Full system control across all branches
- **Manager**: Branch-specific management and reporting
- **Head of Sales**: Staff management within branch
- **Salesperson**: POS operations and personal sales history

### **Payment Processing**
- **M-Pesa Integration**: STK Push and C2B per branch
- **Card Payments**: Stripe integration ready
- **Cash Handling**: Change calculation and tracking
- **Payment Reconciliation**: Automatic matching with sales

---

## 🔧 **Configuration**

### **Required Services**
1. **Aiven PostgreSQL** - Primary database with SSL
2. **Brevo Email API** - Receipt delivery and notifications
3. **Cloudinary** - Product image storage
4. **M-Pesa Daraja API** - Mobile money payments (per branch)

### **Environment Setup**
See `CONFIG_INSTRUCTIONS.md` for detailed configuration guide including:
- Database connection strings
- M-Pesa credentials per branch
- Email service configuration
- File storage setup

---

## 👥 **User Management**

### **Installation Process**
1. **First Run Check**: System detects if admin exists
2. **Installation Page**: Create first admin user if none exists
3. **Branch Setup**: Admin creates branches and configures M-Pesa
4. **User Creation**: Assign managers and salespersons to branches

### **Role Permissions**
- **Admin**: All branches, all features, system configuration
- **Manager**: Single branch, full branch management, reporting
- **Head of Sales**: Single branch, staff management, sales oversight
- **Salesperson**: Single branch, POS operations, personal history

---

## 🛒 **POS Features**

### **Sales Processing**
- **Barcode Scanning**: Camera, USB, and network scanner support
- **Product Search**: Intelligent search with fuzzy matching
- **Cart Management**: Real-time cart with stock validation
- **Payment Options**: Cash, M-Pesa, and card processing
- **Receipt Generation**: Professional receipts with email delivery

### **Inventory Integration**
- **Real-Time Updates**: Stock levels updated on each sale
- **Low Stock Alerts**: Automatic notifications to managers
- **Multi-Location**: Branch-specific inventory tracking
- **Reservation System**: Hold stock during checkout process

---

## 📊 **Analytics & Reporting**

### **Dashboard Features**
- **Real-Time Metrics**: Sales, revenue, and performance indicators
- **Branch Comparison**: Multi-branch performance analysis
- **Product Analytics**: Top sellers, profit margins, turnover rates
- **Staff Performance**: Individual salesperson tracking
- **Inventory Insights**: Stock levels, reorder recommendations

### **Automated Reports**
- **Daily Sales Reports**: Emailed to branch managers
- **Low Stock Alerts**: Automatic inventory notifications
- **Performance Summaries**: Weekly and monthly analytics
- **Audit Reports**: Security and compliance tracking

---

## 💳 **Payment Integration**

### **M-Pesa Configuration**
Each branch can have its own M-Pesa credentials:
- **STK Push**: Customer-initiated payments
- **C2B Validation**: Business-to-customer transactions
- **Callback Handling**: Automatic payment status updates
- **Reconciliation**: Match payments with sales transactions

### **Multi-Currency Support**
- **Branch-Specific Currencies**: USD, KES, EUR, etc.
- **Exchange Rates**: Automatic conversion for reporting
- **Localized Formatting**: Currency symbols and formatting per region

---

## 🔒 **Security Features**

### **Data Protection**
- **Encrypted Storage**: M-Pesa credentials encrypted at rest
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Granular permissions per user role
- **Audit Logging**: Complete activity tracking for compliance

### **Network Security**
- **SSL/TLS**: All communications encrypted
- **API Rate Limiting**: Protection against abuse
- **Input Validation**: Comprehensive data validation
- **CORS Configuration**: Secure cross-origin requests

---

## 🚀 **Deployment**

### **Vercel Deployment**
```bash
# Connect to Vercel
vercel

# Set environment variables in Vercel dashboard
# Deploy
vercel --prod
```

### **Production Checklist**
- [ ] Configure production database (Aiven PostgreSQL)
- [ ] Set up production M-Pesa credentials
- [ ] Configure email service (Brevo)
- [ ] Set up file storage (Cloudinary)
- [ ] Enable SSL certificates
- [ ] Configure monitoring and logging

---

## 📚 **Documentation**

### **Setup Guides**
- `CONFIG_INSTRUCTIONS.md` - Complete environment configuration
- `docs/DEPLOYMENT.md` - Production deployment guide
- `docs/API.md` - API documentation
- `docs/MPESA-INTEGRATION.md` - M-Pesa setup guide

### **Development**
```bash
# Development server
npm run dev

# Database operations
npm run db:migrate     # Run migrations
npm run db:seed        # Seed demo data
npm run db:reset       # Reset database

# Testing
npm run test           # Unit tests
npm run test:e2e       # End-to-end tests
```

---

## 🆘 **Support**

### **Getting Help**
- 📧 **Technical Support**: Create GitHub issue
- 📖 **Documentation**: See `/docs` folder
- 💬 **Community**: Join our Discord server

### **Common Issues**
- **Database Connection**: Check Aiven PostgreSQL credentials
- **M-Pesa Integration**: Verify callback URLs and credentials
- **Email Delivery**: Confirm Brevo API configuration
- **File Uploads**: Ensure Cloudinary setup is correct

---

## 🏆 **Production Ready**

This system is **enterprise-ready** and includes:
- ✅ **Complete Multi-Branch Operations** - Full retail workflow support
- ✅ **Professional User Interfaces** - Modern, responsive design
- ✅ **Comprehensive Security** - Enterprise-grade protection
- ✅ **Scalable Architecture** - Built for growth and expansion
- ✅ **Business Intelligence** - Advanced analytics and reporting
- ✅ **Payment Processing** - Multiple payment methods with reconciliation
- ✅ **Audit & Compliance** - Complete activity tracking and reporting

**Ready to deploy and manage your multi-branch retail operations today!**

---

## 📄 **License**

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ for modern retail operations**