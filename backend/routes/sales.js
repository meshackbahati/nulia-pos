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
        } else if (req.user.role === 'manager' && !branchId) {
            if (req.user.branchId) where.branchId = req.user.branchId;
        }

        const { count, rows } = await models.Sale.findAndCountAll({
            where,
            limit: Number(limit),
            offset,
            order: [['createdAt', 'DESC']],
            include: [
                { model: models.User, as: 'user', attributes: ['id', 'firstName', 'lastName'] },
                { model: models.Branch, as: 'branch', attributes: ['id', 'name'] }
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

// Create sale
router.post('/', authenticate, async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { items, paymentMethod, customerPhone, customerEmail, notes } = req.body;
        const { userId, branchId } = req.user;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'No items in cart' });
        }

        if (!branchId) {
            return res.status(400).json({ error: 'User not assigned to a branch' });
        }

        // Fetch branch for currency details
        const branch = await models.Branch.findByPk(branchId, { transaction });
        if (!branch) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Branch not found' });
        }

        // 1. Check inventory availability
        for (const item of items) {
            const inventory = await models.Inventory.findOne({
                where: {
                    branchId,
                    productId: item.productId,
                    ...(item.variantId && { variantId: item.variantId }),
                },
                transaction,
            });

            if (!inventory || (inventory.quantity - inventory.reservedQuantity) < item.quantity) {
                await transaction.rollback();
                return res.status(400).json({ error: `Insufficient stock for ${item.name}` });
            }
        }

        // 2. Calculate totals
        const subtotal = items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
        const taxAmount = subtotal * 0.1; // 10% tax
        const discountAmount = 0;
        const finalTotal = subtotal + taxAmount - discountAmount;

        // 3. Create sale
        const sale = await models.Sale.create({
            branchId,
            userId,
            subtotal,
            taxAmount,
            discountAmount,
            totalAmount: finalTotal,
            paymentMethod,
            paymentStatus: paymentMethod === 'cash' ? 'completed' : 'pending',
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

        // 5. Create payment record
        const payment = await models.Payment.create({
            branchId,
            saleId: sale.id,
            amount: finalTotal,
            currency: branch.currency,
            method: paymentMethod === 'mpesa' ? 'mpesa_stk' : paymentMethod,
            status: paymentMethod === 'cash' ? 'completed' : 'pending',
            customerPhone,
        }, { transaction });

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
            },
        }, req);

        await transaction.commit();

        res.status(201).json({
            success: true,
            saleId: sale.id,
            receiptId: sale.receiptId,
            totalAmount: finalTotal,
            paymentId: payment.id
        });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Create sale error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
