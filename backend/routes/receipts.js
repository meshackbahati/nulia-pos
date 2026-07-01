import express from 'express';
import models from '../models/index.js';
import { authenticate } from '../lib/auth.js';
import emailService from '../lib/email.js';
import invoiceService from '../services/invoiceService.js';

const router = express.Router();

// Email receipt
router.post('/email', authenticate, async (req, res) => {
    let pdfPath = null;
    try {
        const { saleId, email } = req.body;
        const sale = await models.Sale.findByPk(saleId, {
            include: [
                { model: models.SaleItem, as: 'items', include: [{ model: models.Product, as: 'product' }] },
                { model: models.Branch, as: 'branch' }
            ]
        });

        if (!sale) return res.status(404).json({ error: 'Sale not found' });

        const transCurrency = sale.transactionCurrency || sale.branch.currency || 'USD';
        const getSymbol = (code) => ({ KES: 'KSh', UGX: 'UGX', TZS: 'TZS', USD: '$', EUR: '€', GBP: '£' })[code] || code;
        const currencySymbol = getSymbol(transCurrency);
        const separator = currencySymbol.length > 1 ? ' ' : '';
        const formatFn = (amt) => `${currencySymbol}${separator}${amt.toFixed(2)}`;

        const emailData = {
            customerEmail: email,
            receiptId: sale.receiptId,
            branchName: sale.branch.name,
            transactionCurrency: transCurrency,
            transactionCurrencySymbol: currencySymbol,
            items: sale.items.map(item => ({
                name: item.product.name,
                quantity: item.quantity,
                price: parseFloat(item.unitPrice),
                total: parseFloat(item.totalPrice)
            })),
            subtotal: parseFloat(sale.subtotal),
            tax: parseFloat(sale.taxAmount || 0),
            total: parseFloat(sale.totalAmount),
            paymentMethod: sale.paymentMethod,
            date: sale.createdAt.toLocaleDateString(),
            formatFn,
        };

        pdfPath = await invoiceService.generateReceiptPDF(emailData);

        const success = await emailService.sendReceiptEmail(emailData, pdfPath);

        if (success) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Failed to send email' });
        }
    } catch (error) {
        console.error('Email receipt error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (pdfPath) {
            await invoiceService.cleanup(pdfPath);
        }
    }
});

export default router;
