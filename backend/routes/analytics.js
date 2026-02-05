import express from 'express';
import models, { sequelize } from '../models/index.js';
import { authenticate, authorize } from '../lib/auth.js';
import { Op } from 'sequelize';

const router = express.Router();

// Helper to get date range
const getDateRange = (period) => {
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'year') {
        startDate.setFullYear(startDate.getFullYear() - 1);
    }

    return { [Op.gte]: startDate };
};

// Global Summary Stats (Admin/Manager)
router.get('/summary', authenticate, async (req, res) => {
    try {
        const { period = 'today', branchId } = req.query;
        const dateRange = getDateRange(period);
        const where = { createdAt: dateRange };

        if (branchId) where.branchId = branchId;
        else if (req.user.role !== 'admin') where.branchId = req.user.branchId;

        const [sales, inventory, branches, topProducts] = await Promise.all([
            models.Sale.findAll({
                where,
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                ],
                raw: true
            }),
            models.Inventory.findAll({
                where: branchId ? { branchId } : (req.user.role !== 'admin' ? { branchId: req.user.branchId } : {}),
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('quantity')), 'totalStock'],
                    [sequelize.fn('COUNT', sequelize.literal('CASE WHEN quantity <= "minStockLevel" THEN 1 END')), 'lowStock']
                ],
                raw: true
            }),
            req.user.role === 'admin' ? models.Branch.count({ where: { isActive: true } }) : null,
            models.SaleItem.findAll({
                attributes: [
                    'productId',
                    [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQty'],
                    [sequelize.fn('SUM', sequelize.col('subtotal')), 'totalRevenue']
                ],
                include: [{
                    model: models.Product,
                    as: 'product',
                    attributes: ['name']
                }],
                where: { createdAt: dateRange },
                group: ['productId', 'product.id'],
                order: [[sequelize.literal('totalQty'), 'DESC']],
                limit: 5
            })
        ]);

        res.json({
            revenue: parseFloat(sales[0]?.revenue || 0),
            salesCount: parseInt(sales[0]?.count || 0),
            totalStock: parseInt(inventory[0]?.totalStock || 0),
            lowStockItems: parseInt(inventory[0]?.lowStock || 0),
            branchCount: branches || 1,
            topProducts
        });
    } catch (error) {
        console.error('Summary stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Salesperson Leaderboard
router.get('/leaderboard', authenticate, async (req, res) => {
    try {
        const { period = 'today', branchId, global = 'false' } = req.query;
        const dateRange = getDateRange(period);
        const where = { createdAt: dateRange };

        // Scope
        if (global === 'true' && req.user.role === 'admin') {
            // No branch filter
        } else if (branchId) {
            where.branchId = branchId;
        } else if (req.user.role !== 'admin') {
            where.branchId = req.user.branchId;
        }

        const leaderboard = await models.Sale.findAll({
            attributes: [
                'userId',
                [sequelize.fn('COUNT', sequelize.col('Sale.id')), 'salesCount'],
                [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalRevenue']
            ],
            where,
            include: [{
                model: models.User,
                as: 'user',
                attributes: ['id', 'firstName', 'lastName', 'role'],
                include: [{ model: models.Branch, as: 'branch', attributes: ['name'] }]
            }],
            group: ['userId', 'user.id', 'user->branch.id'],
            order: [[sequelize.literal('"totalRevenue"'), 'DESC']],
            limit: 20
        });

        res.json({
            success: true,
            leaderboard: leaderboard.map((l, idx) => ({
                rank: idx + 1,
                userId: l.userId,
                name: `${l.user.firstName} ${l.user.lastName}`,
                role: l.user.role,
                branch: l.user.branch?.name || 'N/A',
                revenue: parseFloat(l.get('totalRevenue')),
                count: parseInt(l.get('salesCount'))
            }))
        });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Branch Leaderboard (Admin Only)
router.get('/branch-leaderboard', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { period = 'week' } = req.query;
        const dateRange = getDateRange(period);

        const branches = await models.Branch.findAll({
            where: { isActive: true },
            attributes: [
                'id', 'name', 'location',
                [sequelize.literal('(SELECT COUNT(*) FROM sales WHERE sales."branchId" = "Branch".id AND sales."createdAt" >= \'' + dateRange[Op.gte].toISOString() + '\')'), 'salesCount'],
                [sequelize.literal('(SELECT SUM("totalAmount") FROM sales WHERE sales."branchId" = "Branch".id AND sales."createdAt" >= \'' + dateRange[Op.gte].toISOString() + '\')'), 'revenue']
            ],
            order: [[sequelize.literal('revenue'), 'DESC']]
        });

        res.json({
            success: true,
            leaderboard: branches.map((b, idx) => ({
                rank: idx + 1,
                id: b.id,
                name: b.name,
                location: b.location,
                revenue: parseFloat(b.get('revenue') || 0),
                count: parseInt(b.get('salesCount') || 0)
            }))
        });
    } catch (error) {
        console.error('Branch leaderboard error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Trends
router.get('/trends', authenticate, async (req, res) => {
    try {
        const { period = 'week', branchId } = req.query;
        const dateRange = getDateRange(period);
        const where = { createdAt: dateRange };

        if (branchId) where.branchId = branchId;
        else if (req.user.role !== 'admin') where.branchId = req.user.branchId;

        const interval = period === 'today' ? 'hour' : 'day';

        const trends = await models.Sale.findAll({
            where,
            attributes: [
                [sequelize.fn('date_trunc', interval, sequelize.col('createdAt')), 'time'],
                [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: [sequelize.fn('date_trunc', interval, sequelize.col('createdAt'))],
            order: [[sequelize.fn('date_trunc', interval, sequelize.col('createdAt')), 'ASC']],
            raw: true
        });

        res.json({
            success: true,
            trends: trends.map(t => ({
                time: t.time,
                revenue: parseFloat(t.revenue),
                count: parseInt(t.count)
            }))
        });
    } catch (error) {
        console.error('Trends error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
