import { Handler } from '@netlify/functions';
import { authenticateUser } from '../../services/user-service';
import { createResponse, handleCORS, handleError } from '../../types';

export const handler: Handler = async (event, context) => {
    // Handle CORS preflight
    const corsResponse = handleCORS(event);
    if (corsResponse) return corsResponse;

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return createResponse(405, { error: 'Method not allowed' });
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { email, password } = body;

        if (!email || !password) {
            return createResponse(400, {
                error: 'Email and password are required'
            });
        }

        const result = await authenticateUser({ email, password });

        if (!result.success) {
            return createResponse(401, { error: result.error });
        }

        return createResponse(200, {
            success: true,
            token: result.token,
            user: result.user,
        });

    } catch (error) {
        return handleError(error);
    }
};
