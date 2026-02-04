import { Handler } from '@netlify/functions';
import { requireAuth } from '../../middleware/auth';
import models from '../../models';
import MpesaService from '../../lib/mpesa';
import { createAuditLog, AUDIT_ACTIONS, AUDIT_RESOURCES } from '../../lib/audit';
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
        const auth = await requireAuth(event);
        const body = JSON.parse(event.body || '{}');

        const {
            items,
            paymentMethod,
            totalAmount,
            customerPhone,
            customerEmail,
            notes,
        } = body;

        if (!items || items.length === 0) {
            return createResponse(400, { error: 'No items in cart' });
        }

        if (!auth.branchId) {
            return createResponse(400, {
                error: 'User not assigned to a branch'
            });
        }

        // Start transaction
        const sequelize: any = models.sequelize;
        const transaction = await sequelize.transaction();

        try {
            // Fetch branch for currency details
            const branch: any = await models.Branch.findByPk(auth.branchId, { transaction });
            if (!branch) {
                await transaction.rollback();
                return createResponse(400, { error: 'Branch not found' });
            }

            // Check inventory availability
            for (const item of items) {
                const inventory: any = await models.Inventory.findOne({
                    where: {
                        branchId: auth.branchId,
                        productId: item.productId,
                        ...(item.variantId && { variantId: item.variantId }),
                    },
                    transaction,
                });

                if (!inventory || !inventory.canFulfillOrder(item.quantity)) {
                    await transaction.rollback();
                    return createResponse(400, {
                        error: `Insufficient stock for ${item.name}`
                    });
                }
            }

            // Calculate totals
            const subtotal = items.reduce((sum: number, item: any) => sum + item.total, 0);
            const taxAmount = subtotal * 0.1; // 10% tax
            const discountAmount = 0; // No discount for now
            const finalTotal = subtotal + taxAmount - discountAmount;

            // Create sale
            const sale: any = await models.Sale.create({
                branchId: auth.branchId,
                userId: auth.userId,
                subtotal,
                taxAmount,
                discountAmount,
                totalAmount: finalTotal,
                paymentMethod,
                paymentStatus: paymentMethod === 'cash' ? 'completed' : 'pending',
                customerPhone,
                customerEmail,
                notes,
            }, { transaction });

            // Create sale items and update inventory
            for (const item of items) {
                // Create sale item
                await models.SaleItem.create({
                    saleId: sale.id,
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity,
                    unitPrice: item.price,
                    totalPrice: item.total,
                    discountAmount: 0,
                }, { transaction });

                // Update inventory
                await models.Inventory.decrement(
                    'quantity',
                    {
                        by: item.quantity,
                        where: {
                            branchId: auth.branchId,
                            productId: item.productId,
                            ...(item.variantId && { variantId: item.variantId }),
                        },
                        transaction,
                    }
                );
            }


            // Create payment record
            const payment = await models.Payment.create({
                branchId: auth.branchId,
                saleId: sale.id,
                amount: finalTotal,
                currency: branch.currency, // Use branch currency
                method: paymentMethod === 'mpesa' ? 'mpesa_stk' : paymentMethod,
                status: paymentMethod === 'cash' ? 'completed' : 'pending',
                customerPhone,
            }, { transaction });

            let checkoutRequestId = null;

            // Trigger M-Pesa STK Push
            if (paymentMethod === 'mpesa') {
                try {
                    const mpesaService = await MpesaService.getBranchMpesaService(auth.branchId);
                    if (!mpesaService) {
                        throw new Error('M-Pesa credentials not configured for this branch');
                    }

                    // Determine M-Pesa Amount (Must be KES)
                    let mpesaAmount = finalTotal;
                    if (branch.currency !== 'KES') {
                        if (branch.secondaryCurrency === 'KES' && branch.exchangeRate) {
                            mpesaAmount = Math.ceil(finalTotal * branch.exchangeRate);
                        } else {
                            throw new Error(`M-Pesa requires KES currency. Current branch currency: ${branch.currency}`);
                        }
                    } else {
                        mpesaAmount = Math.ceil(mpesaAmount); // Ensure integer for M-Pesa
                    }

                    const stkResponse = await mpesaService.initiateSTKPush({
                        phoneNumber: customerPhone,
                        amount: mpesaAmount,
                        reference: sale.receiptId,
                        description: `Payment for ${sale.receiptId}`
                    });

                    checkoutRequestId = stkResponse.CheckoutRequestID;

                    // Update payment with reference
                    await payment.update({
                        externalReference: checkoutRequestId
                    }, { transaction });

                } catch (mpesaError: any) {
                    console.error('M-Pesa STK Push Error:', mpesaError);
                    // Decide: Fail the whole sale or just return error?
                    // Safe approach: Fail the sale so they can retry or choose another method
                    throw new Error(`M-Pesa Initiation Failed: ${mpesaError.message}`);
                }
            }

            // Create audit log
            await createAuditLog({
                userId: auth.userId,
                branchId: auth.branchId,
                action: AUDIT_ACTIONS.SALE_CREATE,
                resource: AUDIT_RESOURCES.SALE,
                resourceId: sale.id,
                newValues: {
                    receiptId: sale.receiptId,
                    totalAmount: finalTotal,
                    itemCount: items.length,
                    paymentMethod,
                },
                metadata: {
                    customerPhone,
                    customerEmail,
                },
            }, event);

            await transaction.commit();

            return createResponse(201, {
                success: true,
                saleId: sale.id,
                receiptId: sale.receiptId,
                totalAmount: finalTotal,
                checkoutRequestId, // Return this for polling
                paymentId: payment.id
            });

        } catch (error) {
            await transaction.rollback();
            throw error;
        }

    } catch (error) {
        return handleError(error);
    }
};
