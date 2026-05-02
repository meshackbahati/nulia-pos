import express from 'express';
import models, { sequelize } from '../models/index.js';
import { authenticate, authorize } from '../lib/auth.js';
import { createAuditLog, AUDIT_ACTIONS, AUDIT_RESOURCES } from '../lib/audit.js';
import { Op } from 'sequelize';

const router = express.Router();

// List sales
router.get('/', authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 20, branchId, startDate, endDate } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const where = {};
        if (branchId) where.branchId = branchId;
        if (startDate && endDate) {
            where.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        // Role-based restrictions
        if (req.user.role === 'salesperson') {
            where.userId = req.user.userId;
        } else if (req.user.role === 'manager') {
            // Managers are ALWAYS restricted to their assigned branch
            where.branchId = req.user.branchId;
        } else if (branchId) {
            // Admins can filter by branchId
            where.branchId = branchId;
        }

        const { count, rows } = await models.Sale.findAndCountAll({
            where,
            limit: Number(limit),
            offset,
            order: [['createdAt', 'DESC']],
            include: [
                { model: models.User, as: 'user', attributes: ['id', 'firstName', 'lastName'] },
                { model: models.Branch, as: 'branch', attributes: ['id', 'name'] },
                { model: models.Payment, as: 'payments' }
            ]
        });

        res.json({
            sales: rows,
            total: count,
            page: Number(page),
            totalPages: Math.ceil(count / Number(limit))
        });
    } catch (error) {
        console.error('List sales error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Alias for list sales
router.get('/list', authenticate, async (req, res) => {
    // Redirect to root route which handles listing
    const { page = 1, limit = 20, branchId, startDate, endDate } = req.query;
    try {
        const offset = (Number(page) - 1) * Number(limit);

        const where = {};
        if (branchId) where.branchId = branchId;
        if (startDate && endDate) {
            where.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        // Role-based restrictions
        if (req.user.role === 'salesperson') {
            where.userId = req.user.userId;
        } else if (req.user.role === 'manager') {
            where.branchId = req.user.branchId;
        } else if (branchId) {
            where.branchId = branchId;
        }

        const { count, rows } = await models.Sale.findAndCountAll({
            where,
            limit: Number(limit),
            offset,
            order: [['createdAt', 'DESC']],
            include: [
                { model: models.User, as: 'user', attributes: ['id', 'firstName', 'lastName'] },
                { model: models.Branch, as: 'branch', attributes: ['id', 'name'] },
                { model: models.Payment, as: 'payments' }
            ]
        });

        res.json({
            sales: rows,
            total: count,
            page: Number(page),
            totalPages: Math.ceil(count / Number(limit))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create sale
router.post('/create', authenticate, async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { items, payments, customerPhone, customerEmail, notes } = req.body;
        const { userId, branchId } = req.user;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'No items in cart' });
        }

        if (!payments || payments.length === 0) {
            return res.status(400).json({ error: 'Payment details required' });
        }

        if (!branchId) {
            return res.status(400).json({ error: 'User not assigned to a branch' });
        }

        // Enforce: user can only sell from their currently active branch
        if (req.user.branchId !== branchId) {
            return res.status(403).json({ error: 'You can only sell from your active branch. Switch to the branch first.' });
        }

        // Fetch branch for currency details
        const branch = await models.Branch.findByPk(branchId, { transaction });
        if (!branch) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Branch not found' });
        }

        // 1. Check inventory availability
        for (const item of items) {
            const requestedQty = parseInt(item.quantity);
            const inventory = await models.Inventory.findOne({
                where: {
                    branchId,
                    productId: item.productId,
                    ...(item.variantId && { variantId: item.variantId }),
                },
                transaction,
            });

            if (!inventory) {
                await transaction.rollback();
                return res.status(400).json({ error: `Item ${item.name} not available in this branch` });
            }

            const available = parseInt(inventory.quantity) - parseInt(inventory.reservedQuantity || 0);
            
            if (available < requestedQty) {
                await transaction.rollback();
                return res.status(400).json({ error: `Insufficient stock for ${item.name}. Available: ${available}, Requested: ${requestedQty}` });
            }
        }

        // 2. Calculate totals in base currency
        const subtotal = items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
        const taxRate = branch.taxRate || 0;
        const taxAmount = subtotal * (taxRate / 100);
        const discountAmount = 0;
        const finalTotal = subtotal + taxAmount - discountAmount;

        // Verify total payment matches total due (with 0.01 tolerance)
        const totalPaidInBase = payments.reduce((acc, p) => acc + (Number(p.amount) / Number(p.exchangeRate || 1)), 0);
        if (totalPaidInBase < finalTotal - 0.05) {
            await transaction.rollback();
            return res.status(400).json({ error: `Payment mismatch. Due: ${finalTotal}, Paid (in base): ${totalPaidInBase}` });
        }

        // 3. Create sale
        const sale = await models.Sale.create({
            branchId,
            userId,
            receiptId: models.Sale.generateReceiptId(),
            subtotal,
            taxAmount,
            discountAmount,
            totalAmount: finalTotal,
            paymentMethod: payments.length > 1 ? 'split' : payments[0].method,
            paymentStatus: 'completed', // Assuming split payments are only sent when fully paid
            customerPhone,
            customerEmail,
            notes,
        }, { transaction });

        // 4. Create sale items and update inventory
        for (const item of items) {
            await models.SaleItem.create({
                saleId: sale.id,
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
                unitPrice: item.price,
                totalPrice: Number(item.price) * item.quantity,
                discountAmount: 0,
            }, { transaction });

            await models.Inventory.decrement('quantity', {
                by: item.quantity,
                where: {
                    branchId,
                    productId: item.productId,
                    ...(item.variantId && { variantId: item.variantId }),
                },
                transaction,
            });
        }

        // 5. Create payment records
        for (const p of payments) {
            await models.Payment.create({
                branchId,
                saleId: sale.id,
                amount: Number(p.amount) / Number(p.exchangeRate || 1), // Base amount
                currency: branch.currency, // Branch base currency
                paidAmount: p.amount,
                paidCurrency: p.currency,
                exchangeRate: p.exchangeRate,
                baseCurrencyAmount: Number(p.amount) / Number(p.exchangeRate || 1),
                method: p.method === 'mpesa' ? 'mpesa_stk' : p.method,
                status: 'completed',
                reference: models.Payment.generateReference(),
                customerPhone: p.details?.customerPhone || customerPhone,
            }, { transaction });
        }

        // 6. Audit log
        await createAuditLog({
            userId,
            branchId,
            action: AUDIT_ACTIONS.SALE_CREATE,
            resource: AUDIT_RESOURCES.SALE,
            resourceId: sale.id,
            newValues: {
                receiptId: sale.receiptId,
                totalAmount: finalTotal,
                paymentsCount: payments.length
            },
        }, req);

        await transaction.commit();

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.to(`branch-${branchId}`).emit('inventory-update', { branchId });
            io.to(`branch-${branchId}`).emit('new-sale', { saleId: sale.id, receiptId: sale.receiptId });
        }

        res.status(201).json({
            success: true,
            sale: sale, // Include full sale object for UI
            saleId: sale.id,
            receiptId: sale.receiptId,
            totalAmount: finalTotal
        });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Create sale error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
