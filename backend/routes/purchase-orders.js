import express from 'express';
import models, { sequelize } from '../models/index.js';
import { authenticate, authorize, hasPermission } from '../lib/auth.js';

const router = express.Router();

// List purchase orders
router.get('/list', authenticate, async (req, res) => {
    try {
        const where = {};
        if (req.user.role !== 'admin') {
            where.branchId = req.user.branchId;
        }

        const pos = await models.PurchaseOrder.findAll({
            where,
            include: [
                { model: models.Supplier, as: 'supplier', attributes: ['name'] },
                { model: models.PurchaseOrderItem, as: 'items' }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json({ purchaseOrders: pos });
    } catch (error) {
        console.error('List POs error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create purchase order
router.post('/create', authenticate, async (req, res) => {
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
        const { supplierId, items, notes } = req.body;

        const po = await models.PurchaseOrder.create({
            supplierId,
            branchId: req.user.branchId,
            orderNumber: `PO-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            status: 'pending',
            totalAmount: items.reduce((sum, item) => sum + (item.quantity * (item.unitCost || item.unitPrice || 0)), 0),
            notes,
            createdBy: req.user.id || req.user.userId
        }, { transaction: t });

        for (const item of items) {
            await models.PurchaseOrderItem.create({
                purchaseOrderId: po.id,
                productId: item.productId,
                variantId: item.variantId || null,
                quantity: item.quantity,
                unitCost: item.unitCost || item.unitPrice || 0,
                totalCost: item.quantity * (item.unitCost || item.unitPrice || 0)
            }, { transaction: t });
        }

        await t.commit();
        res.json({ success: true, purchaseOrder: po });
    } catch (error) {
        await t.rollback();
        console.error('Create PO error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Receive purchase order (and update inventory)
router.post('/receive', authenticate, async (req, res) => {
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
        const { purchaseOrderId } = req.body;
        const po = await models.PurchaseOrder.findByPk(purchaseOrderId, {
            include: [{ model: models.PurchaseOrderItem, as: 'items' }]
        });

        if (!po) return res.status(404).json({ error: 'Purchase Order not found' });
        if (po.status === 'received') return res.status(400).json({ error: 'Already received' });

        // Update PO status
        await po.update({ status: 'received', receivedAt: new Date() }, { transaction: t });

        // Update inventory
        for (const item of po.items) {
            let inventory = await models.Inventory.findOne({
                where: {
                    branchId: po.branchId,
                    productId: item.productId,
                    variantId: item.variantId || null
                },
                transaction: t
            });

            if (!inventory) {
                inventory = await models.Inventory.create({
                    branchId: po.branchId,
                    productId: item.productId,
                    variantId: item.variantId || null,
                    quantity: 0
                }, { transaction: t });
            }

            await inventory.increment('quantity', { by: item.quantity, transaction: t });
        }

        await t.commit();
        res.json({ success: true });
    } catch (error) {
        await t.rollback();
        console.error('Receive PO error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
