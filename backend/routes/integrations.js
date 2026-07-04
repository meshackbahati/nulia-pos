import express from 'express';
import models from '../models/index.js';
import { authenticate, authorize } from '../lib/auth.js';
import { testIntegration, syncIntegration, disconnectIntegration } from '../services/integrationService.js';

const router = express.Router();

/**
 * @openapi
 * /api/integrations:
 *   get:
 *     tags: [Integrations]
 *     summary: List integrations
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, authorize('admin'), async (req, res) => {
    try {
        const branchId = req.query.branchId || req.user.branchId;
        const integrations = await models.Integration.findAll({
            where: { branchId },
            order: [['name', 'ASC']],
        });
        res.json({ integrations });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/integrations:
 *   post:
 *     tags: [Integrations]
 *     summary: Create an integration connection
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               provider: { type: string, enum: [quickbooks, zoho_books, sage, xero, shopify, woocommerce, custom] }
 *               config: { type: object }
 *     responses:
 *       201:
 *         description: Integration created
 */
router.post('/', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { name, provider, config, syncDirection, syncFrequency } = req.body;
        const branchId = req.body.branchId || req.user.branchId;

        if (!name || !provider) {
            return res.status(400).json({ error: 'name and provider are required' });
        }

        // Test the connection before saving
        try {
            await testIntegration(provider, config);
        } catch (testErr) {
            return res.status(400).json({ error: `Connection test failed: ${testErr.message}` });
        }

        const integration = await models.Integration.create({
            branchId, name, provider, config: config || {},
            syncDirection: syncDirection || 'export',
            syncFrequency: syncFrequency || 'manual',
            isActive: true,
            lastStatus: 'connected',
        });

        res.status(201).json({ integration });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/integrations/{id}:
 *   put:
 *     tags: [Integrations]
 *     summary: Update integration config
 */
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const integration = await models.Integration.findByPk(req.params.id);
        if (!integration) return res.status(404).json({ error: 'Integration not found' });

        const updatable = ['name', 'config', 'syncDirection', 'syncFrequency', 'isActive'];
        updatable.forEach(f => {
            if (req.body[f] !== undefined) integration[f] = req.body[f];
        });

        if (req.body.config) {
            try {
                await testIntegration(integration.provider, req.body.config);
                integration.lastStatus = 'connected';
            } catch (testErr) {
                return res.status(400).json({ error: `Connection test failed: ${testErr.message}` });
            }
        }

        await integration.save();
        res.json({ integration });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/integrations/{id}:
 *   delete:
 *     tags: [Integrations]
 *     summary: Disconnect and remove integration
 */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const integration = await models.Integration.findByPk(req.params.id);
        if (!integration) return res.status(404).json({ error: 'Integration not found' });

        await disconnectIntegration(integration);
        await integration.destroy();

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/integrations/{id}/sync:
 *   post:
 *     tags: [Integrations]
 *     summary: Trigger a manual sync for products or sales
 */
router.post('/:id/sync', authenticate, authorize('admin'), async (req, res) => {
    try {
        const integration = await models.Integration.findByPk(req.params.id);
        if (!integration) return res.status(404).json({ error: 'Integration not found' });
        if (!integration.isActive) return res.status(400).json({ error: 'Integration is not active' });

        const { dataType } = req.body;
        if (!dataType || !['products', 'sales'].includes(dataType)) {
            return res.status(400).json({ error: 'dataType must be "products" or "sales"' });
        }

        const results = await syncIntegration(integration, dataType, models);
        res.json({ results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/integrations/providers:
 *   get:
 *     tags: [Integrations]
 *     summary: List available providers
 */
router.get('/providers', authenticate, async (req, res) => {
    res.json({
        providers: [
            { id: 'quickbooks', name: 'QuickBooks Online', type: 'accounting' },
            { id: 'zoho_books', name: 'Zoho Books', type: 'accounting' },
            { id: 'sage', name: 'Sage', type: 'accounting' },
            { id: 'xero', name: 'Xero', type: 'accounting' },
            { id: 'shopify', name: 'Shopify', type: 'ecommerce' },
            { id: 'woocommerce', name: 'WooCommerce', type: 'ecommerce' },
            { id: 'custom', name: 'Custom Webhook', type: 'custom' },
        ],
    });
});

export default router;
