import { Handler } from '@netlify/functions';
import models from '../../models';
import { requireAuth } from '../../middleware/auth';

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        const user = await requireAuth(event);

        // Only admin or manager can list branches
        // Or if super_admin is implemented. Alternatively, any authenticated user can list branches they have access to.
        // For now let's allow all authenticated users to list active branches for selection context

        const branches = await models.Branch.findAll({
            where: {
                isActive: true,
            },
            attributes: ['id', 'name', 'address', 'currency'], // Select specific fields
            order: [['name', 'ASC']],
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ branches }),
        };
    } catch (error) {
        console.error('List branches error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server error' }),
        };
    }
};
