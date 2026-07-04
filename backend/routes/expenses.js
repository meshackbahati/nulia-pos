import express from 'express';
import models, { sequelize } from '../models/index.js';
import { authenticate, authorize } from '../lib/auth.js';
import { Op, fn, col } from 'sequelize';
import { Decimal } from 'decimal.js';

const router = express.Router();

/**
 * @openapi
 * /api/expenses:
 *   get:
 *     tags: [Expenses]
 *     summary: List expenses with filters
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
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: branchId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Expense list
 */
router.get('/', authenticate, authorize('manager'), async (req, res) => {
    try {
        const branchId = req.query.branchId || req.user.branchId;
        const where = { branchId };

        if (req.query.from) where.paidAt = { ...where.paidAt, [Op.gte]: new Date(req.query.from) };
        if (req.query.to) where.paidAt = { ...where.paidAt, [Op.lte]: new Date(req.query.to) };
        if (req.query.category) where.category = req.query.category;

        const expenses = await models.Expense.findAll({
            where,
            include: [
                { model: models.User, as: 'payer', attributes: ['id', 'firstName', 'lastName'] },
                { model: models.User, as: 'approver', attributes: ['id', 'firstName', 'lastName'] },
            ],
            order: [['paidAt', 'DESC']],
            limit: 200,
        });

        res.json({ expenses });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/expenses/summary:
 *   get:
 *     tags: [Expenses]
 *     summary: Expense summary by category
 */
router.get('/summary', authenticate, authorize('manager'), async (req, res) => {
    try {
        const branchId = req.query.branchId || req.user.branchId;

        const byCategory = await models.Expense.findAll({
            where: { branchId },
            attributes: [
                'category',
                [fn('SUM', col('amount')), 'total'],
                [fn('COUNT', col('id')), 'count'],
            ],
            group: ['category'],
            raw: true,
        });

        const total = byCategory.reduce((sum, c) => sum + parseFloat(c.total || 0), 0);

        res.json({ byCategory, total });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/expenses:
 *   post:
 *     tags: [Expenses]
 *     summary: Create an expense record
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category: { type: string }
 *               amount: { type: number }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Expense created
 */
router.post('/', authenticate, authorize('manager'), async (req, res) => {
    try {
        const { category, amount, description, paidAt, currency, exchangeRate } = req.body;
        const branchId = req.body.branchId || req.user.branchId;

        if (!category || amount === undefined) {
            return res.status(400).json({ error: 'category and amount are required' });
        }

        const baseAmount = exchangeRate
            ? new Decimal(amount).div(new Decimal(exchangeRate)).toNumber()
            : new Decimal(amount).toNumber();

        const expense = await models.Expense.create({
            branchId, category, amount: new Decimal(amount).toNumber(),
            description, paidBy: req.user.userId,
            paidAt: paidAt || new Date(),
            currency: currency || null,
            exchangeRate: exchangeRate || null,
            baseAmount: currency ? baseAmount : null,
        });

        // If there's an active cash session, record cash transaction
        if (category !== 'other' || req.body.recordCash) {
            const activeSession = await models.CashSession.findOne({
                where: { closedAt: null },
                include: [{
                    model: models.CashRegister, as: 'register',
                    where: { branchId },
                    required: true,
                }],
                limit: 1,
            });
            if (activeSession) {
                await models.CashTransaction.create({
                    sessionId: activeSession.id,
                    type: 'expense',
                    amount: new Decimal(amount).toNumber(),
                    reference: expense.id,
                    reason: `Expense: ${category} - ${description || ''}`,
                    createdBy: req.user.userId,
                });
            }
        }

        res.status(201).json({ expense });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/expenses/{id}/approve:
 *   post:
 *     tags: [Expenses]
 *     summary: Approve an expense
 */
router.post('/:id/approve', authenticate, authorize('admin'), async (req, res) => {
    try {
        const expense = await models.Expense.findByPk(req.params.id);
        if (!expense) return res.status(404).json({ error: 'Expense not found' });

        expense.isApproved = true;
        expense.approvedBy = req.user.userId;
        await expense.save();

        res.json({ expense });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/expenses/{id}:
 *   put:
 *     tags: [Expenses]
 *     summary: Update an expense
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authenticate, authorize('manager'), async (req, res) => {
    try {
        const expense = await models.Expense.findByPk(req.params.id);
        if (!expense) return res.status(404).json({ error: 'Expense not found' });

        if (req.body.category) expense.category = req.body.category;
        if (req.body.amount !== undefined) expense.amount = req.body.amount;
        if (req.body.description !== undefined) expense.description = req.body.description;
        if (req.body.paidAt) expense.paidAt = req.body.paidAt;
        await expense.save();

        res.json({ expense });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/expenses/{id}:
 *   delete:
 *     tags: [Expenses]
 *     summary: Delete an expense
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const expense = await models.Expense.findByPk(req.params.id);
        if (!expense) return res.status(404).json({ error: 'Expense not found' });
        await expense.destroy();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
