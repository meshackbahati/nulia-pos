import express from 'express';
import models from '../models/index.js';
import { authenticate } from '../lib/auth.js';
import emailService from '../lib/email.js';

const router = express.Router();

// Email receipt
router.post('/email', authenticate, async (req, res) => {
    try {
        const { saleId, email } = req.body;
        const sale = await models.Sale.findByPk(saleId, {
            include: [
                { model: models.SaleItem, as: 'items', include: [{ model: models.Product, as: 'product' }] },
                { model: models.Branch, as: 'branch' }
            ]
        });

        if (!sale) return res.status(404).json({ error: 'Sale not found' });

        const success = await emailService.sendReceiptEmail({
            customerEmail: email,
            receiptId: sale.receiptId,
            branchName: sale.branch.name,
            items: sale.items.map(item => ({
                name: item.product.name,
                quantity: item.quantity,
                price: parseFloat(item.unitPrice),
                total: parseFloat(item.totalPrice)
            })),
            subtotal: parseFloat(sale.subtotal),
            tax: parseFloat(sale.tax),
            total: parseFloat(sale.totalAmount),
            paymentMethod: sale.paymentMethod,
            date: sale.createdAt.toLocaleDateString()
        });

        if (success) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Failed to send email' });
        }
    } catch (error) {
        console.error('Email receipt error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
