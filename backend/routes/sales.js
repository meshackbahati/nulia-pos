import express from 'express';
import models, { sequelize } from '../models/index.js';
import { authenticate, authorize } from '../lib/auth.js';
import { createAuditLog, AUDIT_ACTIONS, AUDIT_RESOURCES } from '../lib/audit.js';
import { Op } from 'sequelize';
import { Decimal } from 'decimal.js';

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
                { model: models.Payment, as: 'payments' },
                { model: models.SaleItem, as: 'items' }
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
                { model: models.Payment, as: 'payments' },
                { model: models.SaleItem, as: 'items' }
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
    const io = req.app.get('io');
    try {
        const { items, payments, customerPhone, customerEmail, notes, transactionCurrency, transactionExchangeRate } = req.body;
        const { userId, branchId } = req.user;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'No items in cart' });
        }

        if (!payments) payments = [];

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

        const resolvedItems = [];

        // 1. Check inventory availability and resolve catalog pricing
        for (const item of items) {
            const requestedQty = new Decimal(item.quantity);
            if (requestedQty.lte(0)) {
                await transaction.rollback();
                return res.status(400).json({ error: `Invalid quantity for ${item.name}` });
            }
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

            const available = new Decimal(inventory.quantity).minus(inventory.reservedQuantity || 0);
            
            if (available.lt(requestedQty)) {
                await transaction.rollback();
                return res.status(400).json({ error: `Insufficient stock for ${item.name}. Available: ${available.toString()}, Requested: ${requestedQty.toString()}` });
            }

            let catalogUnitPrice = Number(item.catalogPrice);
            if (!Number.isFinite(catalogUnitPrice)) {
                if (item.variantId) {
                    const variant = await models.ProductVariant.findOne({
                        where: {
                            id: item.variantId,
                            productId: item.productId,
                            isActive: true,
                        },
                        transaction,
                    });

                    if (!variant) {
                        await transaction.rollback();
                        return res.status(400).json({ error: `Variant for ${item.name} not found` });
                    }

                    catalogUnitPrice = Number(variant.price);

                    // Validation: Fractional sales allowed?
                    if (!variant.product.fractionalSalesAllowed && !requestedQty.isInteger()) {
                        await transaction.rollback();
                        return res.status(400).json({ error: `Fractional quantity not allowed for ${variant.product.name} (${variant.name})` });
                    }
                } else {
                    const product = await models.Product.findOne({
                        where: {
                            id: item.productId,
                            isActive: true,
                        },
                        transaction,
                    });

                    if (!product) {
                        await transaction.rollback();
                        return res.status(400).json({ error: `Product ${item.name} not found` });
                    }

                    catalogUnitPrice = Number(product.basePrice);
                    
                    // Validation: Fractional sales allowed?
                    if (!product.fractionalSalesAllowed && !requestedQty.isInteger()) {
                        await transaction.rollback();
                        return res.status(400).json({ error: `Fractional quantity not allowed for ${product.name}` });
                    }
                }
            }

            const effectiveUnitPrice = new Decimal(item.price);
            if (effectiveUnitPrice.lt(0)) {
                await transaction.rollback();
                return res.status(400).json({ error: `Invalid sale price for ${item.name}` });
            }

            const lineDiscountAmount = Decimal.max(0, new Decimal(catalogUnitPrice).minus(effectiveUnitPrice).times(requestedQty));

            resolvedItems.push({
                ...item,
                quantity: requestedQty, // Store as Decimal object for calculations
                catalogUnitPrice,
                effectiveUnitPrice: effectiveUnitPrice.toNumber(),
                lineDiscountAmount: lineDiscountAmount.toNumber(),
            });
        }

        // 2. Calculate totals in base currency
        const subtotalDecimal = resolvedItems.reduce((sum, item) => sum.plus(new Decimal(item.effectiveUnitPrice).times(item.quantity)), new Decimal(0));
        const taxRate = new Decimal(branch.taxRate || 0);
        const taxAmountDecimal = subtotalDecimal.times(taxRate.div(100));
        const discountAmountDecimal = resolvedItems.reduce((sum, item) => sum.plus(item.lineDiscountAmount), new Decimal(0));
        
        const subtotal = subtotalDecimal.toDecimalPlaces(2).toNumber();
        const taxAmount = taxAmountDecimal.toDecimalPlaces(2).toNumber();
        const discountAmount = discountAmountDecimal.toDecimalPlaces(2).toNumber();
        const finalTotal = subtotalDecimal.plus(taxAmountDecimal).toDecimalPlaces(2).toNumber();

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
            transactionCurrency: transactionCurrency || branch.currency,
            transactionExchangeRate: transactionExchangeRate || 1.0,
            paymentMethod: payments.length > 0 ? (payments[0].method === 'mpesa' ? 'mpesa' : payments[0].method) : 'cash',
            paymentStatus: 'completed', // Assuming split payments are only sent when fully paid
            customerPhone,
            customerEmail,
            notes,
        }, { transaction });

        // 4. Create sale items and update inventory
        for (const item of resolvedItems) {
            const qty = new Decimal(item.quantity);
            await models.SaleItem.create({
                saleId: sale.id,
                productId: item.productId,
                variantId: item.variantId,
                productName: item.name,
                quantity: qty.toString(), // Store as string for Decimal precision in Sequelize
                unitPrice: item.effectiveUnitPrice,
                catalogPrice: item.catalogUnitPrice,
                totalPrice: new Decimal(item.effectiveUnitPrice).times(qty).toDecimalPlaces(2).toNumber(),
                discountAmount: item.lineDiscountAmount,
            }, { transaction });

            await models.Inventory.decrement('quantity', {
                by: qty.toString(),
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

        // Fetch full sale with associations for the UI (without transaction as it is committed)
        const completedSale = await models.Sale.findByPk(sale.id, {
            include: [
                { model: models.User, as: 'user', attributes: ['id', 'firstName', 'lastName'] },
                { model: models.Branch, as: 'branch', attributes: ['id', 'name'] },
                { model: models.Payment, as: 'payments' },
                { model: models.SaleItem, as: 'items' }
            ]
        });

        // Emit real-time update (io is already declared above)
        if (io) {
            io.to(`branch-${branchId}`).emit('inventory-update', { branchId });
            io.to(`branch-${branchId}`).emit('new-sale', { saleId: sale.id, receiptId: sale.receiptId });
        }

        res.status(201).json({
            success: true,
            sale: completedSale,
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

// Search sales — by receipt, product, customer phone/name, cashier, date range, amount
router.get('/search', authenticate, async (req, res) => {
    try {
        const {
            query,
            productId,
            customerPhone,
            customerName,
            cashierId,
            startDate,
            endDate,
            minAmount,
            maxAmount,
            page = 1,
            limit = 50
        } = req.query;

        const offset = (Number(page) - 1) * Number(limit);
        const where = {};

        // Role-based restrictions
        if (req.user.role === 'salesperson') {
            where.userId = req.user.userId;
        } else if (req.user.role === 'manager') {
            where.branchId = req.user.branchId;
        }

        if (startDate && endDate) {
            where.createdAt = { [Op.between]: [new Date(startDate), new Date(endDate)] };
        }
        if (minAmount != null || maxAmount != null) {
            where.totalAmount = {};
            if (minAmount != null) where.totalAmount[Op.gte] = Number(minAmount);
            if (maxAmount != null) where.totalAmount[Op.lte] = Number(maxAmount);
        }
        if (cashierId) {
            where.userId = cashierId;
        }
        if (customerPhone) {
            where.customerPhone = { [Op.iLike]: `%${customerPhone}%` };
        }

        // If a general query is provided, search across receiptId, customerPhone, notes
        // or join with items to search by product name
        let include = [
            { model: models.User, as: 'user', attributes: ['id', 'firstName', 'lastName'] },
            { model: models.Branch, as: 'branch', attributes: ['id', 'name'] },
            { model: models.Payment, as: 'payments' },
            { model: models.SaleItem, as: 'items' }
        ];

        if (query) {
            const searchLower = query.toLowerCase();
            // Try matching receiptId, customerPhone, notes, or customerEmail
            where[Op.or] = [
                { receiptId: { [Op.iLike]: `%${searchLower}%` } },
                { customerPhone: { [Op.iLike]: `%${searchLower}%` } },
                { customerEmail: { [Op.iLike]: `%${searchLower}%` } },
                { notes: { [Op.iLike]: `%${searchLower}%` } },
            ];

            // Also search for product names in sale items
            if (productId || query) {
                include[3].where = {
                    [Op.or]: [
                        { productName: { [Op.iLike]: `%${searchLower}%` } }
                    ]
                };
                include[3].required = false;
            }
        }

        if (productId) {
            // Ensure at least one sale item matches the productId
            include[3] = {
                model: models.SaleItem,
                as: 'items',
                where: { productId },
                required: true
            };
        }

        // If customer name search, join with user table
        if (customerName) {
            const nameParts = customerName.trim().split(/\s+/);
            const userWhere = {};
            if (nameParts.length === 1) {
                userWhere[Op.or] = [
                    { firstName: { [Op.iLike]: `%${nameParts[0]}%` } },
                    { lastName: { [Op.iLike]: `%${nameParts[0]}%` } }
                ];
            } else {
                userWhere.firstName = { [Op.iLike]: `%${nameParts[0]}%` };
                userWhere.lastName = { [Op.iLike]: `%${nameParts[1]}%` };
            }
            include[0].where = userWhere;
            include[0].required = true;
        }

        const { count, rows } = await models.Sale.findAndCountAll({
            where,
            include,
            limit: Number(limit),
            offset,
            order: [['createdAt', 'DESC']],
            distinct: true
        });

        res.json({
            sales: rows,
            total: count,
            page: Number(page),
            totalPages: Math.ceil(count / Number(limit))
        });
    } catch (error) {
        console.error('Search sales error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single sale details (for reprint)
router.get('/:id', authenticate, async (req, res) => {
    try {
        const sale = await models.Sale.findByPk(req.params.id, {
            include: [
                { model: models.User, as: 'user', attributes: ['id', 'firstName', 'lastName'] },
                { model: models.Branch, as: 'branch', attributes: ['id', 'name', 'currency', 'currencySymbol', 'taxRate', 'address', 'phone'] },
                { model: models.Payment, as: 'payments' },
                { model: models.SaleItem, as: 'items' }
            ]
        });

        if (!sale) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        res.json({ sale });
    } catch (error) {
        console.error('Get sale error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
