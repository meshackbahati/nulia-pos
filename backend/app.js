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
import exchangeRateRoutes from './routes/exchange-rates.js';
import printingRoutes from './routes/printing.js';
import { idempotency } from './lib/idempotency.js';

dotenv.config();

const app = express();

// CORS - allow all origins explicitly with the cors package (defense in depth)
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Branch-ID', 'Cache-Control', 'X-Requested-With', 'Accept', 'Idempotency-Key'],
    maxAge: 86400
}));

// 1. ULTRA-LOOSE CORS & TRAFFIC LOGGER (DEBUG)
app.use((req, res, next) => {
    // ALWAYS set CORS headers for every request
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Branch-ID, Cache-Control, X-Requested-With, Accept, Idempotency-Key');
    res.setHeader('Access-Control-Max-Age', '86400');

    // Handle OPTIONS immediately to bypass any other middleware
    if (req.method === 'OPTIONS') {
        console.log(`[CORS] Short-circuit OPTIONS: ${req.url}`);
        return res.status(200).end();
    }

    // Traffic Log
    console.log(`[TRAFFIC] ${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

app.use(morgan('dev'));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Apply idempotency check
app.use(idempotency);

// 2. LOOSE SECURITY HEADERS & PERMISSIONS POLICY
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
    // SILENCE Permissions-Policy unrecognized feature errors by providing an explicit empty/narrow policy
    // We only enable features we actually need, or leave empty if none are used.
    res.setHeader('Permissions-Policy', 'camera=*, microphone=(), geolocation=(), browsing-topics=()');
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
app.use('/api/exchange-rates', exchangeRateRoutes);
app.use('/api/print', printingRoutes);

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

    // Ensure CORS headers even on error
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
    });
});

export default app;
