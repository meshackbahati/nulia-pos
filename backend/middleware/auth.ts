import { HandlerEvent } from '@netlify/functions';
import { verifyToken, JWTPayload } from '../lib/auth';
import { AuthenticatedEvent } from '../types';

export const authenticateRequest = async (
    event: HandlerEvent
): Promise<JWTPayload | null> => {
    try {
        const authHeader = event.headers.authorization || event.headers.Authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }

        const token = authHeader.substring(7);
        const payload = verifyToken(token);

        return payload;
    } catch (error) {
        console.error('Authentication error:', error);
        return null;
    }
};

export const requireAuth = async (
    event: HandlerEvent,
    requiredRole?: string
): Promise<JWTPayload> => {
    const auth = await authenticateRequest(event);

    if (!auth) {
        const error: any = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
    }

    if (requiredRole && !hasPermission(auth.role, requiredRole)) {
        const error: any = new Error('Insufficient permissions');
        error.statusCode = 403;
        throw error;
    }

    return auth;
};

export function hasPermission(userRole: string, requiredRole: string): boolean {
    const roleHierarchy: Record<string, number> = {
        admin: 4,
        manager: 3,
        head_of_sales: 2,
        salesperson: 1,
    };

    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    return userLevel >= requiredLevel;
}
