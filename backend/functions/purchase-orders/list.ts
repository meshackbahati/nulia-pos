import { Handler } from '@netlify/functions';
import { requireAuth } from '../../middleware/auth';
import models from '../../models';
import { createResponse, handleCORS, handleError } from '../../types';

export const handler: Handler = async (event, context) => {
    const cors = handleCORS(event);
    if (cors) return cors;

    if (event.httpMethod !== 'GET') {
        return createResponse(405, { error: 'Method not allowed' });
    }

    try {
        const auth = await requireAuth(event);
        if (!auth.branchId) {
            return createResponse(400, { error: 'User not assigned to a branch' });
        }

        const purchaseOrders = await models.PurchaseOrder.findAll({
            where: { branchId: auth.branchId },
            include: [
                { model: models.Supplier, as: 'supplier' }
            ],
            order: [['createdAt', 'DESC']]
        });

        return createResponse(200, { success: true, purchaseOrders });
    } catch (error) {
        return handleError(error);
    }
};
