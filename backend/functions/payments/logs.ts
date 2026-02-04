import { Handler } from '@netlify/functions';
import { requireAuth } from '../../middleware/auth';
import models from '../../models';
import { Op } from 'sequelize';
import { createResponse, handleCORS, handleError } from '../../types';

export const handler: Handler = async (event, context) => {
    const corsResponse = handleCORS(event);
    if (corsResponse) return corsResponse;

    try {
        const auth = await requireAuth(event, 'manager');

        // GET - List payment logs
        if (event.httpMethod === 'GET') {
            const params = event.queryStringParameters || {};
            const {
                status,
                transactionType,
                startDate,
                endDate,
                customerPhone,
                page = '1',
                limit = '50',
            } = params;

            // Build where clause
            const where: any = {};

            // Branch filtering
            if (auth.role !== 'admin') {
                where.branchId = auth.branchId;
            } else if (params.branchId) {
                where.branchId = params.branchId;
            }

            // Filters
            if (status) where.status = status;
            if (transactionType) where.transactionType = transactionType;
            if (customerPhone) where.customerPhone = { [Op.like]: `%${customerPhone}%` };

            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate) where.createdAt[Op.gte] = new Date(startDate);
                if (endDate) where.createdAt[Op.lte] = new Date(endDate);
            }

            // Pagination
            const offset = (parseInt(page) - 1) * parseInt(limit);

            const { rows: logs, count } = await models.PaymentLog.findAndCountAll({
                where,
                include: [
                    {
                        model: models.Sale,
                        as: 'sale',
                        attributes: ['id', 'receiptId', 'totalAmount'],
                    },
                    {
                        model: models.User,
                        as: 'verifier',
                        attributes: ['id', 'firstName', 'lastName'],
                    },
                ],
                order: [['createdAt', 'DESC']],
                limit: parseInt(limit),
                offset,
            });

            return createResponse(200, {
                logs,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(count / parseInt(limit)),
                },
            });
        }

        // POST - Verify offline payment
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const { paymentLogId, status, notes } = body;

            if (!paymentLogId || !status) {
                return createResponse(400, {
                    error: 'Payment log ID and status are required'
                });
            }

            const paymentLog = await models.PaymentLog.findByPk(paymentLogId);

            if (!paymentLog) {
                return createResponse(404, { error: 'Payment log not found' });
            }

            // Check authorization
            if (auth.role !== 'admin' && paymentLog.branchId !== auth.branchId) {
                return createResponse(403, {
                    error: 'You can only verify payments for your branch'
                });
            }

            // Update payment log
            paymentLog.status = status;
            paymentLog.verifiedBy = auth.userId;
            paymentLog.verifiedAt = new Date();
            paymentLog.verificationNotes = notes || null;
            await paymentLog.save();

            // Update related payment if exists
            if (paymentLog.paymentId) {
                const payment = await models.Payment.findByPk(paymentLog.paymentId);
                if (payment) {
                    payment.status = status;
                    await payment.save();
                }
            }

            // Update sale status if payment is verified
            if (status === 'verified' && paymentLog.saleId) {
                const sale = await models.Sale.findByPk(paymentLog.saleId);
                if (sale) {
                    sale.paymentStatus = 'completed';
                    await sale.save();
                }
            }

            return createResponse(200, {
                success: true,
                message: 'Payment verified successfully',
                paymentLog,
            });
        }

        return createResponse(405, { error: 'Method not allowed' });

    } catch (error) {
        return handleError(error);
    }
};
