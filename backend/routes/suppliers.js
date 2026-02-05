import express from 'express';
import models from '../models/index.js';
import { authenticate, authorize } from '../lib/auth.js';

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
router.post('/create', authenticate, authorize('manager'), async (req, res) => {
    try {
        const supplier = await models.Supplier.create(req.body);
        res.json({ success: true, supplier });
    } catch (error) {
        console.error('Create supplier error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
