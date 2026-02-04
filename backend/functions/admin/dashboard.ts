import { Handler } from '@netlify/functions';
import { requireAuth } from '../../middleware/auth';
import models from '../../models';
import { Op } from 'sequelize';
import { createResponse, handleCORS, handleError } from '../../types';

export const handler: Handler = async (event, context) => {
    // Handle CORS preflight
    const corsResponse = handleCORS(event);
    if (corsResponse) return corsResponse;

    // Only allow GET
    if (event.httpMethod !== 'GET') {
        return createResponse(405, { error: 'Method not allowed' });
    }

    try {
        const auth = await requireAuth(event, 'admin');

        // Get total branches
        const totalBranches = await models.Branch.count();
        const activeBranches = await models.Branch.count({
            where: { isActive: true }
        });

        // Get total users
        const totalUsers = await models.User.count({
            where: { isActive: true }
        });

        // Get this month's sales
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const totalSales = await models.Sale.count({
            where: {
                createdAt: {
                    [Op.gte]: startOfMonth
                },
                paymentStatus: 'completed'
            }
        });

        // Get this month's revenue
        const revenueResult = await models.Sale.sum('totalAmount', {
            where: {
                createdAt: {
                    [Op.gte]: startOfMonth
                },
                paymentStatus: 'completed'
            }
        });
        const totalRevenue = revenueResult || 0;

        // Get recent activity from audit logs
        const recentActivity = await models.AuditLog.findAll({
            limit: 10,
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: models.User,
                    as: 'user',
                    attributes: ['firstName', 'lastName'],
                },
                {
                    model: models.Branch,
                    as: 'branch',
                    attributes: ['name'],
                },
            ],
        });

        const formattedActivity = recentActivity.map(log => ({
            id: log.id,
            action: log.action.replace(/_/g, ' ').toUpperCase(),
            user: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
            timestamp: log.createdAt.toLocaleString(),
            branch: log.branch?.name,
        }));

        return createResponse(200, {
            totalBranches,
            activeBranches,
            totalUsers,
            totalSales,
            totalRevenue,
            recentActivity: formattedActivity,
        });

    } catch (error) {
        return handleError(error);
    }
};
