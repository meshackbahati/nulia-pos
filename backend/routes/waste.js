import express from 'express';
import models, { sequelize } from '../models/index.js';
import { authenticate, authorize } from '../lib/auth.js';
import { createAuditLog, AUDIT_ACTIONS, AUDIT_RESOURCES } from '../lib/audit.js';
import { Op, fn, col, literal } from 'sequelize';
import { Decimal } from 'decimal.js';

const router = express.Router();

/**
 * @openapi
 * /api/waste:
 *   get:
 *     tags: [Waste]
 *     summary: List waste records with filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string }
 *       - in: query
 *         name: to
 *         schema: { type: string }
 *       - in: query
 *         name: reason
 *         schema: { type: string }
 *       - in: query
 *         name: branchId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Waste records
 */
router.get('/', authenticate, authorize('head_of_sales'), async (req, res) => {
    try {
        const branchId = req.query.branchId || req.user.branchId;
        const where = { branchId };

        if (req.query.from) {
            where.recordedAt = { ...where.recordedAt, [Op.gte]: new Date(req.query.from) };
        }
        if (req.query.to) {
            where.recordedAt = { ...where.recordedAt, [Op.lte]: new Date(req.query.to) };
        }
        if (req.query.reason) {
            where.reason = req.query.reason;
        }

        const records = await models.Waste.findAll({
            where,
            include: [
                { model: models.Product, as: 'product', attributes: ['id', 'name', 'sku'] },
                { model: models.User, as: 'recorder', attributes: ['id', 'firstName', 'lastName'] },
            ],
            order: [['recordedAt', 'DESC']],
            limit: 200,
        });

        res.json({ waste: records });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/waste/summary:
 *   get:
 *     tags: [Waste]
 *     summary: Aggregate waste summary by reason and month
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Waste summary
 */
router.get('/summary', authenticate, authorize('head_of_sales'), async (req, res) => {
    try {
        const branchId = req.query.branchId || req.user.branchId;

        const byReason = await models.Waste.findAll({
            where: { branchId },
            attributes: [
                'reason',
                [fn('SUM', col('quantity')), 'totalQuantity'],
                [fn('SUM', col('costValue')), 'totalCost'],
                [fn('COUNT', col('id')), 'count'],
            ],
            group: ['reason'],
            raw: true,
        });

        const byMonth = await models.Waste.findAll({
            where: { branchId },
            attributes: [
                [fn('TO_CHAR', col('recordedAt'), 'YYYY-MM'), 'month'],
                [fn('SUM', col('costValue')), 'totalCost'],
                [fn('COUNT', col('id')), 'count'],
            ],
            group: [fn('TO_CHAR', col('recordedAt'), 'YYYY-MM')],
            order: [[fn('TO_CHAR', col('recordedAt'), 'YYYY-MM'), 'DESC']],
            raw: true,
        });

        res.json({ byReason, byMonth });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/waste:
 *   post:
 *     tags: [Waste]
 *     summary: Record a waste/spoilage/breakage entry (deducts from inventory)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity, reason]
 *             properties:
 *               productId: { type: string }
 *               variantId: { type: string }
 *               quantity: { type: number }
 *               reason: { type: string, enum: [spoilage, damage, expired, theft, breakage, other] }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Waste record created and inventory adjusted
 */
router.post('/', authenticate, async (req, res) => {
    if (!authorize('manager')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const t = await sequelize.transaction();
    try {
        const { productId, variantId, quantity, reason, notes } = req.body;
        const branchId = req.body.branchId || req.user.branchId;

        if (!productId || !quantity || !reason) {
            return res.status(400).json({ error: 'productId, quantity, and reason are required' });
        }

        const qty = new Decimal(quantity);
        if (qty.isNegative() || qty.isZero()) {
            return res.status(400).json({ error: 'Quantity must be positive' });
        }

        // Find and deduct inventory
        let inventory = await models.Inventory.findOne({
            where: { branchId, productId, variantId: variantId || null },
            transaction: t,
        });

        if (!inventory || Number(inventory.quantity) < Number(qty.toString())) {
            await t.rollback();
            return res.status(400).json({
                error: 'Insufficient stock',
                available: inventory ? Number(inventory.quantity) : 0,
            });
        }

        const product = await models.Product.findByPk(productId, { transaction: t });
        const costValue = product && product.costPrice
            ? new Decimal(product.costPrice).mul(qty).toNumber()
            : null;

        const oldQty = Number(inventory.quantity);
        const newQty = oldQty - Number(qty.toString());
        await inventory.update({ quantity: newQty }, { transaction: t });

        const waste = await models.Waste.create({
            branchId, productId, variantId: variantId || null,
            quantity: Number(qty.toString()),
            reason,
            notes,
            costValue,
            recordedBy: req.user.userId,
        }, { transaction: t });

        await createAuditLog({
            action: AUDIT_ACTIONS.INVENTORY_ADJUSTMENT,
            resource: AUDIT_RESOURCES.INVENTORY,
            resourceId: inventory.id,
            userId: req.user.userId,
            branchId,
            oldValues: { quantity: oldQty },
            newValues: { quantity: newQty, reason: `waste_${reason}`, wasteId: waste.id },
            metadata: { wasteId: waste.id, productId, reason },
        }, req);

        await t.commit();

        const io = req.app.get('io');
        if (io) {
            io.to(`branch-${branchId}`).emit('inventory-update', { branchId });
        }

        res.status(201).json({ waste });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/waste/{id}:
 *   delete:
 *     tags: [Waste]
 *     summary: Delete a waste record
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const record = await models.Waste.findByPk(req.params.id);
        if (!record) return res.status(404).json({ error: 'Waste record not found' });

        await record.destroy();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
