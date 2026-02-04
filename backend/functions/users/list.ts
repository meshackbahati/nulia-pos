import { Handler } from '@netlify/functions';
import models from '../../models';
import { createResponse, handleCORS, handleError } from '../../types';
import { verifyToken } from '../../middleware/auth';

export const handler: Handler = async (event, context) => {
    const corsResponse = handleCORS(event);
    if (corsResponse) return corsResponse;

    try {
        // Verify token
        const user = await verifyToken(event.headers.authorization);
        if (!user) {
            return createResponse(401, { error: 'Unauthorized' });
        }

        const { role, branchId } = event.queryStringParameters || {};

        const where: any = { isActive: true };

        // Managers can only see users from their branch
        if (user.role === 'manager') {
            where.branchId = user.branchId;
        }

        // Filter by role if specified
        if (role) {
            where.role = role;
        }

        // Filter by branch if specified (admin only)
        if (branchId && user.role === 'admin') {
            where.branchId = branchId;
        }

        const users = await models.User.findAll({
            where,
            attributes: { exclude: ['password'] },
            include: [
                {
                    model: models.Branch,
                    as: 'branch',
                    attributes: ['id', 'name'],
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        return createResponse(200, { users });
    } catch (error) {
        console.error('Error listing users:', error);
        return handleError(error);
    }
};
