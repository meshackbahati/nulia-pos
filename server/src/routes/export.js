import express from 'express';
import models, { sequelize } from '../models/index.js';
import { authenticate, authorize } from '../lib/auth.js';
import { Op } from 'sequelize';

const router = express.Router();

/**
 * @openapi
 * /api/export/sales:
 *   get:
 *     tags: [Export]
 *     summary: Export sales as CSV
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
 *         name: format
 *         schema: { type: string, enum: [csv, json] }
 *     responses:
 *       200:
 *         description: Exported data
 */
router.get('/sales', authenticate, authorize('admin'), async (req, res) => {
    try {
        const branchId = req.query.branchId || req.user.branchId;
        const where = { branchId };

        if (req.query.from) where.createdAt = { ...where.createdAt, [Op.gte]: new Date(req.query.from) };
        if (req.query.to) where.createdAt = { ...where.createdAt, [Op.lte]: new Date(req.query.to) };

        const sales = await models.Sale.findAll({
            where,
            include: [
                { model: models.SaleItem, as: 'items', include: [{ model: models.Product, as: 'product' }] },
                { model: models.Payment, as: 'payments' },
                { model: models.User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
            ],
            order: [['createdAt', 'DESC']],
        });

        const format = req.query.format || 'csv';

        if (format === 'json') {
            res.json({ sales });
            return;
        }

        // CSV format
        const headers = 'Receipt,Date,Customer,Items,Subtotal,Tax,Total,Payment,Status,Cashier\n';
        const rows = sales.map(s => {
            const itemNames = s.items?.map(i => `${i.product?.name || 'Unknown'} x${i.quantity}`).join('; ') || '';
            return `${s.receiptId},${s.createdAt},"${s.customerPhone || ''}","${itemNames}",${s.subtotal},${s.taxAmount},${s.totalAmount},${s.paymentMethod},${s.paymentStatus},${s.user?.firstName || ''} ${s.user?.lastName || ''}`;
        }).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=sales-export-${Date.now()}.csv`);
        res.send(headers + rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/export/inventory:
 *   get:
 *     tags: [Export]
 *     summary: Export inventory as CSV
 */
router.get('/inventory', authenticate, authorize('manager'), async (req, res) => {
    try {
        const branchId = req.query.branchId || req.user.branchId;

        const inventory = await models.Inventory.findAll({
            where: { branchId },
            include: [{ model: models.Product, as: 'product', attributes: ['id', 'name', 'sku', 'category', 'basePrice', 'costPrice'] }],
            order: [[{ model: models.Product, as: 'product' }, 'name', 'ASC']],
        });

        const headers = 'SKU,Product,Category,Quantity,Min Level,Max Level,Cost Price,Selling Price,Value\n';
        const rows = inventory.map(inv => {
            const p = inv.product;
            const value = (Number(inv.quantity) * Number(p.costPrice || 0)).toFixed(2);
            return `${p.sku || 'N/A'},"${p.name}",${p.category},${inv.quantity},${inv.minStockLevel},${inv.maxStockLevel},${p.costPrice || 0},${p.basePrice},${value}`;
        }).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=inventory-export-${Date.now()}.csv`);
        res.send(headers + rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/export/expenses:
 *   get:
 *     tags: [Export]
 *     summary: Export expenses as CSV
 */
router.get('/expenses', authenticate, authorize('manager'), async (req, res) => {
    try {
        const branchId = req.query.branchId || req.user.branchId;
        const where = { branchId };
        if (req.query.from) where.paidAt = { ...where.paidAt, [Op.gte]: new Date(req.query.from) };
        if (req.query.to) where.paidAt = { ...where.paidAt, [Op.lte]: new Date(req.query.to) };

        const expenses = await models.Expense.findAll({
            where,
            include: [{ model: models.User, as: 'payer', attributes: ['firstName', 'lastName'] }],
            order: [['paidAt', 'DESC']],
        });

        const headers = 'Date,Category,Amount,Description,Paid By,Approved\n';
        const rows = expenses.map(e =>
            `${e.paidAt},${e.category},${e.amount},"${e.description || ''}",${e.payer?.firstName || ''} ${e.payer?.lastName || ''},${e.isApproved ? 'Yes' : 'No'}`
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=expenses-export-${Date.now()}.csv`);
        res.send(headers + rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
