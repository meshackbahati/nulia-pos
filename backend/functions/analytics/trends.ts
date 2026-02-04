import { Handler } from '@netlify/functions';
import models from '../../models';
import { requireAuth } from '../../middleware/auth';
import { Op, Sequelize } from 'sequelize';

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        const user = await requireAuth(event);
        const { period = 'week', branchId } = event.queryStringParameters || {};

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        if (period === 'month') {
            startDate.setDate(startDate.getDate() - 30);
        } else {
            startDate.setDate(startDate.getDate() - 7);
        }

        const whereClause: any = {
            createdAt: {
                [Op.between]: [startDate, endDate],
            },
        };

        if (branchId) {
            whereClause.branchId = branchId;
        }

        // Fetch sales for revenue trend
        const sales = await models.Sale.findAll({
            where: whereClause,
            attributes: [
                [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'],
                [Sequelize.fn('SUM', Sequelize.col('totalAmount')), 'revenue'],
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'salesCount'],
            ],
            group: [Sequelize.fn('DATE', Sequelize.col('createdAt'))],
            order: [[Sequelize.fn('DATE', Sequelize.col('createdAt')), 'ASC']],
        });

        // Format for recharts
        const revenueTrend = sales.map((sale: any) => ({
            day: new Date(sale.getDataValue('date')).toLocaleDateString('en-US', { weekday: 'short' }),
            fullDate: sale.getDataValue('date'),
            revenue: parseFloat(sale.getDataValue('revenue')),
            sales: parseInt(sale.getDataValue('salesCount'), 10),
        }));

        // Fetch payment method distribution
        const paymentMethods = await models.Sale.findAll({
            where: whereClause,
            attributes: [
                'paymentMethod',
                [Sequelize.fn('SUM', Sequelize.col('totalAmount')), 'value'],
            ],
            group: ['paymentMethod'],
        });

        const paymentMethodsData = paymentMethods.map((pm: any) => ({
            name: pm.paymentMethod.charAt(0).toUpperCase() + pm.paymentMethod.slice(1),
            value: parseFloat(pm.getDataValue('value')),
            color: getColorForMethod(pm.paymentMethod),
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({
                revenueTrend,
                paymentMethods: paymentMethodsData,
            }),
        };
    } catch (error) {
        console.error('Analytics trends error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server error' }),
        };
    }
};

function getColorForMethod(method: string): string {
    switch (method.toLowerCase()) {
        case 'cash': return '#10b981'; // Green
        case 'mpesa': return '#3b82f6'; // Blue
        case 'card': return '#8b5cf6'; // Purple
        default: return '#9ca3af'; // Gray
    }
}
