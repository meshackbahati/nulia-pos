import express from 'express';
import models, { sequelize } from '../models/index.js';
import { authenticate, authorize } from '../lib/auth.js';
import { Op } from 'sequelize';

const router = express.Router();

/**
 * @openapi
 * /api/serials:
 *   get:
 *     tags: [Serial Numbers]
 *     summary: List/search serial numbers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [in_stock, sold, voided, returned] }
 *       - in: query
 *         name: productId
 *         schema: { type: string }
 *       - in: query
 *         name: branchId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Serial number list
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const branchId = req.query.branchId || req.user.branchId;
        const where = { branchId };

        if (req.query.status) where.status = req.query.status;
        if (req.query.productId) where.productId = req.query.productId;
        if (req.query.search) {
            where[Op.or] = [
                { serialNumber: { [Op.iLike]: `%${req.query.search}%` } },
                { batchNumber: { [Op.iLike]: `%${req.query.search}%` } },
            ];
        }

        const serials = await models.SerialNumber.findAll({
            where,
            include: [
                { model: models.Product, as: 'product', attributes: ['id', 'name', 'sku'] },
            ],
            order: [['receivedAt', 'DESC']],
            limit: 200,
        });

        res.json({ serialNumbers: serials });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/serials:
 *   post:
 *     tags: [Serial Numbers]
 *     summary: Register serial numbers (batch import)
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
 *               serialNumbers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     serialNumber: { type: string }
 *                     batchNumber: { type: string }
 *                     expiryDate: { type: string }
 *                     costPrice: { type: number }
 *     responses:
 *       201:
 *         description: Serial numbers registered
 */
router.post('/', authenticate, authorize('manager'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { productId, serialNumbers } = req.body;
        const branchId = req.body.branchId || req.user.branchId;

        if (!productId || !serialNumbers || !Array.isArray(serialNumbers) || serialNumbers.length === 0) {
            await t.rollback();
            return res.status(400).json({ error: 'productId and serialNumbers array are required' });
        }

        const product = await models.Product.findByPk(productId, { transaction: t });
        if (!product) {
            await t.rollback();
            return res.status(404).json({ error: 'Product not found' });
        }

        const created = [];
        const errors = [];

        for (const item of serialNumbers) {
            if (!item.serialNumber) {
                errors.push({ serialNumber: item.serialNumber, error: 'serialNumber is required' });
                continue;
            }

            // Check duplicate
            const existing = await models.SerialNumber.findOne({
                where: { serialNumber: item.serialNumber },
                transaction: t,
            });
            if (existing) {
                errors.push({ serialNumber: item.serialNumber, error: 'Already exists' });
                continue;
            }

            const serial = await models.SerialNumber.create({
                productId, branchId,
                serialNumber: item.serialNumber,
                batchNumber: item.batchNumber || null,
                expiryDate: item.expiryDate || null,
                costPrice: item.costPrice || null,
                status: 'in_stock',
            }, { transaction: t });

            created.push(serial);
        }

        await t.commit();

        res.status(201).json({
            created: created.length, errors,
            serialNumbers: created,
        });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/serials/lookup:
 *   get:
 *     tags: [Serial Numbers]
 *     summary: Quick lookup by serial number
 */
router.get('/lookup', authenticate, async (req, res) => {
    try {
        const { serial } = req.query;
        if (!serial) return res.status(400).json({ error: 'serial is required' });

        const serialNumber = await models.SerialNumber.findOne({
            where: { serialNumber: serial, branchId: req.user.branchId },
            include: [{ model: models.Product, as: 'product', attributes: ['id', 'name', 'sku', 'basePrice'] }],
        });

        if (!serialNumber) return res.status(404).json({ error: 'Serial number not found' });

        res.json({ serialNumber });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/serials/available:
 *   get:
 *     tags: [Serial Numbers]
 *     summary: Get available serial numbers for a product
 */
router.get('/available', authenticate, async (req, res) => {
    try {
        const { productId } = req.query;
        const branchId = req.query.branchId || req.user.branchId;

        if (!productId) return res.status(400).json({ error: 'productId is required' });

        const serials = await models.SerialNumber.findAll({
            where: { productId, branchId, status: 'in_stock' },
            order: [['receivedAt', 'ASC']],
        });

        res.json({ serialNumbers: serials });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
