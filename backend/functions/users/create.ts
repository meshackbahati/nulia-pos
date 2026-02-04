import { Handler } from '@netlify/functions';
import models from '../../models';
import { createResponse, handleCORS, handleError } from '../../types';
import { verifyToken } from '../../middleware/auth';
import bcrypt from 'bcryptjs';

export const handler: Handler = async (event, context) => {
    const corsResponse = handleCORS(event);
    if (corsResponse) return corsResponse;

    if (event.httpMethod !== 'POST') {
        return createResponse(405, { error: 'Method not allowed' });
    }

    try {
        // Verify token and check if user is manager/admin
        const user = await verifyToken(event.headers.authorization);
        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            return createResponse(403, { error: 'Only managers can create users' });
        }

        const {
            email,
            password,
            firstName,
            lastName,
            role = 'salesperson',
            branchId,
        } = JSON.parse(event.body || '{}');

        // Validate required fields
        if (!email || !password || !firstName || !lastName) {
            return createResponse(400, {
                error: 'Missing required fields: email, password, firstName, lastName',
            });
        }

        // Check if user already exists
        const existingUser = await models.User.findOne({ where: { email } });
        if (existingUser) {
            return createResponse(409, { error: 'User with this email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const newUser = await models.User.create({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            role,
            branchId: branchId || user.branchId, // Use manager's branch if not specified
            isActive: true,
        });

        // Remove password from response
        const userResponse = newUser.toJSON();
        delete userResponse.password;

        return createResponse(201, {
            message: 'User created successfully',
            user: userResponse,
        });
    } catch (error) {
        console.error('Error creating user:', error);
        return handleError(error);
    }
};
