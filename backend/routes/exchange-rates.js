import express from 'express';
import models from '../models/index.js';
import { authenticate, authorize } from '../lib/auth.js';
import { Op } from 'sequelize';

const router = express.Router();

/**
 * Get current exchange rates for a branch or globally
 */
router.get('/current', authenticate, async (req, res) => {
    try {
        const branchId = req.query.branchId || req.user.branchId;
        const rates = await models.ExchangeRate.findAll({
            where: {
                isActive: true,
                [Op.or]: [
                    { branchId: branchId },
                    { branchId: null }
                ]
            },
            order: [['date', 'DESC'], ['createdAt', 'DESC']]
        });
        
        // Return latest rate for each unique currency pair
        const latestRates = {};
        rates.forEach(r => {
            const pair = `${r.fromCurrency}_${r.toCurrency}`;
            if (!latestRates[pair]) {
                latestRates[pair] = r;
            }
        });

        res.json({ rates: Object.values(latestRates) });
    } catch (error) {
        console.error('Error fetching current rates:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Update / Set a rate (Admin/Manager only)
 */
router.post('/update', authenticate, authorize('manager'), async (req, res) => {
    try {
        const { fromCurrency, toCurrency, rate, branchId, date } = req.body;
        
        if (!fromCurrency || !toCurrency || !rate) {
            return res.status(400).json({ error: 'fromCurrency, toCurrency and rate are required' });
        }

        const newRate = await models.ExchangeRate.create({
            fromCurrency: fromCurrency.toUpperCase(),
            toCurrency: toCurrency.toUpperCase(),
            rate: parseFloat(rate),
            branchId: branchId || (req.user.role === 'admin' ? null : req.user.branchId),
            date: date || new Date().toISOString().split('T')[0],
            isActive: true
        });

        res.json({ success: true, rate: newRate });
    } catch (error) {
        console.error('Error updating rate:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
