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
        if (!auth.branchId) {
            return createResponse(400, { error: 'User not assigned to a branch' });
        }

        const body = JSON.parse(event.body || '{}');
        const { supplierId, items, expectedDeliveryDate, notes } = body;

        if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
            return createResponse(400, { error: 'Missing required fields' });
        }

        const sequelize: any = models.sequelize;
        const transaction = await sequelize.transaction();

        try {
            // Generate Order Number
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const count = await models.PurchaseOrder.count({ transaction });
            const orderNumber = `PO-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;

            let totalAmount = 0;

            const purchaseOrder: any = await models.PurchaseOrder.create({
                branchId: auth.branchId,
                supplierId,
                orderNumber,
                status: 'pending',
                expectedDeliveryDate,
                notes,
                createdBy: auth.userId,
                totalAmount: 0 // Will update later
            }, { transaction });

            for (const item of items) {
                const { productId, variantId, quantity, unitCost } = item;
                const qty = parseInt(quantity);
                const cost = parseFloat(unitCost);
                const lineTotal = qty * cost;
                totalAmount += lineTotal;

                await models.PurchaseOrderItem.create({
                    purchaseOrderId: purchaseOrder.id,
                    productId,
                    variantId: variantId || null,
                    quantity: qty,
                    unitCost: cost,
                    totalCost: lineTotal
                }, { transaction });
            }

            await purchaseOrder.update({ totalAmount }, { transaction });

            await transaction.commit();

            // Re-fetch with items and supplier
            const createdPO = await models.PurchaseOrder.findByPk(purchaseOrder.id, {
                include: [
                    { model: models.Supplier, as: 'supplier' }
                ]
            });

            return createResponse(201, { success: true, purchaseOrder: createdPO });

        } catch (error) {
            await transaction.rollback();
            throw error;
        }

    } catch (error) {
        return handleError(error);
    }
};
