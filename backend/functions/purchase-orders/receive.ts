import { Handler } from '@netlify/functions';
import { requireAuth } from '../../middleware/auth';
import models, { sequelize } from '../../models';
import { createResponse, handleCORS, handleError } from '../../types';

export const handler: Handler = async (event, context) => {
    const cors = handleCORS(event);
    if (cors) return cors;

    if (event.httpMethod !== 'POST') {
        return createResponse(405, { error: 'Method not allowed' });
    }

    try {
        const auth = await requireAuth(event);
        const body = JSON.parse(event.body || '{}');
        const { purchaseOrderId } = body;

        if (!purchaseOrderId) return createResponse(400, { error: 'Purchase Order ID required' });

        // Use imported sequelize instance
        const transaction = await sequelize.transaction();

        try {
            // Fetch PO
            const purchaseOrder: any = await models.PurchaseOrder.findByPk(purchaseOrderId, {
                include: [{ model: models.PurchaseOrderItem, as: 'items' }],
                transaction
            });

            if (!purchaseOrder) {
                await transaction.rollback();
                return createResponse(404, { error: 'Purchase Order not found' });
            }

            if (purchaseOrder.status === 'received' || purchaseOrder.status === 'cancelled') {
                await transaction.rollback();
                return createResponse(400, { error: `Purchase Order is already ${purchaseOrder.status}` });
            }

            // Check branch permission
            if (purchaseOrder.branchId !== auth.branchId && auth.role !== 'admin') {
                await transaction.rollback();
                return createResponse(403, { error: 'Unauthorized' });
            }

            // Update items inventory
            const items = purchaseOrder.items;
            for (const item of items) {
                // Find or Create Inventory
                let inventory: any = await models.Inventory.findOne({
                    where: {
                        branchId: purchaseOrder.branchId,
                        productId: item.productId,
                        ...(item.variantId ? { variantId: item.variantId } : { variantId: null })
                    },
                    transaction
                });

                if (inventory) {
                    await inventory.increment('quantity', { by: item.quantity, transaction });
                    await inventory.update({ lastRestockedAt: new Date() }, { transaction });
                } else {
                    await models.Inventory.create({
                        branchId: purchaseOrder.branchId,
                        productId: item.productId,
                        variantId: item.variantId || null,
                        quantity: item.quantity,
                        minStockLevel: 10,
                        maxStockLevel: 1000,
                        lastRestockedAt: new Date()
                    }, { transaction });
                }
            }

            // Update PO status
            await purchaseOrder.update({ status: 'received' }, { transaction });

            await transaction.commit();
            return createResponse(200, { success: true, message: 'Purchase Order received' });

        } catch (err) {
            await transaction.rollback();
            throw err;
        }

    } catch (err) {
        return handleError(err);
    }
};
