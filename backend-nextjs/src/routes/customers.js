import express from 'express';
import models, { sequelize } from '../models/index.js';
import { authenticate, authorize } from '../lib/auth.js';
import { Op } from 'sequelize';
import { Decimal } from 'decimal.js';

const router = express.Router();

/**
 * @openapi
 * /api/customers:
 *   get:
 *     tags: [Customers]
 *     summary: List/search customers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: branchId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Customer list
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const branchId = req.query.branchId || req.user.branchId;
        const where = { branchId };

        if (req.query.search) {
            where[Op.or] = [
                { firstName: { [Op.iLike]: `%${req.query.search}%` } },
                { lastName: { [Op.iLike]: `%${req.query.search}%` } },
                { phone: { [Op.iLike]: `%${req.query.search}%` } },
                { email: { [Op.iLike]: `%${req.query.search}%` } },
                { idNumber: { [Op.iLike]: `%${req.query.search}%` } },
            ];
        }

        const customers = await models.Customer.findAll({
            where,
            order: [['firstName', 'ASC']],
            limit: 100,
        });

        res.json({ customers });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/customers/lookup:
 *   get:
 *     tags: [Customers]
 *     summary: Quick lookup by phone
 */
router.get('/lookup', authenticate, async (req, res) => {
    try {
        const { phone } = req.query;
        if (!phone) return res.status(400).json({ error: 'phone is required' });

        const customer = await models.Customer.findOne({
            where: { phone, branchId: req.user.branchId },
        });

        res.json({ customer });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/layaways:
 *   get:
 *     tags: [Customers]
 *     summary: List layaways
 */
router.get('/layaways', authenticate, async (req, res) => {
    try {
        const branchId = req.query.branchId || req.user.branchId;
        const where = { branchId };

        if (req.query.status) where.status = req.query.status;

        const layaways = await models.Layaway.findAll({
            where,
            include: [
                { model: models.Customer, as: 'customer', attributes: ['id', 'firstName', 'lastName', 'phone'] },
            ],
            order: [['nextDueDate', 'ASC']],
            limit: 100,
        });

        res.json({ layaways });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/layaways:
 *   post:
 *     tags: [Customers]
 *     summary: Create a layaway plan
 */
router.post('/layaways', authenticate, authorize('manager'), async (req, res) => {
    try {
        const { customerId, totalAmount, depositAmount, installmentCount, installmentAmount, frequency, nextDueDate, notes } = req.body;
        const branchId = req.body.branchId || req.user.branchId;

        if (!customerId || !totalAmount) {
            return res.status(400).json({ error: 'customerId and totalAmount are required' });
        }

        const deposit = depositAmount || 0;
        const balance = new Decimal(totalAmount).sub(new Decimal(deposit)).toNumber();

        const layaway = await models.Layaway.create({
            branchId, customerId,
            totalAmount: new Decimal(totalAmount).toNumber(),
            depositAmount: new Decimal(deposit).toNumber(),
            balance, installmentCount, installmentAmount,
            frequency, nextDueDate,
            notes,
        });

        // Record the deposit transaction
        if (deposit > 0) {
            await models.CustomerDeposit.create({
                customerId,
                amount: new Decimal(deposit).toNumber(),
                type: 'deposit',
                referenceType: 'sale',
                referenceId: layaway.id,
                notes: `Layaway deposit for plan ${layaway.id}`,
                recordedBy: req.user.userId,
            });

            const customer = await models.Customer.findByPk(customerId);
            if (customer) {
                customer.currentBalance = new Decimal(customer.currentBalance || 0)
                    .sub(new Decimal(deposit)).toNumber();
                await customer.save();
            }
        }

        res.status(201).json({ layaway });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/layaways/{id}/pay:
 *   post:
 *     tags: [Customers]
 *     summary: Make a layaway installment payment
 */
router.post('/layaways/:id/pay', authenticate, authorize('manager'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const layaway = await models.Layaway.findByPk(req.params.id, { transaction: t });
        if (!layaway || layaway.status !== 'active') {
            await t.rollback();
            return res.status(400).json({ error: 'Layaway not found or not active' });
        }

        const { amount } = req.body;
        if (!amount) {
            await t.rollback();
            return res.status(400).json({ error: 'amount is required' });
        }

        const newBalance = new Decimal(layaway.balance).sub(new Decimal(amount)).toNumber();

        await models.CustomerDeposit.create({
            customerId: layaway.customerId,
            amount: new Decimal(amount).toNumber(),
            type: 'payment',
            referenceType: 'sale',
            referenceId: layaway.id,
            notes: `Layaway installment payment for plan ${layaway.id}`,
            recordedBy: req.user.userId,
        }, { transaction: t });

        if (newBalance <= 0) {
            layaway.status = 'completed';
            layaway.balance = 0;
            layaway.completedAt = new Date();
        } else {
            layaway.balance = newBalance;
            // Recalculate next due date based on frequency
            if (layaway.frequency === 'weekly') {
                layaway.nextDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            } else if (layaway.frequency === 'biweekly') {
                layaway.nextDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
            } else if (layaway.frequency === 'monthly') {
                const d = new Date();
                d.setMonth(d.getMonth() + 1);
                layaway.nextDueDate = d;
            }
        }

        await layaway.save({ transaction: t });
        await t.commit();

        res.json({ layaway });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/customers/{id}:
 *   get:
 *     tags: [Customers]
 *     summary: Get customer detail with deposits and layaways
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const customer = await models.Customer.findByPk(req.params.id, {
            include: [
                { model: models.CustomerDeposit, as: 'deposits', order: [['recordedAt', 'DESC']], limit: 50 },
                { model: models.Layaway, as: 'layaways', order: [['startedAt', 'DESC']] },
                { model: models.Return, as: 'returns', order: [['createdAt', 'DESC']], limit: 20 },
            ],
        });
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        // Also fetch recent sales for this customer
        const sales = await models.Sale.findAll({
            where: { branchId: customer.branchId, customerPhone: customer.phone },
            order: [['createdAt', 'DESC']],
            limit: 20,
        });

        res.json({ customer, sales });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/customers:
 *   post:
 *     tags: [Customers]
 *     summary: Create a customer
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               idNumber: { type: string }
 *               creditLimit: { type: number }
 *     responses:
 *       201:
 *         description: Customer created
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const { firstName, lastName, phone, email, idNumber, creditLimit, notes } = req.body;
        const branchId = req.body.branchId || req.user.branchId;

        if (!firstName) return res.status(400).json({ error: 'firstName is required' });

        const customer = await models.Customer.create({
            branchId, firstName, lastName, phone, email, idNumber,
            creditLimit: creditLimit || 0, notes, currentBalance: 0,
        });

        res.status(201).json({ customer });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/customers/{id}:
 *   put:
 *     tags: [Customers]
 *     summary: Update a customer
 */
router.put('/:id', authenticate, authorize('manager'), async (req, res) => {
    try {
        const customer = await models.Customer.findByPk(req.params.id);
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        const updatable = ['firstName', 'lastName', 'phone', 'email', 'idNumber', 'creditLimit', 'notes', 'isActive'];
        updatable.forEach(f => {
            if (req.body[f] !== undefined) customer[f] = req.body[f];
        });

        await customer.save();
        res.json({ customer });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/customers/{id}/deposit:
 *   post:
 *     tags: [Customers]
 *     summary: Record a customer deposit or payment
 */
router.post('/:id/deposit', authenticate, authorize('manager'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const customer = await models.Customer.findByPk(req.params.id, { transaction: t });
        if (!customer) {
            await t.rollback();
            return res.status(404).json({ error: 'Customer not found' });
        }

        const { amount, type, referenceType, referenceId, notes } = req.body;
        if (!amount || !type) {
            await t.rollback();
            return res.status(400).json({ error: 'amount and type are required' });
        }

        const deposit = await models.CustomerDeposit.create({
            customerId: customer.id,
            amount: new Decimal(amount).toNumber(),
            type, referenceType: referenceType || null,
            referenceId: referenceId || null,
            notes, recordedBy: req.user.userId,
        }, { transaction: t });

        // Update customer balance
        if (type === 'deposit' || type === 'payment') {
            customer.currentBalance = new Decimal(customer.currentBalance || 0)
                .sub(new Decimal(amount)).toNumber();
        } else if (type === 'credit') {
            customer.currentBalance = new Decimal(customer.currentBalance || 0)
                .add(new Decimal(amount)).toNumber();
        } else if (type === 'refund') {
            customer.currentBalance = new Decimal(customer.currentBalance || 0)
                .sub(new Decimal(amount)).toNumber();
        }

        await customer.save({ transaction: t });
        await t.commit();

        res.status(201).json({ deposit, customer });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/customers/{id}:
 *   delete:
 *     tags: [Customers]
 *     summary: Delete a customer
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const customer = await models.Customer.findByPk(req.params.id);
        if (!customer) return res.status(404).json({ error: 'Customer not found' });
        await customer.destroy();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
