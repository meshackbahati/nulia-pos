import express from 'express';
import models from '../models/index.js';
import { authenticate, authorize } from '../lib/auth.js';

const router = express.Router();

// List users
router.get('/list', authenticate, async (req, res) => {
    try {
        const { branchId } = req.query;
        const where = { isActive: true };

        if (req.user.role === 'manager') {
            // Managers can seen users in their branch OR users they created
            where[models.Sequelize.Op.or] = [
                { branchId: req.user.branchId },
                { createdBy: req.user.userId }
            ];
            // If they filter by branch, it must be their own or one they manage
            if (branchId) {
                const branch = await models.Branch.findByPk(branchId);
                if (branch && branch.managedBy === req.user.userId) {
                    where.branchId = branchId;
                } else if (branchId !== req.user.branchId) {
                    return res.status(403).json({ error: 'Unauthorized to view this branch staff' });
                }
            }
        } else if (branchId) {
            where.branchId = branchId;
        }

        const users = await models.User.findAll({
            where,
            attributes: { exclude: ['password'] },
            include: [{
                model: models.Branch,
                as: 'branch',
                attributes: ['id', 'name']
            }],
            order: [['lastName', 'ASC']]
        });
        res.json({ users });
    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create user
router.post('/create', authenticate, authorize('manager'), async (req, res) => {
    try {
        const userData = {
            ...req.body,
            createdBy: req.user.userId
        };

        // Non-admins can only create users for their own branch or branches they manage
        if (req.user.role !== 'admin') {
            const branchId = userData.branchId || req.user.branchId;
            const branch = await models.Branch.findByPk(branchId);

            if (branchId !== req.user.branchId && (!branch || branch.managedBy !== req.user.userId)) {
                return res.status(403).json({ error: 'Unauthorized to create users for this branch' });
            }

            // Managers cannot create other admins
            if (userData.role === 'admin') {
                userData.role = 'salesperson';
            }
        }

        // Check if email exists
        const existing = await models.User.findOne({ where: { email: userData.email } });
        if (existing) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const user = await models.User.create(userData);

        // Remove password from response
        const userObj = user.toJSON();
        delete userObj.password;

        res.json({ success: true, user: userObj });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
