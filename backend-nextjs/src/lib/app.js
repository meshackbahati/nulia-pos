import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './database.js';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Route imports
import authRoutes from '../routes/auth.js';
import salesRoutes from '../routes/sales.js';
import productRoutes from '../routes/products.js';
import inventoryRoutes from '../routes/inventory.js';
import branchRoutes from '../routes/branches.js';
import userRoutes from '../routes/users.js';
import settingRoutes from '../routes/settings.js';
import analyticsRoutes from '../routes/analytics.js';
import mpesaRoutes from '../routes/mpesa.js';
import installRoutes from '../routes/install.js';
import supplierRoutes from '../routes/suppliers.js';
import poRoutes from '../routes/purchase-orders.js';
import receiptRoutes from '../routes/receipts.js';
import paystackRoutes from '../routes/paystack.js';
import exchangeRateRoutes from '../routes/exchange-rates.js';
import dunRoutes from '../routes/dun.js';
import wasteRoutes from '../routes/waste.js';
import cashRoutes from '../routes/cash.js';
import expenseRoutes from '../routes/expenses.js';
import customerRoutes from '../routes/customers.js';
import returnRoutes from '../routes/returns.js';
import webhookRoutes from '../routes/webhooks.js';
import integrationRoutes from '../routes/integrations.js';
import taxRoutes from '../routes/tax.js';
import bundleRoutes from '../routes/bundles.js';
import serialRoutes from '../routes/serials.js';
import warehouseRoutes from '../routes/warehouses.js';
import exportRoutes from '../routes/export.js';
import realtimeRoutes from '../routes/realtime.js';
import { idempotency } from './idempotency.js';
import { authLimiter, installLimiter, receiptLimiter, publicLimiter } from './rateLimiter.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const startTime = Date.now();

let pkg = {};
try {
    pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
} catch { }

const app = express();

// CORS - allow all origins explicitly with the cors package (defense in depth)
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Branch-ID', 'Cache-Control', 'X-Requested-With', 'Accept', 'Idempotency-Key'],
    maxAge: 86400
}));

// ULTRA-LOOSE CORS & TRAFFIC LOGGER (DEBUG)
app.use((req, res, next) => {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Branch-ID, Cache-Control, X-Requested-With, Accept, Idempotency-Key');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    next();
});

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Apply idempotency check
app.use(idempotency);

// LOOSE SECURITY HEADERS & PERMISSIONS POLICY
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
    res.setHeader('Permissions-Policy', 'camera=*, microphone=(), geolocation=(), browsing-topics=()');
    next();
});

// Rate limiting - apply to sensitive routes
app.use('/api/auth', authLimiter);
app.use('/api/install', installLimiter);
app.use('/api/receipts', receiptLimiter);
app.use('/health', publicLimiter);

// Swagger API docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

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
app.use('/api/waste', wasteRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/tax-rates', taxRoutes);
app.use('/api/bundles', bundleRoutes);
app.use('/api/serials', serialRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/realtime', realtimeRoutes);
app.use('/api', dunRoutes);

// Enhanced health check endpoint
app.get('/health', async (req, res) => {
    const mem = process.memoryUsage();
    let dbStatus = 'disconnected';
    try {
        await sequelize.authenticate();
        dbStatus = 'connected';
    } catch { }

    res.json({
        status: dbStatus === 'connected' ? 'OK' : 'DEGRADED',
        version: pkg.version || '1.0.0',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        database: dbStatus,
        memory: {
            heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
            heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + 'MB',
            rss: Math.round(mem.rss / 1024 / 1024) + 'MB',
        },
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'BorderShop POS API is running',
        docs: '/api-docs',
        health: '/health',
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);

    const origin = req.headers.origin;
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
    });
});

// 404 handler for unmatched /api routes
app.use('/api', (req, res) => {
    res.status(404).json({ error: `Not Found: ${req.method} ${req.originalUrl}` });
});

export default app;
