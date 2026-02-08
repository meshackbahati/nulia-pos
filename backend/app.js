import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import sequelize from './lib/database.js';

// Route imports
import authRoutes from './routes/auth.js';
import salesRoutes from './routes/sales.js';
import productRoutes from './routes/products.js';
import inventoryRoutes from './routes/inventory.js';
import branchRoutes from './routes/branches.js';
import userRoutes from './routes/users.js';
import settingRoutes from './routes/settings.js';
import analyticsRoutes from './routes/analytics.js';
import mpesaRoutes from './routes/mpesa.js';
import installRoutes from './routes/install.js';
import supplierRoutes from './routes/suppliers.js';
import poRoutes from './routes/purchase-orders.js';
import receiptRoutes from './routes/receipts.js';
import paystackRoutes from './routes/paystack.js';

dotenv.config();

const app = express();

// 1. GLOBAL REQUEST LOGGER (DEBUG)
app.use((req, res, next) => {
    console.log(`[TRAFFIC] ${new Date().toISOString()} ${req.method} ${req.url}`);
    console.log(`[TRAFFIC] Headers: ${JSON.stringify(req.headers)}`);
    next();
});

// 2. ULTRA-PERMISSIVE CORS FOR DEBUGGING
app.use(cors({
    origin: (origin, callback) => {
        // Allow all origins, including those with subdomains or local/hosted
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Branch-ID', 'Cache-Control', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie']
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 3. MINIMAL SECURITY HEADERS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/install', installRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-orders', poRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/paystack', paystackRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.json({ status: 'OK', database: 'connected' });
    } catch (error) {
        res.status(500).json({ status: 'ERROR', database: 'disconnected', error: error.message });
    }
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ message: 'BorderShop POS API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
    });
});

export default app;
