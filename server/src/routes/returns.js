import express from 'express';
import models, { sequelize } from '../models/index.js';
import { authenticate, authorize } from '../lib/auth.js';
import { createAuditLog, AUDIT_ACTIONS, AUDIT_RESOURCES } from '../lib/audit.js';
import { Op } from 'sequelize';
import { Decimal } from 'decimal.js';
import { triggerWebhook, WEBHOOK_EVENTS } from '../services/webhookService.js';

const router = express.Router();

/**
 * @openapi
 * /api/returns:
 *   get:
 *     tags: [Returns]
 *     summary: List returns with filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: branchId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Returns list
 */
router.get('/', authenticate, authorize('head_of_sales'), async (req, res) => {
    try {
        const branchId = req.query.branchId || req.user.branchId;
        const where = { branchId };
        if (req.query.status) where.status = req.query.status;

        const returns = await models.Return.findAll({
            where,
            include: [
                { model: models.Sale, as: 'sale', attributes: ['id', 'receiptId', 'totalAmount', 'createdAt'] },
                { model: models.Customer, as: 'customer', attributes: ['id', 'firstName', 'lastName', 'phone'] },
                { model: models.User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] },
                { model: models.User, as: 'approver', attributes: ['id', 'firstName', 'lastName'] },
                {
                    model: models.ReturnItem, as: 'items',
                    include: [
                        { model: models.Product, as: 'product', attributes: ['id', 'name', 'sku'] },
                    ],
                },
            ],
            order: [['createdAt', 'DESC']],
            limit: 100,
        });

        res.json({ returns });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/returns/{id}:
 *   get:
 *     tags: [Returns]
 *     summary: Get a single return
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const ret = await models.Return.findByPk(req.params.id, {
            include: [
                { model: models.Sale, as: 'sale' },
                { model: models.Customer, as: 'customer' },
                { model: models.User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] },
                { model: models.User, as: 'approver', attributes: ['id', 'firstName', 'lastName'] },
                {
                    model: models.ReturnItem, as: 'items',
                    include: [
                        { model: models.Product, as: 'product' },
                        { model: models.SaleItem, as: 'saleItem' },
                        { model: models.SerialNumber, as: 'serialNumber' },
                    ],
                },
            ],
        });
        if (!ret) return res.status(404).json({ error: 'Return not found' });
        res.json({ return: ret });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/returns:
 *   post:
 *     tags: [Returns]
 *     summary: Create a return (refunds + restocks)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [saleId, reason, items]
 *             properties:
 *               saleId: { type: string }
 *               reason: { type: string }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     saleItemId: { type: string }
 *                     quantityReturned: { type: number }
 *                     refundAmount: { type: number }
 *                     restock: { type: boolean }
 *                     condition: { type: string }
 *     responses:
 *       201:
 *         description: Return created
 */
router.post('/', authenticate, authorize('manager'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { saleId, customerId, reason, items, notes } = req.body;
        const branchId = req.body.branchId || req.user.branchId;

        if (!saleId || !reason || !items || !Array.isArray(items) || items.length === 0) {
            await t.rollback();
            return res.status(400).json({ error: 'saleId, reason, and items are required' });
        }

        const sale = await models.Sale.findByPk(saleId, {
            include: [{ model: models.SaleItem, as: 'items' }],
            transaction: t,
        });
        if (!sale) {
            await t.rollback();
            return res.status(404).json({ error: 'Sale not found' });
        }
        if (sale.isVoided()) {
            await t.rollback();
            return res.status(400).json({ error: 'Cannot return a voided sale' });
        }

        // Create the return record
        const ret = await models.Return.create({
            branchId, saleId, customerId: customerId || null,
            reason, notes, status: 'pending', createdBy: req.user.userId,
        }, { transaction: t });

        let totalRefund = new Decimal(0);

        // Process each return item
        for (const item of items) {
            const saleItem = await models.SaleItem.findByPk(item.saleItemId, { transaction: t });
            if (!saleItem) {
                await t.rollback();
                return res.status(400).json({ error: `SaleItem ${item.saleItemId} not found` });
            }

            const qtyReturned = new Decimal(item.quantityReturned);
            const refundAmount = new Decimal(item.refundAmount);
            totalRefund = totalRefund.add(refundAmount);

            await models.ReturnItem.create({
                returnId: ret.id,
                saleItemId: item.saleItemId,
                productId: saleItem.productId,
                variantId: saleItem.variantId || null,
                quantityReturned: qtyReturned.toNumber(),
                refundAmount: refundAmount.toNumber(),
                restock: item.restock !== false,
                condition: item.condition || 'used',
            }, { transaction: t });

            // Restock inventory if requested
            if (item.restock !== false) {
                let inventory = await models.Inventory.findOne({
                    where: {
                        branchId,
                        productId: saleItem.productId,
                        variantId: saleItem.variantId || null,
                    },
                    transaction: t,
                });

                if (inventory) {
                    const oldQty = Number(inventory.quantity);
                    await inventory.increment('quantity', {
                        by: qtyReturned.toString(),
                        transaction: t,
                    });
                    await createAuditLog({
                        action: AUDIT_ACTIONS.INVENTORY_UPDATE,
                        resource: AUDIT_RESOURCES.INVENTORY,
                        resourceId: inventory.id,
                        userId: req.user.userId,
                        branchId,
                        oldValues: { quantity: oldQty },
                        newValues: { quantity: oldQty + qtyReturned.toNumber(), reason: `return_${ret.id}` },
                        metadata: { returnId: ret.id, saleItemId: item.saleItemId },
                    }, req);
                }
            }
        }

        await t.commit();

        const io = req.app.get('io');
        await triggerWebhook(WEBHOOK_EVENTS.RETURN_CREATED, {
            returnId: ret.id,
            saleId,
            totalRefund: totalRefund.toNumber(),
            reason,
            items: items.length,
        }, branchId, io);

        if (io) {
            await io.to(`branch-${branchId}`).emit('return-created', { returnId: ret.id, saleId });
            await io.to(`branch-${branchId}`).emit('inventory-update', { branchId });
        }

        res.status(201).json({
            return: ret,
            totalRefund: totalRefund.toNumber(),
        });
    } catch (error) {
        try {
            if (t) await t.rollback();
        } catch (rbErr) {
            console.error('[returns/create] Rollback failed:', rbErr.message);
        }
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/returns/{id}/approve:
 *   post:
 *     tags: [Returns]
 *     summary: Approve a return (changes status from pending to approved or rejected)
 */
router.post('/:id/approve', authenticate, authorize('admin'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const ret = await models.Return.findByPk(req.params.id, { transaction: t });
        if (!ret) {
            await t.rollback();
            return res.status(404).json({ error: 'Return not found' });
        }
        if (ret.status !== 'pending') {
            await t.rollback();
            return res.status(400).json({ error: `Return already ${ret.status}` });
        }

        const { approved, notes } = req.body;
        const newStatus = approved ? 'approved' : 'rejected';
        ret.status = newStatus;
        ret.approvedBy = req.user.userId;
        ret.processedAt = new Date();
        if (notes) ret.notes = notes;
        await ret.save({ transaction: t });

        // If approved, mark sale payments as refunded
        if (approved) {
            await models.Payment.update(
                { status: 'refunded' },
                { where: { saleId: ret.saleId, status: 'completed' }, transaction: t }
            );
        }

        await t.commit();

        const returnData = ret.toJSON();
        if (approved) {
            await triggerWebhook(WEBHOOK_EVENTS.RETURN_COMPLETED, {
                returnId: ret.id,
                saleId: ret.saleId,
                status: 'approved',
            }, ret.branchId, req.app.get('io'));
        }

        res.json({ return: returnData });
    } catch (error) {
        try {
            if (t) await t.rollback();
        } catch (rbErr) {
            console.error('[returns/approve] Rollback failed:', rbErr.message);
        }
        res.status(500).json({ error: error.message });
    }
});

export default router;
