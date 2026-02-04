import { Handler } from '@netlify/functions';
import models from '../../models';
import { createResponse, handleCORS, handleError } from '../../types';

export const handler: Handler = async (event, context) => {
    const corsResponse = handleCORS(event);
    if (corsResponse) return corsResponse;

    try {
        // Check if any admin user exists
        const adminCount = await models.User.count({
            where: {
                role: 'admin'
            }
        });

        return createResponse(200, {
            adminExists: adminCount > 0,
            needsSetup: adminCount === 0
        });
    } catch (error) {
        console.error('Error checking admin:', error);
        return handleError(error);
    }
};
