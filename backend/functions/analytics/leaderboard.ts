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
        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            return createResponse(403, { error: 'Unauthorized' });
        }

        const { period = 'month', branchId } = event.queryStringParameters || {};

        // Calculate date range
        const now = new Date();
        let startDate: Date;

        switch (period) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'week':
                const dayOfWeek = now.getDay();
                startDate = new Date(now.setDate(now.getDate() - dayOfWeek));
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'month':
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
        }

        const where: any = {
            createdAt: { [Op.gte]: startDate },
            paymentStatus: 'completed',
        };

        // Filter by branch
        if (user.role === 'manager') {
            where.branchId = user.branchId;
        } else if (branchId) {
            where.branchId = branchId;
        }

        // Get top 5 sales people by total sales
        const leaderboard = await models.Sale.findAll({
            attributes: [
                'userId',
                [models.sequelize.fn('COUNT', models.sequelize.col('userId')), 'salesCount'],
                [models.sequelize.fn('SUM', models.sequelize.col('totalAmount')), 'totalRevenue'],
            ],
            where,
            include: [
                {
                    model: models.User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                },
            ],
            group: ['userId', 'user.id', 'user.firstName', 'user.lastName', 'user.email'],
            order: [[models.sequelize.literal('totalRevenue'), 'DESC']],
            limit: 10,
        });

        return createResponse(200, {
            leaderboard: leaderboard.map((item: any, index: number) => ({
                rank: index + 1,
                user: item.user,
                salesCount: parseInt(item.get('salesCount') as string),
                totalRevenue: parseFloat(item.get('totalRevenue') as string),
            })),
            period,
        });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return handleError(error);
    }
};
