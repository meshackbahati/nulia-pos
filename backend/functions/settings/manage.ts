import { Handler } from '@netlify/functions';
import { requireAuth } from '../../middleware/auth';
import {
    getSettings,
    createOrUpdateSetting,
    deleteSetting
} from '../../services/settings-service';
import { createResponse, handleCORS, handleError } from '../../types';

export const handler: Handler = async (event, context) => {
    const corsResponse = handleCORS(event);
    if (corsResponse) return corsResponse;

    try {
        const auth = await requireAuth(event, 'manager');

        // GET - List settings
        if (event.httpMethod === 'GET') {
            const params = event.queryStringParameters || {};
            const category = params.category;

            // Managers can only see their branch settings
            // Admins can see global settings (branchId = null) or specific branch
            const branchId = auth.role === 'admin'
                ? (params.branchId || null)
                : auth.branchId;

            const settings = await getSettings(branchId, category);

            // Don't send encrypted values to frontend
            const sanitized = settings.map(s => ({
                id: s.id,
                category: s.category,
                key: s.key,
                isActive: s.isActive,
                // Only send masked value for sensitive data
                hasSensitiveValue: s.isEncrypted && !!s.value,
            }));

            return createResponse(200, { settings: sanitized });
        }

        // POST - Create or update setting
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const { category, key, value, isEncrypted, branchId } = body;

            if (!category || !key || !value) {
                return createResponse(400, {
                    error: 'Category, key, and value are required'
                });
            }

            // Validate admin/manager can only update their branch
            const targetBranchId = auth.role === 'admin'
                ? (branchId || null)
                : auth.branchId;

            const result = await createOrUpdateSetting({
                branchId: targetBranchId,
                category,
                key,
                value,
                isEncrypted: isEncrypted || false,
                createdBy: auth.userId,
            });

            if (!result.success) {
                return createResponse(400, { error: result.error });
            }

            return createResponse(200, {
                success: true,
                message: 'Setting saved successfully'
            });
        }

        // DELETE - Remove setting
        if (event.httpMethod === 'DELETE') {
            const params = event.queryStringParameters || {};
            const { category, key, branchId } = params;

            if (!category || !key) {
                return createResponse(400, {
                    error: 'Category and key are required'
                });
            }

            const targetBranchId = auth.role === 'admin'
                ? (branchId || null)
                : auth.branchId;

            const result = await deleteSetting(targetBranchId, category, key);

            if (!result.success) {
                return createResponse(400, { error: result.error });
            }

            return createResponse(200, {
                success: true,
                message: 'Setting deleted successfully'
            });
        }

        return createResponse(405, { error: 'Method not allowed' });

    } catch (error) {
        return handleError(error);
    }
};
