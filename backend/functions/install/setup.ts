import { Handler } from '@netlify/functions';
import { checkAdminExists, createUser } from '../../services/user-service';
import { createResponse, handleCORS, handleError } from '../../types';

export const handler: Handler = async (event, context) => {
    // Handle CORS preflight
    const corsResponse = handleCORS(event);
    if (corsResponse) return corsResponse;

    try {
        // GET - Check if admin exists
        if (event.httpMethod === 'GET') {
            const adminExists = await checkAdminExists();
            return createResponse(200, { adminExists });
        }

        // POST - Create first admin user
        if (event.httpMethod === 'POST') {
            // Check if admin already exists
            const adminExists = await checkAdminExists();
            if (adminExists) {
                return createResponse(400, {
                    error: 'Admin already exists. Installation not allowed.'
                });
            }

            const body = JSON.parse(event.body || '{}');
            const { firstName, lastName, email, password } = body;

            if (!firstName || !lastName || !email || !password) {
                return createResponse(400, {
                    error: 'All fields are required'
                });
            }

            const result = await createUser({
                firstName,
                lastName,
                email,
                password,
                role: 'admin',
            });

            if (!result.success) {
                return createResponse(400, { error: result.error });
            }

            return createResponse(201, {
                success: true,
                token: result.token,
                user: result.user,
            });
        }

        return createResponse(405, { error: 'Method not allowed' });

    } catch (error) {
        return handleError(error);
    }
};
