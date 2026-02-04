import { Handler } from '@netlify/functions';
import { requireAuth } from '../../middleware/auth';
import models from '../../models';
import { createResponse, handleCORS, handleError } from '../../types';

export const handler: Handler = async (event, context) => {
    const cors = handleCORS(event);
    if (cors) return cors;

    if (event.httpMethod !== 'POST') {
        return createResponse(405, { error: 'Method not allowed' });
    }

    try {
        const auth = await requireAuth(event);
        if (!auth.branchId) {
            // Maybe allow admin to create for any branch? For now assume user's branch.
            return createResponse(400, { error: 'User not assigned to a branch' });
        }

        const body = JSON.parse(event.body || '{}');
        const { name, email, phone, address, contactPerson, website } = body;

        if (!name) return createResponse(400, { error: 'Name is required' });

        const supplier: any = await models.Supplier.create({
            branchId: auth.branchId,
            name,
            email,
            phone,
            address,
            contactPerson,
            website,
            isActive: true,
        });

        return createResponse(201, { success: true, supplier });
    } catch (error) {
        return handleError(error);
    }
};
