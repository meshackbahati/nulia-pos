import { Handler } from '@netlify/functions';
import models from '../../models';
import { requireAuth } from '../../middleware/auth';

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') { // Use POST for update often in these setups, or PUT
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        const user = await requireAuth(event);

        // Check if user is admin
        if (user.role !== 'admin') {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: 'Unauthorized: Only admins can manage branches' }),
            };
        }

        const data = JSON.parse(event.body || '{}');
        const { id, ...updates } = data;

        if (!id) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Branch ID is required' }),
            };
        }

        const branch = await models.Branch.findByPk(id);

        if (!branch) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Branch not found' }),
            };
        }

        await branch.update(updates);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Branch updated successfully', branch }),
        };
    } catch (error) {
        console.error('Update branch error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server error' }),
        };
    }
};
