import express from 'express';
import models from '../models/index.js';
import { authenticate, authorize } from '../lib/auth.js';
import { Op } from 'sequelize';

const router = express.Router();

/**
 * @openapi
 * /api/bundles/{productId}:
 *   get:
 *     tags: [Bundles]
 *     summary: Get bundle components for a product
 *     security:
 *       - bearerAuth: []
 */
router.get('/:productId', authenticate, async (req, res) => {
    try {
        const bundles = await models.ProductBundle.findAll({
            where: { productId: req.params.productId, isActive: true },
            include: [
                { model: models.Product, as: 'componentProduct', attributes: ['id', 'name', 'sku', 'basePrice', 'costPrice'] },
            ],
        });
        res.json({ bundles });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/bundles:
 *   post:
 *     tags: [Bundles]
 *     summary: Add component to a bundle product
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId: { type: string }
 *               componentProductId: { type: string }
 *               quantity: { type: number }
 *     responses:
 *       201:
 *         description: Bundle component added
 */
router.post('/', authenticate, authorize('manager'), async (req, res) => {
    try {
        const { productId, componentProductId, componentVariantId, quantity } = req.body;
        if (!productId || !componentProductId) {
            return res.status(400).json({ error: 'productId and componentProductId are required' });
        }

        const bundle = await models.ProductBundle.create({
            productId, componentProductId,
            componentVariantId: componentVariantId || null,
            quantity: quantity || 1,
        });

        res.status(201).json({ bundle });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/bundles/{id}:
 *   delete:
 *     tags: [Bundles]
 *     summary: Remove a component from a bundle
 */
router.delete('/:id', authenticate, authorize('manager'), async (req, res) => {
    try {
        const bundle = await models.ProductBundle.findByPk(req.params.id);
        if (!bundle) return res.status(404).json({ error: 'Bundle component not found' });

        await bundle.destroy();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
