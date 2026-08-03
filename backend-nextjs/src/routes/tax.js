import express from 'express';
import models from '../models/index.js';
import { authenticate, authorize } from '../lib/auth.js';

const router = express.Router();

/**
 * @openapi
 * /api/tax-rates:
 *   get:
 *     tags: [Tax]
 *     summary: List tax rates for a branch
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tax rates list
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const branchId = req.query.branchId || req.user.branchId;
        const rates = await models.TaxRate.findAll({
            where: { [models.Op.or]: [{ branchId }, { branchId: null }], isActive: true },
            order: [['name', 'ASC']],
        });
        res.json({ taxRates: rates });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/tax-rates:
 *   post:
 *     tags: [Tax]
 *     summary: Create a tax rate
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
 *               rate: { type: number }
 *               type: { type: string, enum: [inclusive, exclusive] }
 *               isDefault: { type: boolean }
 *     responses:
 *       201:
 *         description: Tax rate created
 */
router.post('/', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { name, rate, type, isDefault, appliesTo } = req.body;
        const branchId = req.body.branchId || req.user.branchId;

        if (!name || rate === undefined || rate === null) {
            return res.status(400).json({ error: 'name and rate are required' });
        }

        // If setting as default, unset other defaults
        if (isDefault) {
            await models.TaxRate.update(
                { isDefault: false },
                { where: { branchId, isDefault: true } }
            );
        }

        const taxRate = await models.TaxRate.create({
            branchId, name, rate, type: type || 'exclusive',
            isDefault: isDefault || false, appliesTo: appliesTo || null,
        });

        res.status(201).json({ taxRate });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/tax-rates/{id}:
 *   put:
 *     tags: [Tax]
 *     summary: Update a tax rate
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const taxRate = await models.TaxRate.findByPk(req.params.id);
        if (!taxRate) return res.status(404).json({ error: 'Tax rate not found' });

        const { name, rate, type, isDefault, appliesTo, isActive } = req.body;

        if (isDefault) {
            await models.TaxRate.update(
                { isDefault: false },
                { where: { branchId: taxRate.branchId, isDefault: true, id: { [models.Op.ne]: taxRate.id } } }
            );
        }

        if (name) taxRate.name = name;
        if (rate !== undefined) taxRate.rate = rate;
        if (type) taxRate.type = type;
        if (isDefault !== undefined) taxRate.isDefault = isDefault;
        if (appliesTo) taxRate.appliesTo = appliesTo;
        if (isActive !== undefined) taxRate.isActive = isActive;

        await taxRate.save();
        res.json({ taxRate });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/tax-rates/{id}:
 *   delete:
 *     tags: [Tax]
 *     summary: Delete a tax rate
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const taxRate = await models.TaxRate.findByPk(req.params.id);
        if (!taxRate) return res.status(404).json({ error: 'Tax rate not found' });

        await taxRate.destroy();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/tax-rates/default:
 *   get:
 *     tags: [Tax]
 *     summary: Get default tax rate for a branch
 *     security:
 *       - bearerAuth: []
 */
router.get('/default', authenticate, async (req, res) => {
    try {
        const branchId = req.query.branchId || req.user.branchId;
        let taxRate = await models.TaxRate.findOne({
            where: { branchId, isDefault: true, isActive: true },
        });
        if (!taxRate) {
            taxRate = await models.TaxRate.findOne({
                where: { branchId: null, isDefault: true, isActive: true },
            });
        }
        res.json({ taxRate });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
