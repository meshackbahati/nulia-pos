import express from 'express';
import models from '../models/index.js';
import { authenticate, hasPermission } from '../lib/auth.js';

const router = express.Router();

// List suppliers
router.get('/list', authenticate, async (req, res) => {
    try {
        const suppliers = await models.Supplier.findAll({
            where: { isActive: true },
            order: [['name', 'ASC']]
        });
        res.json({ suppliers });
    } catch (error) {
        console.error('List suppliers error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create supplier
router.post('/create', authenticate, async (req, res) => {
    // Check permissions
    if (req.user.role === 'head_of_sales') {
        if (!req.user.permissions?.canManageInventory) {
            return res.status(403).json({ error: 'Head of Sales does not have inventory write access' });
        }
    } else if (!hasPermission(req.user.role, 'manager')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }

    try {
        const branchId = req.user.role === 'admin' ? req.body.branchId : req.user.branchId;

        // If no branchId specific and is admin, user must provide it
        if (!branchId) {
            return res.status(400).json({ error: 'Branch ID is required. Please verify your session or select a branch.' });
        }

        const supplierData = {
            ...req.body,
            branchId: branchId || req.user.branchId
        };

        const supplier = await models.Supplier.create(supplierData);
        res.json({ success: true, supplier });
    } catch (error) {
        console.error('Create supplier error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
