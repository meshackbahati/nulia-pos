import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

export interface AuthenticatedEvent extends HandlerEvent {
    user?: {
        userId: string;
        email: string;
        role: string;
        branchId?: string;
    };
}

export interface APIResponse {
    statusCode: number;
    headers: {
        'Content-Type': string;
        'Access-Control-Allow-Origin': string;
        'Access-Control-Allow-Headers': string;
        'Access-Control-Allow-Methods': string;
    };
    body: string;
}

export const createResponse = (
    statusCode: number,
    data: any,
    headers: Record<string, string> = {}
): APIResponse => {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            ...headers
        },
        body: JSON.stringify(data)
    };
};

export const handleCORS = (event: HandlerEvent): APIResponse | null => {
    if (event.httpMethod === 'OPTIONS') {
        return createResponse(200, { message: 'OK' });
    }
    return null;
};

export const handleError = (error: any): APIResponse => {
    console.error('Function error:', error);

    const message = error.message || 'Internal server error';
    const statusCode = error.statusCode || 500;

    return createResponse(statusCode, { error: message });
};
