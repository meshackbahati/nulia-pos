import express from 'express';
import models, { sequelize } from '../models/index.js';
import { authenticate, authorize } from '../lib/auth.js';
import { Op } from 'sequelize';

const router = express.Router();

// Helper to get date range
const getDateRange = (period) => {
    if (period === 'all') return null;

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

// Dashboard Stats (Consolidated for frontend)
router.get('/dashboard', authenticate, async (req, res) => {
    try {
        // Admin: use active branch unless scope=all is specified
        let branchId;
        if (req.user.role === 'admin') {
            if (req.query.scope === 'all') {
                branchId = null; // no branch filter - all branches
            } else {
                branchId = req.user.branchId; // active branch (must switch to change)
            }
        } else {
            branchId = req.user.branchId;
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const where = { createdAt: { [Op.gte]: today } };
        if (branchId) where.branchId = branchId;

        const [todaySalesData, totalProducts, lowStockItems, activeUsers, topProducts, recentSales] = await Promise.all([
            models.Sale.findAll({
                where,
                attributes: [
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                    [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue']
                ],
                raw: true
            }),
            models.Product.count({ where: { isActive: true } }),
            models.Inventory.count({
                where: {
                    ...(branchId ? { branchId } : {}),
                    quantity: { [Op.lte]: sequelize.col('minStockLevel') }
                }
            }),
            models.User.count({
                where: {
                    isActive: true,
                    ...(branchId ? { branchId } : {})
                }
            }),
            models.SaleItem.findAll({
                attributes: [
                    'productId',
                    [sequelize.fn('SUM', sequelize.col('quantity')), 'quantity'],
                    [sequelize.fn('SUM', sequelize.col('totalPrice')), 'revenue']
                ],
                include: [{
                    model: models.Product,
                    as: 'product',
                    attributes: ['name']
                }],
                where: {
                    createdAt: { [Op.gte]: today },
                    ...(branchId ? { branchId } : {})
                },
                group: ['productId', 'product.id'],
                order: [[sequelize.literal('"quantity"'), 'DESC']],
                limit: 5
            }),
            models.Sale.findAll({
                where: branchId ? { branchId } : {},
                order: [['createdAt', 'DESC']],
                limit: 10,
                attributes: ['id', 'receiptId', 'totalAmount', 'createdAt']
            })
        ]);

        res.json({
            success: true,
            stats: {
                todaySales: parseInt(todaySalesData[0]?.count || 0),
                todayRevenue: parseFloat(todaySalesData[0]?.revenue || 0),
                totalProducts,
                lowStockItems,
                activeUsers,
                topProducts,
                recentSales
            }
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Global Summary Stats (Admin/Manager)
router.get('/summary', authenticate, async (req, res) => {
    try {
        const { period = 'today' } = req.query;
        const dateRange = getDateRange(period);
        const where = { createdAt: dateRange };

        // Admin: use active branch unless scope=all
        if (req.user.role === 'admin') {
            if (req.query.scope !== 'all') {
                if (req.user.branchId) where.branchId = req.user.branchId;
            }
        } else {
            where.branchId = req.user.branchId;
        }

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
                where: (req.user.role === 'admin' && req.query.scope === 'all') ? {} : { branchId: where.branchId || req.user.branchId },
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
                    [sequelize.fn('SUM', sequelize.col('totalPrice')), 'totalRevenue']
                ],
                include: [{
                    model: models.Product,
                    as: 'product',
                    attributes: ['name']
                }],
                where: {
                    createdAt: dateRange,
                    ...(where.branchId ? { branchId: where.branchId } : {})
                },
                group: ['productId', 'product.id'],
                order: [[sequelize.literal('"totalQty"'), 'DESC']],
                limit: 5
            })
        ]);

        res.json({
            revenue: parseFloat(sales[0]?.revenue || 0),
            salesCount: parseInt(sales[0]?.count || 0),
            totalStock: parseFloat(inventory[0]?.totalStock || 0),
            lowStockItems: parseFloat(inventory[0]?.lowStock || 0),
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
        const { period = 'today', global = 'false' } = req.query;
        const dateRange = getDateRange(period);
        const where = { createdAt: dateRange };

        // 1. Determine Scope for Sales Data
        if (global === 'true' && req.user.role === 'admin') {
            // No branch filter - all branches
        } else if (req.user.role === 'admin') {
            // Admin uses active branch (must switch to change)
            if (req.user.branchId) where.branchId = req.user.branchId;
        } else {
            // Non-admins restricted to their branch
            where.branchId = req.user.branchId;
        }

        // 2. Fetch Aggregated Sales Data (Everyone who sold)
        const salesData = await models.Sale.findAll({
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
            order: [[sequelize.literal('"totalRevenue"'), 'DESC']]
        });

        // 3. Fetch ALL Salespersons (Mandatory inclusion)
        const salespersonWhere = { role: 'salesperson', isActive: true };
        if (req.user.role === 'admin' && global !== 'true') {
            // Admin: only include salespersons from active branch unless global
            if (req.user.branchId) salespersonWhere.branchId = req.user.branchId;
        } else if (req.user.role !== 'admin') {
            salespersonWhere.branchId = req.user.branchId;
        }

        const allSalespersons = await models.User.findAll({
            where: salespersonWhere,
            attributes: ['id', 'firstName', 'lastName', 'role'],
            include: [{ model: models.Branch, as: 'branch', attributes: ['name'] }]
        });

        // 4. Merge Data
        // Start with sales map
        const leaderboardMap = new Map();

        // Process actual sales first
        salesData.forEach(sale => {
            const userId = sale.userId;
            leaderboardMap.set(userId, {
                userId,
                name: `${sale.user.firstName} ${sale.user.lastName}`,
                role: sale.user.role,
                branch: sale.user.branch?.name || 'N/A',
                revenue: parseFloat(sale.get('totalRevenue')),
                count: parseInt(sale.get('salesCount'))
            });
        });

        // Ensure all salespersons are present (even if 0 sales)
        allSalespersons.forEach(user => {
            if (!leaderboardMap.has(user.id)) {
                leaderboardMap.set(user.id, {
                    userId: user.id,
                    name: `${user.firstName} ${user.lastName}`,
                    role: user.role,
                    branch: user.branch?.name || 'N/A',
                    revenue: 0,
                    count: 0
                });
            }
        });

        // 5. Convert to array and filter/sort
        const finalLeaderboard = Array.from(leaderboardMap.values())
            .filter(entry => {
                // Keep if Salesperson OR (Has Sales > 0)
                // Note: The logic above effectively adds salespersons. 
                // Any non-salesperson in the map MUST have come from salesData, meaning they have sales.
                // So no extra filtering needed unless we want to strictly enforce the "Execs only if sold" rule again, 
                // but the construction guarantees it.
                return true;
            })
            .sort((a, b) => b.revenue - a.revenue); // Sort by revenue DESC

        res.json({
            success: true,
            leaderboard: finalLeaderboard.map((l, idx) => ({
                ...l,
                rank: idx + 1
            }))
        });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Top Products (Detailed)
router.get('/top-products', authenticate, async (req, res) => {
    try {
        const { period = 'week', limit = 10 } = req.query;
        const dateRange = getDateRange(period);
        const where = { createdAt: dateRange };

        // Admin: use active branch unless scope=all
        if (req.user.role === 'admin') {
            if (req.query.scope !== 'all' && req.user.branchId) {
                where.branchId = req.user.branchId;
            }
        } else {
            where.branchId = req.user.branchId;
        }

        const topProducts = await models.SaleItem.findAll({
            attributes: [
                'productId',
                [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQty'],
                [sequelize.fn('SUM', sequelize.col('totalPrice')), 'totalRevenue']
            ],
            include: [{
                model: models.Product,
                as: 'product',
                attributes: ['id', 'name', 'sku', 'basePrice']
            }],
            where,
            group: ['productId', 'product.id'],
            order: [[sequelize.literal('"totalQty"'), 'DESC']],
            limit: parseInt(limit)
        });

        res.json({
            success: true,
            topProducts: topProducts.map(p => ({
                product: {
                    name: p.product.name,
                    sku: p.product.sku,
                    price: parseFloat(p.product.basePrice)
                },
                quantitySold: parseFloat(p.get('totalQty')),
                revenue: parseFloat(p.get('totalRevenue'))
            }))
        });
    } catch (error) {
        console.error('Top products error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Branch Comparison (Admin Only)
router.get('/branch-comparison', authenticate, authorize('admin'), async (req, res) => {
    try {
        const branches = await models.Branch.findAll({
            where: { isActive: true },
            attributes: [
                'id', 'name',
                [sequelize.literal('(SELECT COUNT(*) FROM sales WHERE sales."branchId" = "Branch".id)'), 'salesCount'],
                [sequelize.literal('(SELECT SUM("totalAmount") FROM sales WHERE sales."branchId" = "Branch".id)'), 'revenue']
            ]
        });

        res.json({
            success: true,
            branches: branches.map(b => ({
                id: b.id,
                name: b.name,
                revenue: parseFloat(b.get('revenue') || 0),
                salesCount: parseInt(b.get('salesCount') || 0)
            }))
        });
    } catch (error) {
        console.error('Branch comparison error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Supplier Stats
router.get('/suppliers', authenticate, authorize('manager'), async (req, res) => {
    try {
        // Admin: use active branch unless scope=all
        let where = {};
        if (req.user.role === 'admin') {
            if (req.query.scope === 'all') {
                where = {};
            } else {
                where = req.user.branchId ? { branchId: req.user.branchId } : {};
            }
        } else {
            where = { branchId: req.user.branchId };
        }

        const stats = await models.PurchaseOrder.findAll({
            attributes: [
                'supplierId',
                [sequelize.fn('COUNT', sequelize.col('PurchaseOrder.id')), 'orderCount'],
                [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalSpent']
            ],
            where,
            include: [{
                model: models.Supplier,
                as: 'supplier',
                attributes: ['name']
            }],
            group: ['supplierId', 'supplier.id'],
            order: [[sequelize.literal('"totalSpent"'), 'DESC']]
        });

        res.json({
            success: true,
            stats: stats.map(s => ({
                supplier: s.supplier,
                orderCount: parseInt(s.get('orderCount')),
                totalSpent: parseFloat(s.get('totalSpent'))
            }))
        });
    } catch (error) {
        console.error('Supplier stats error:', error);
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
                'id', 'name',
                [sequelize.col('address'), 'location'],
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
        const { period = 'week' } = req.query;
        const dateRange = getDateRange(period);
        const where = { createdAt: dateRange };

        // Admin: use active branch unless scope=all
        if (req.user.role === 'admin') {
            if (req.query.scope !== 'all' && req.user.branchId) {
                where.branchId = req.user.branchId;
            }
        } else {
            where.branchId = req.user.branchId;
        }

        // Choose grouping interval based on period
        let interval;
        if (period === 'today') {
            interval = 'hour';
        } else if (period === 'year') {
            interval = 'month';
        } else if (period === 'month') {
            interval = 'week';
        } else {
            interval = 'day';
        }

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

        const paymentMethods = await models.Sale.findAll({
            where,
            attributes: [
                'paymentMethod',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('SUM', sequelize.col('totalAmount')), 'value']
            ],
            group: ['paymentMethod'],
            raw: true
        });

        res.json({
            success: true,
            revenueTrend: trends.map(t => {
                const date = new Date(t.time);
                let label;
                if (period === 'year') {
                    label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                } else if (period === 'month') {
                    label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                } else {
                    label = date.toLocaleDateString('en-US', { weekday: 'short' });
                }
                return {
                    day: label,
                    revenue: parseFloat(t.revenue),
                    sales: parseInt(t.count)
                };
            }),
            paymentMethods: paymentMethods.map(p => ({
                name: p.paymentMethod,
                value: parseFloat(p.value)
            }))
        });
    } catch (error) {
        console.error('Trends error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Currency breakdown — totals per transaction currency for comparison
router.get('/currency-breakdown', authenticate, async (req, res) => {
    try {
        let branchId;
        if (req.user.role === 'admin') {
            branchId = req.query.scope === 'all' ? null : req.user.branchId;
        } else {
            branchId = req.user.branchId;
        }

        const dateRange = req.query.period ? getDateRange(req.query.period) : null;

        const where = dateRange ? { createdAt: dateRange } : {};
        if (branchId) where.branchId = branchId;

        // Get branch default currency for null transactionCurrency
        const branch = branchId ? await models.Branch.findByPk(branchId, { attributes: ['currency'] }) : null;
        const defaultCurrency = branch?.currency || 'KES';

        // Per-currency breakdown
        const currencies = await models.Sale.findAll({
            attributes: [
                'transactionCurrency',
                [sequelize.fn('COUNT', sequelize.col('id')), 'saleCount'],
                [sequelize.fn('SUM', sequelize.col('totalAmount')), 'baseTotal'],
                [sequelize.fn('SUM', sequelize.literal('"Sale"."totalAmount" * COALESCE("Sale"."transactionExchangeRate", 1)')), 'displayTotal'],
            ],
            where,
            group: ['transactionCurrency'],
            raw: true,
        });

        // Grand total in base currency
        const grandTotal = await models.Sale.findOne({
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalSales'],
                [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalBaseRevenue'],
            ],
            where,
        });

        const totalSales = Number(grandTotal?.dataValues?.totalSales || 0);
        const totalBaseRevenue = Number(grandTotal?.dataValues?.totalBaseRevenue || 0);

        const getSymbol = (code) => ({ KES: 'KSh', UGX: 'UGX', TZS: 'TZS', USD: '$', EUR: '€', GBP: '£' })[code] || code;

        const formatted = (currencies || []).map(c => {
            const baseTotal = Number(c.baseTotal) || 0;
            const displayTotal = Number(c.displayTotal) || 0;
            return {
                currency: c.transactionCurrency || defaultCurrency,
                symbol: getSymbol(c.transactionCurrency || defaultCurrency),
                saleCount: Number(c.saleCount) || 0,
                baseTotal,
                displayTotal,
                percentageOfTotal: totalBaseRevenue > 0 ? ((baseTotal / totalBaseRevenue) * 100).toFixed(1) : 0,
            };
        });

        // Sort by baseTotal descending
        formatted.sort((a, b) => b.baseTotal - a.baseTotal);

        res.json({
            currencies: formatted,
            totalSales,
            totalBaseRevenue,
            totalSymbol: getSymbol('KES'),
        });
    } catch (error) {
        console.error('Currency breakdown error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
