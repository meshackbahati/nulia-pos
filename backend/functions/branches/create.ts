import { Handler } from '@netlify/functions';
import models from '../../models';
import { requireAuth } from '../../middleware/auth';

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
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
                body: JSON.stringify({ error: 'Unauthorized: Only admins can create branches' }),
            };
        }

        const data = JSON.parse(event.body || '{}');

        // Basic validation
        if (!data.name || !data.address || !data.phone || !data.email) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Name, address, phone, and email are required' }),
            };
        }

        const branch = await models.Branch.create({
            ...data,
            isActive: true, // Default to active
        });

        return {
            statusCode: 201,
            body: JSON.stringify({ message: 'Branch created successfully', branch }),
        };
    } catch (error) {
        console.error('Create branch error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server error' }),
        };
    }
};
