import { Handler } from '@netlify/functions';
import { requireAuth } from '../../middleware/auth';
import models from '../../models';
import { createResponse, handleError } from '../../types';

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        return createResponse(405, { error: 'Method not allowed' });
    }

    try {
        const auth = await requireAuth(event);
        const { checkoutRequestId, saleId } = event.queryStringParameters || {};

        if (!checkoutRequestId && !saleId) {
            return createResponse(400, { error: 'Missing checkoutRequestId or saleId' });
        }

        let query: any = {};
        if (checkoutRequestId) {
            query.externalReference = checkoutRequestId;
        } else if (saleId) {
            query.saleId = saleId;
        }

        const payment: any = await models.Payment.findOne({
            where: query,
            order: [['createdAt', 'DESC']] // Get latest if using saleId
        });

        if (!payment) {
            return createResponse(404, { error: 'Payment not found' });
        }

        return createResponse(200, {
            status: payment.status,
            mpesaReceiptNumber: payment.mpesaReceiptNumber,
            failureReason: payment.failureReason,
            completed: payment.status === 'completed',
            failed: payment.status === 'failed'
        });

    } catch (error) {
        return handleError(error);
    }
};
