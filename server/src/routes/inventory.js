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
            await io.to(`branch-${targetBranchId}`).emit('inventory-update', { branchId: targetBranchId });
        }

        await triggerWebhook(WEBHOOK_EVENTS.INVENTORY_ADJUSTED, {
            branchId: targetBranchId,
            items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
            type: 'restock',
        }, targetBranchId, io);

        res.json({ success: true });
    } catch (error) {
        try {
            if (t) await t.rollback();
        } catch (rbErr) {
            console.error('[inventory/restock] Rollback failed:', rbErr.message);
        }
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
            await io.to(`branch-${targetBranchId}`).emit('inventory-update', { branchId: targetBranchId });
        }

        await triggerWebhook(WEBHOOK_EVENTS.INVENTORY_ADJUSTED, {
            branchId: targetBranchId,
            adjustments: adjustments,
            type: 'adjustment',
        }, targetBranchId, io);

        res.json({ success: true, adjustments });
    } catch (error) {
        try {
            if (t) await t.rollback();
        } catch (rbErr) {
            console.error('[inventory/adjust] Rollback failed:', rbErr.message);
        }
        console.error('Inventory adjustment error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Inventory transfer between branches
router.post('/transfer', authenticate, async (req, res) => {
    if (req.user.role === 'head_of_sales') {
        if (!req.user.permissions?.canManageInventory) {
            return res.status(403).json({ error: 'Head of Sales does not have inventory write access' });
        }
    } else if (!hasPermission(req.user.role, 'manager')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const t = await sequelize.transaction();
    try {
        const { fromBranchId, toBranchId, items, reason } = req.body;
        if (!fromBranchId || !toBranchId) {
            await t.rollback();
            return res.status(400).json({ error: 'fromBranchId and toBranchId are required' });
        }
        if (fromBranchId === toBranchId) {
            await t.rollback();
            return res.status(400).json({ error: 'Source and destination branches must differ' });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            await t.rollback();
            return res.status(400).json({ error: 'items array is required' });
        }

        const transfers = [];
        for (const item of items) {
            const qty = new Decimal(item.quantity || 0);
            if (qty.lte(0)) {
                await t.rollback();
                return res.status(400).json({ error: `Invalid quantity for product ${item.productId}` });
            }

            // Source inventory
            const sourceInv = await models.Inventory.findOne({
                where: { branchId: fromBranchId, productId: item.productId, variantId: item.variantId || null },
                transaction: t
            });
            const sourceQty = sourceInv ? Number(sourceInv.quantity) : 0;
            if (!sourceInv || sourceQty < Number(qty.toString())) {
                await t.rollback();
                return res.status(400).json({ error: `Insufficient stock in source branch for product ${item.productId}. Available: ${sourceQty}` });
            }

            const newSourceQty = new Decimal(sourceQty).sub(qty).toNumber();
            await sourceInv.update({ quantity: newSourceQty }, { transaction: t });

            // Destination inventory
            let destInv = await models.Inventory.findOne({
                where: { branchId: toBranchId, productId: item.productId, variantId: item.variantId || null },
                transaction: t
            });
            if (!destInv) {
                destInv = await models.Inventory.create({
                    branchId: toBranchId, productId: item.productId, variantId: item.variantId || null, quantity: 0
                }, { transaction: t });
            }
            const destQty = Number(destInv.quantity);
            const newDestQty = new Decimal(destQty).add(qty).toNumber();
            await destInv.update({ quantity: newDestQty, lastRestockedAt: new Date() }, { transaction: t });

            transfers.push({
                productId: item.productId,
                variantId: item.variantId || null,
                quantity: Number(qty.toString()),
                fromBranchId, toBranchId,
                fromQtyBefore: sourceQty, fromQtyAfter: newSourceQty,
                toQtyBefore: destQty, toQtyAfter: newDestQty
            });

            await createAuditLog({
                action: AUDIT_ACTIONS.INVENTORY_ADJUSTMENT,
                resource: AUDIT_RESOURCES.INVENTORY,
                resourceId: sourceInv.id,
                userId: req.user.userId, branchId: fromBranchId,
                oldValues: { quantity: sourceQty },
                newValues: { quantity: newSourceQty, transferTo: toBranchId, reason: reason || '' },
                metadata: { productId: item.productId, variantId: item.variantId || null, quantity: Number(qty.toString()), type: 'transfer-out' }
            }, req);
            await createAuditLog({
                action: AUDIT_ACTIONS.INVENTORY_ADJUSTMENT,
                resource: AUDIT_RESOURCES.INVENTORY,
                resourceId: destInv.id,
                userId: req.user.userId, branchId: toBranchId,
                oldValues: { quantity: destQty },
                newValues: { quantity: newDestQty, transferFrom: fromBranchId, reason: reason || '' },
                metadata: { productId: item.productId, variantId: item.variantId || null, quantity: Number(qty.toString()), type: 'transfer-in' }
            }, req);
        }

        await t.commit();

        const io = req.app.get('io');
        if (io) {
            await io.to(`branch-${fromBranchId}`).emit('inventory-update', { branchId: fromBranchId, type: 'transfer-out' });
            await io.to(`branch-${toBranchId}`).emit('inventory-update', { branchId: toBranchId, type: 'transfer-in' });
        }

        await triggerWebhook(WEBHOOK_EVENTS.INVENTORY_ADJUSTED, {
            fromBranchId, toBranchId, transfers, type: 'transfer', reason: reason || ''
        }, fromBranchId, io);

        res.json({ success: true, transfers });
    } catch (error) {
        try { if (t) await t.rollback(); } catch (rbErr) { console.error('[inventory/transfer] Rollback failed:', rbErr.message); }
        console.error('Inventory transfer error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
