import { Handler } from '@netlify/functions';
import models from '../../models';
import { createResponse, handleCORS, handleError } from '../../types';
import { verifyToken } from '../../middleware/auth';
import { Op } from 'sequelize';

export const handler: Handler = async (event, context) => {
    const corsResponse = handleCORS(event);
    if (corsResponse) return corsResponse;

    try {
        // Verify token
        const user = await verifyToken(event.headers.authorization);
        if (!user) {
            return createResponse(401, { error: 'Unauthorized' });
        }

        const now = new Date();
        const today = new Date(now.setHours(0, 0, 0, 0));
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        weekStart.setHours(0, 0, 0, 0);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const where: any = { paymentStatus: 'completed' };

        // Filter by branch
        if (user.role === 'manager') {
            where.branchId = user.branchId;
        } else if (user.role === 'salesperson') {
            where.userId = user.id; // Sales people only see their own stats
        }

        // Today's stats
        const todayStats = await models.Sale.findAll({
            attributes: [
                [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count'],
                [models.sequelize.fn('SUM', models.sequelize.col('totalAmount')), 'revenue'],
            ],
            where: {
                ...where,
                createdAt: { [Op.gte]: today },
            },
        });

        // This week's stats
        const weekStats = await models.Sale.findAll({
            attributes: [
                [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count'],
                [models.sequelize.fn('SUM', models.sequelize.col('totalAmount')), 'revenue'],
            ],
            where: {
                ...where,
                createdAt: { [Op.gte]: weekStart },
            },
        });

        // This month's stats
        const monthStats = await models.Sale.findAll({
            attributes: [
                [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count'],
                [models.sequelize.fn('SUM', models.sequelize.col('totalAmount')), 'revenue'],
            ],
            where: {
                ...where,
                createdAt: { [Op.gte]: monthStart },
            },
        });

        // Low stock products (manager/admin only)
        let lowStockCount = 0;
        if (user.role === 'manager' || user.role === 'admin') {
            lowStockCount = await models.Product.count({
                where: {
                    isActive: true,
                    [Op.and]: [
                        models.sequelize.literal('"stockQuantity" <= "lowStockThreshold"')
                    ],
                },
            });
        }

        return createResponse(200, {
            today: {
                salesCount: parseInt(todayStats[0]?.get('count') as string || '0'),
                revenue: parseFloat(todayStats[0]?.get('revenue') as string || '0'),
            },
            week: {
                salesCount: parseInt(weekStats[0]?.get('count') as string || '0'),
                revenue: parseFloat(weekStats[0]?.get('revenue') as string || '0'),
            },
            month: {
                salesCount: parseInt(monthStats[0]?.get('count') as string || '0'),
                revenue: parseFloat(monthStats[0]?.get('revenue') as string || '0'),
            },
            lowStockCount,
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return handleError(error);
    }
};
