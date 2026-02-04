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

        const { threshold = '10' } = event.queryStringParameters || {};

        const products = await models.Product.findAll({
            where: {
                isActive: true,
                [Op.and]: [
                    models.sequelize.literal(`"stockQuantity" <= ${parseInt(threshold)}`)
                ],
            },
            order: [['stockQuantity', 'ASC']],
            attributes: ['id', 'name', 'sku', 'imageUrl', 'stockQuantity', 'lowStockThreshold', 'category'],
        });

        return createResponse(200, {
            lowStockProducts: products,
            count: products.length,
        });
    } catch (error) {
        console.error('Error fetching low stock products:', error);
        return handleError(error);
    }
};
