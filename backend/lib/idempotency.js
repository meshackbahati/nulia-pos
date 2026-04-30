import models from '../models/index.js';

/**
 * Idempotency Middleware
 * Ensures that requests with the same Idempotency-Key are only processed once.
 */
export async function idempotency(req, res, next) {
    const key = req.headers['idempotency-key'];
    
    // Only apply to mutating methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) || !key) {
        return next();
    }

    try {
        // Check if we've already processed this key
        const existingRecord = await models.sequelize.query(
            'SELECT "responseStatus", "responseBody" FROM idempotency_keys WHERE key = :key LIMIT 1',
            {
                replacements: { key },
                type: models.sequelize.QueryTypes.SELECT
            }
        );

        if (existingRecord.length > 0) {
            const { responseStatus, responseBody } = existingRecord[0];
            return res.status(responseStatus).json(responseBody);
        }

        // Intercept res.json to save the response
        const originalJson = res.json;
        res.json = function(body) {
            // Only cache successful or client-error responses, avoid caching server errors if they might be transient
            if (res.statusCode < 500 && req.user) {
                models.sequelize.query(
                    'INSERT INTO idempotency_keys (id, key, "userId", "responseStatus", "responseBody", "createdAt", "updatedAt") VALUES (gen_random_uuid(), :key, :userId, :status, :body, NOW(), NOW())',
                    {
                        replacements: {
                            key,
                            userId: req.user.userId,
                            status: res.statusCode,
                            body: JSON.stringify(body)
                        }
                    }
                ).catch(err => console.error('Failed to save idempotency key:', err));
            }
            return originalJson.call(this, body);
        };

        next();
    } catch (error) {
        console.error('Idempotency middleware error:', error);
        next(); // Proceed anyway but log error
    }
}
