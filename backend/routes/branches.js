import express from 'express';
import models from '../models/index.js';
import { authenticate, authorize } from '../lib/auth.js';

const router = express.Router();

// List all branches
router.get('/list', authenticate, async (req, res) => {
    try {
        const where = { isActive: true };

        // Non-admins only see branches they belong to or manage
        if (req.user.role !== 'admin') {
            where[models.Sequelize.Op.or] = [
                { id: req.user.branchId },
                { managedBy: req.user.userId }
            ];
        }

        const branches = await models.Branch.findAll({
            where,
            order: [['name', 'ASC']]
        });
        res.json({ branches });
    } catch (error) {
        console.error('List branches error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get current user's branch
router.get('/me', authenticate, async (req, res) => {
    try {
        if (!req.user.branchId) {
            return res.status(404).json({ error: 'User is not assigned to a branch' });
        }
        const branch = await models.Branch.findByPk(req.user.branchId);
        if (!branch) {
            return res.status(404).json({ error: 'Branch not found' });
        }
        res.json({ branch });
    } catch (error) {
        console.error('Get branch/me error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create new branch
router.post('/create', authenticate, authorize('manager'), async (req, res) => {
    try {
        const branchData = {
            ...req.body,
            managedBy: req.user.userId // Track who created it
        };
        const branch = await models.Branch.create(branchData);
        res.json({ success: true, branch });
    } catch (error) {
        console.error('Create branch error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update branch
router.post('/update', authenticate, authorize('manager', true), async (req, res) => {
    try {
        const { id, ...updateData } = req.body;
        const branch = await models.Branch.findByPk(id);

        if (!branch) {
            return res.status(404).json({ error: 'Branch not found' });
        }

        // Additional security check for non-admins (already mostly handled by middleware 'checkBranch')
        if (req.user.role !== 'admin' && branch.managedBy !== req.user.userId && branch.id !== req.user.branchId) {
            return res.status(403).json({ error: 'Unauthorized to update this branch' });
        }

        // Handle M-Pesa credentials if present (model hooks handle encryption)
        if (updateData.mpesaConsumerKey) branch.mpesaConsumerKey = updateData.mpesaConsumerKey;
        if (updateData.mpesaConsumerSecret) branch.mpesaConsumerSecret = updateData.mpesaConsumerSecret;
        if (updateData.mpesaPasskey) branch.mpesaPasskey = updateData.mpesaPasskey;
        if (updateData.mpesaShortcode) branch.mpesaShortcode = updateData.mpesaShortcode;

        // Remove from updateData to prevent double-assignment
        delete updateData.mpesaConsumerKey;
        delete updateData.mpesaConsumerSecret;
        delete updateData.mpesaPasskey;
        delete updateData.mpesaShortcode;

        await branch.update(updateData);
        res.json({ success: true, branch });
    } catch (error) {
        console.error('Update branch error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
