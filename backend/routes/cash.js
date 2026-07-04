import express from 'express';
import models, { sequelize } from '../models/index.js';
import { authenticate, authorize } from '../lib/auth.js';
import { createAuditLog, AUDIT_ACTIONS, AUDIT_RESOURCES } from '../lib/audit.js';
import { Op, fn, col } from 'sequelize';
import { Decimal } from 'decimal.js';

const router = express.Router();

/**
 * @openapi
 * /api/cash/register:
 *   get:
 *     tags: [Cash Management]
 *     summary: List cash registers
 */
router.get('/register', authenticate, authorize('manager'), async (req, res) => {
    try {
        const branchId = req.query.branchId || req.user.branchId;
        const registers = await models.CashRegister.findAll({
            where: { branchId },
            order: [['name', 'ASC']],
        });
        res.json({ registers });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/cash/register:
 *   post:
 *     tags: [Cash Management]
 *     summary: Create a cash register
 */
router.post('/register', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { name } = req.body;
        const branchId = req.body.branchId || req.user.branchId;
        if (!name) return res.status(400).json({ error: 'name is required' });

        const register = await models.CashRegister.create({ branchId, name });
        res.status(201).json({ register });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/cash/register/{id}:
 *   put:
 *     tags: [Cash Management]
 *     summary: Update a cash register
 */
router.put('/register/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const register = await models.CashRegister.findByPk(req.params.id);
        if (!register) return res.status(404).json({ error: 'Register not found' });

        if (req.body.name) register.name = req.body.name;
        if (req.body.isActive !== undefined) register.isActive = req.body.isActive;
        await register.save();

        res.json({ register });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/cash/session/open:
 *   post:
 *     tags: [Cash Management]
 *     summary: Open a cash session with opening float
 */
router.post('/session/open', authenticate, authorize('manager'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { registerId, openingBalance, notes } = req.body;
        if (!registerId || openingBalance === undefined) {
            return res.status(400).json({ error: 'registerId and openingBalance are required' });
        }

        // Check no active session on this register
        const active = await models.CashSession.findOne({
            where: { registerId, closedAt: null },
            transaction: t,
        });
        if (active) {
            await t.rollback();
            return res.status(400).json({ error: 'This register already has an active session. Close it first.' });
        }

        const session = await models.CashSession.create({
            registerId,
            openingBalance: new Decimal(openingBalance).toNumber(),
            openedBy: req.user.userId,
            notes,
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ session });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/cash/session/close:
 *   post:
 *     tags: [Cash Management]
 *     summary: Close a cash session with closing float
 */
router.post('/session/close', authenticate, authorize('manager'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { sessionId, closingBalance, notes } = req.body;
        if (!sessionId || closingBalance === undefined) {
            return res.status(400).json({ error: 'sessionId and closingBalance are required' });
        }

        const session = await models.CashSession.findByPk(sessionId, {
            include: [{ model: models.CashTransaction, as: 'transactions' }],
            transaction: t,
        });
        if (!session) {
            await t.rollback();
            return res.status(404).json({ error: 'Session not found' });
        }
        if (session.closedAt) {
            await t.rollback();
            return res.status(400).json({ error: 'Session already closed' });
        }

        // Calculate expected balance: opening + cash sales - cash expenses
        const cashSales = (session.transactions || [])
            .filter(tx => tx.type === 'sale')
            .reduce((sum, tx) => sum.add(new Decimal(tx.amount)), new Decimal(0));

        const cashExpenses = (session.transactions || [])
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum.add(new Decimal(tx.amount)), new Decimal(0));

        const opening = new Decimal(session.openingBalance);
        const expectedBalance = opening.add(cashSales).sub(cashExpenses).toNumber();
        const difference = new Decimal(closingBalance).sub(expectedBalance).toNumber();

        session.closingBalance = new Decimal(closingBalance).toNumber();
        session.expectedBalance = expectedBalance;
        session.difference = difference;
        session.closedBy = req.user.userId;
        session.closedAt = new Date();
        session.notes = notes || session.notes;
        await session.save({ transaction: t });

        await createAuditLog({
            action: 'cash_session_close',
            resource: AUDIT_RESOURCES.SYSTEM,
            resourceId: session.id,
            userId: req.user.userId,
            branchId: session.register?.branchId,
            oldValues: { status: 'open' },
            newValues: { status: 'closed', openingBalance: session.openingBalance, closingBalance, expectedBalance, difference },
        }, req);

        await t.commit();
        res.json({ session, expectedBalance, difference });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/cash/session/active:
 *   get:
 *     tags: [Cash Management]
 *     summary: Get current active session for a register
 */
router.get('/session/active', authenticate, authorize('manager'), async (req, res) => {
    try {
        const { registerId } = req.query;
        if (!registerId) return res.status(400).json({ error: 'registerId is required' });

        const session = await models.CashSession.findOne({
            where: { registerId, closedAt: null },
        });
        res.json({ session });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/cash/sessions:
 *   get:
 *     tags: [Cash Management]
 *     summary: List historical sessions
 */
router.get('/sessions', authenticate, authorize('manager'), async (req, res) => {
    try {
        const branchId = req.query.branchId || req.user.branchId;
        const sessions = await models.CashSession.findAll({
            include: [
                { model: models.CashRegister, as: 'register', where: { branchId } },
                { model: models.User, as: 'opener', attributes: ['id', 'firstName', 'lastName'] },
                { model: models.User, as: 'closer', attributes: ['id', 'firstName', 'lastName'] },
            ],
            order: [['openedAt', 'DESC']],
            limit: 100,
        });
        res.json({ sessions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/cash/transaction:
 *   post:
 *     tags: [Cash Management]
 *     summary: Record a manual cash transaction (topup, payout, adjustment)
 */
router.post('/transaction', authenticate, authorize('manager'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { sessionId, type, amount, reason } = req.body;
        if (!sessionId || !type || amount === undefined) {
            return res.status(400).json({ error: 'sessionId, type, and amount are required' });
        }

        const session = await models.CashSession.findByPk(sessionId, { transaction: t });
        if (!session || session.closedAt) {
            await t.rollback();
            return res.status(400).json({ error: 'Session not found or already closed' });
        }

        const tx = await models.CashTransaction.create({
            sessionId, type, amount: new Decimal(amount).toNumber(), reason,
            createdBy: req.user.userId,
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ transaction: tx });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: error.message });
    }
});

export default router;
