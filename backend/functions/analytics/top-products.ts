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

        const { period = 'month', limit = '5' } = event.queryStringParameters || {};

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
        }

        // Get top products by quantity sold
        const topProducts = await models.SaleItem.findAll({
            attributes: [
                'productId',
                [models.sequelize.fn('SUM', models.sequelize.col('quantity')), 'totalQuantity'],
                [models.sequelize.fn('SUM', models.sequelize.literal('quantity * price')), 'totalRevenue'],
            ],
            include: [
                {
                    model: models.Sale,
                    as: 'sale',
                    where,
                    attributes: [],
                },
                {
                    model: models.Product,
                    as: 'product',
                    attributes: ['id', 'name', 'imageUrl', 'category', 'basePrice'],
                },
            ],
            group: ['productId', 'product.id', 'product.name', 'product.imageUrl', 'product.category', 'product.basePrice'],
            order: [[models.sequelize.literal('totalQuantity'), 'DESC']],
            limit: parseInt(limit),
        });

        return createResponse(200, {
            topProducts: topProducts.map((item: any, index: number) => ({
                rank: index + 1,
                product: item.product,
                quantitySold: parseInt(item.get('totalQuantity') as string),
                revenue: parseFloat(item.get('totalRevenue') as string),
            })),
            period,
        });
    } catch (error) {
        console.error('Error fetching top products:', error);
        return handleError(error);
    }
};
