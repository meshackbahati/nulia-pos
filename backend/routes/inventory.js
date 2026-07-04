import express from 'express';
import models, { sequelize } from '../models/index.js';
import { authenticate, authorize, hasPermission } from '../lib/auth.js';
import { createAuditLog, AUDIT_ACTIONS, AUDIT_RESOURCES } from '../lib/audit.js';
import { Op } from 'sequelize';
import { Decimal } from 'decimal.js';
import { triggerWebhook, WEBHOOK_EVENTS } from '../services/webhookService.js';

const router = express.Router();

// Get low stock products
router.get('/low-stock', authenticate, authorize('head_of_sales'), async (req, res) => {
    try {
        const { threshold = 10, branchId } = req.query;
        const targetBranchId = branchId || req.user.branchId;

        const products = await models.Product.findAll({
            where: { isActive: true },
            include: [
                {
                    model: models.Inventory,
                    as: 'inventory',
                    where: {
                        branchId: targetBranchId,
                        quantity: { [Op.lte]: Number(threshold) }
                    },
                    required: true
                }
            ],
            order: [[{ model: models.Inventory, as: 'inventory' }, 'quantity', 'ASC']]
        });

        res.json({
            lowStockProducts: products,
            count: products.length
        });
    } catch (error) {
        console.error('Low stock error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update inventory level / Restock
router.post('/restock', authenticate, async (req, res) => {
    // Check permissions
    if (req.user.role === 'head_of_sales') {
        if (!req.user.permissions?.canManageInventory) {
            return res.status(403).json({ error: 'Head of Sales does not have inventory write access' });
        }
    } else if (!hasPermission(req.user.role, 'manager')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const t = await sequelize.transaction();
    try {
        const { items, branchId, reason } = req.body;
        const targetBranchId = branchId || req.user.branchId;

        for (const item of items) {
            let inventory = await models.Inventory.findOne({
                where: {
                    branchId: targetBranchId,
                    productId: item.productId,
                    variantId: item.variantId || null
                },
                transaction: t
            });

            if (!inventory) {
                inventory = await models.Inventory.create({
                    branchId: targetBranchId,
                    productId: item.productId,
                    variantId: item.variantId || null,
                    quantity: 0
                }, { transaction: t });
            }

            const qtyToAdd = new Decimal(item.quantity);
            await inventory.increment('quantity', { by: qtyToAdd.toString(), transaction: t });
            await inventory.update({ lastRestockedAt: new Date() }, { transaction: t });
        }

        await t.commit();

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.to(`branch-${targetBranchId}`).emit('inventory-update', { branchId: targetBranchId });
        }

        triggerWebhook(WEBHOOK_EVENTS.INVENTORY_ADJUSTED, {
            branchId: targetBranchId,
            items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
            type: 'restock',
        }, targetBranchId, io);

        res.json({ success: true });
    } catch (error) {
        await t.rollback();
        console.error('Inventory restock error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Inventory adjustment (positive = add stock, negative = remove stock)
router.post('/adjust', authenticate, async (req, res) => {
    if (req.user.role === 'head_of_sales') {
        if (!req.user.permissions?.canManageInventory) {
            return res.status(403).json({ error: 'Head of Sales does not have inventory write access' });
        }
    } else if (!hasPermission(req.user.role, 'manager')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const t = await sequelize.transaction();
    try {
        const { items, branchId, reason } = req.body;
        const targetBranchId = branchId || req.user.branchId;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'items array is required' });
        }

        const adjustments = [];

        for (const item of items) {
            const qty = new Decimal(item.quantity || 0);
            if (qty.isZero()) continue;

            let inventory = await models.Inventory.findOne({
                where: {
                    branchId: targetBranchId,
                    productId: item.productId,
                    variantId: item.variantId || null
                },
                transaction: t
            });

            const oldQty = inventory ? Number(inventory.quantity) : 0;

            if (!inventory) {
                if (qty.isNegative()) {
                    await t.rollback();
                    return res.status(400).json({ error: `Cannot reduce stock for non-existent inventory record (product ${item.productId})` });
                }
                inventory = await models.Inventory.create({
                    branchId: targetBranchId,
                    productId: item.productId,
                    variantId: item.variantId || null,
                    quantity: 0
                }, { transaction: t });
            }

            const newQty = Number(qty.add(new Decimal(oldQty)).toFixed(4));

            if (newQty < 0) {
                await t.rollback();
                return res.status(400).json({
                    error: `Insufficient stock for product ${item.productId}. Current: ${oldQty}, attempted adjustment: ${qty.toString()}`
                });
            }

            await inventory.update({ quantity: newQty }, { transaction: t });
            if (qty.isPositive()) {
                await inventory.update({ lastRestockedAt: new Date() }, { transaction: t });
            }

            adjustments.push({
                productId: item.productId,
                variantId: item.variantId || null,
                previousQuantity: oldQty,
                adjustmentAmount: Number(qty.toString()),
                newQuantity: newQty
            });

            await createAuditLog({
                action: AUDIT_ACTIONS.INVENTORY_ADJUSTMENT,
                resource: AUDIT_RESOURCES.INVENTORY,
                resourceId: inventory.id,
                userId: req.user.userId,
                branchId: targetBranchId,
                oldValues: { quantity: oldQty },
                newValues: { quantity: newQty, adjustment: Number(qty.toString()), reason: reason || '' },
                metadata: { productId: item.productId, variantId: item.variantId || null, reason: reason || '' }
            }, req);
        }

        await t.commit();

        const io = req.app.get('io');
        if (io) {
            io.to(`branch-${targetBranchId}`).emit('inventory-update', { branchId: targetBranchId });
        }

        triggerWebhook(WEBHOOK_EVENTS.INVENTORY_ADJUSTED, {
            branchId: targetBranchId,
            adjustments: adjustments,
            type: 'adjustment',
        }, targetBranchId, io);

        res.json({ success: true, adjustments });
    } catch (error) {
        await t.rollback();
        console.error('Inventory adjustment error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
