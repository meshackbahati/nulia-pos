import { Handler } from '@netlify/functions';
import { requireAuth } from '../../middleware/auth';
import models from '../../models';
import { createAuditLog, AUDIT_ACTIONS, AUDIT_RESOURCES } from '../../lib/audit';
import { createResponse, handleCORS, handleError } from '../../types';

export const handler: Handler = async (event, context) => {
    // Handle CORS
    const corsResponse = handleCORS(event);
    if (corsResponse) return corsResponse;

    if (event.httpMethod !== 'POST') {
        return createResponse(405, { error: 'Method not allowed' });
    }

    try {
        const auth = await requireAuth(event);
        const body = JSON.parse(event.body || '{}');
        const { items, reason } = body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return createResponse(400, { error: 'Invalid items list' });
        }

        // Determine target branch
        let targetBranchId = auth.branchId;
        if (auth.role === 'admin') {
            if (body.branchId) {
                targetBranchId = body.branchId;
            } else if (!targetBranchId) {
                return createResponse(400, { error: 'Branch ID required for admin without default branch' });
            }
        } else if (auth.role === 'manager') {
            // Manager can only restock their own branch
            if (body.branchId && body.branchId !== auth.branchId) {
                return createResponse(403, { error: 'Unauthorized to restock other branches' });
            }
        } else {
            return createResponse(403, { error: 'Insufficient permissions' });
        }

        const sequelize: any = models.sequelize;
        const transaction = await sequelize.transaction();

        try {
            const results = [];

            for (const item of items) {
                const { productId, variantId, quantity } = item;
                const qty = parseInt(quantity);

                if (!productId || isNaN(qty) || qty <= 0) {
                    throw new Error(`Invalid item data for product ${productId}`);
                }

                // specific logic: Find existing inventory or create?
                // Usually inventory rows exist if product is assigned to branch. 
                // If not, we create it.

                let inventory: any = await models.Inventory.findOne({
                    where: {
                        branchId: targetBranchId,
                        productId,
                        ...(variantId ? { variantId } : { variantId: null }) // Ensure explicit null for no variant
                    },
                    transaction
                });

                let oldQty = 0;

                if (!inventory) {
                    // Create new inventory record
                    inventory = await models.Inventory.create({
                        branchId: targetBranchId,
                        productId,
                        variantId: variantId || null,
                        quantity: qty,
                        minStockLevel: 10, // Defaults
                        maxStockLevel: 1000,
                        lastRestockedAt: new Date()
                    }, { transaction });
                } else {
                    oldQty = inventory.quantity;
                    // Increment
                    await inventory.increment('quantity', { by: qty, transaction });
                    await inventory.update({ lastRestockedAt: new Date() }, { transaction });
                    // Reload to get new value
                    await inventory.reload({ transaction });
                }

                results.push({
                    productId,
                    variantId,
                    added: qty,
                    newTotal: inventory.quantity
                });

                // Audit Log
                await createAuditLog({
                    userId: auth.userId,
                    branchId: targetBranchId,
                    action: AUDIT_ACTIONS.INVENTORY_RESTOCK,
                    resource: AUDIT_RESOURCES.INVENTORY,
                    resourceId: inventory.id,
                    oldValues: { quantity: oldQty },
                    newValues: { quantity: inventory.quantity, added: qty },
                    metadata: { reason, variantId }
                }, event); // Passing event for IP logging
            }

            await transaction.commit();

            return createResponse(200, {
                success: true,
                message: 'Restocking completed successfully',
                updates: results
            });

        } catch (error) {
            await transaction.rollback();
            throw error;
        }

    } catch (error) {
        return handleError(error);
    }
};
