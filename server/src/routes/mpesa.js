import express from 'express';
import models from '../models/index.js';
import { authenticate } from '../lib/auth.js';
import MpesaService from '../lib/mpesa.js';

const router = express.Router();

// Initiate STK Push
router.post('/stkpush', authenticate, async (req, res) => {
    try {
        const { paymentId, phoneNumber } = req.body;
        const { branchId } = req.user;

        if (!paymentId || !phoneNumber) {
            return res.status(400).json({ error: 'PaymentID and PhoneNumber are required' });
        }

        const payment = await models.Payment.findByPk(paymentId, {
            include: [{ model: models.Sale, as: 'sale' }]
        });

        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        if (payment.branchId !== branchId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized branch access' });
        }

        const mpesaService = await MpesaService.getBranchMpesaService(payment.branchId);
        if (!mpesaService) {
            return res.status(500).json({ error: 'M-Pesa service not configured for this branch' });
        }

        const result = await mpesaService.initiateSTKPush({
            amount: payment.amount,
            phoneNumber,
            reference: payment.sale?.receiptId || payment.id.substring(0, 10),
            description: `Payment for Sale ${payment.sale?.receiptId || payment.id.substring(0, 10)}`
        });

        // Update payment with CheckoutRequestID
        await payment.update({
            externalReference: result.CheckoutRequestID,
            status: 'pending'
        });

        // Log the initiation
        await models.PaymentLog.create({
            paymentId: payment.id,
            branchId: payment.branchId,
            externalReference: result.CheckoutRequestID,
            type: 'stk_push_initiation',
            status: 'PENDING',
            message: 'STK Push initiated successfully',
            rawResponse: result
        });

        res.json({
            success: true,
            checkoutRequestId: result.CheckoutRequestID,
            message: 'STK Push initiated'
        });
    } catch (error) {
        console.error('STK Push initiation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Check M-Pesa Transaction Status
router.get('/status', authenticate, async (req, res) => {
    try {
        const { checkoutRequestId } = req.query;
        if (!checkoutRequestId) {
            return res.status(400).json({ error: 'CheckoutRequestID is required' });
        }

        const { branchId, role } = req.user;
        const where = { externalReference: checkoutRequestId };
        if (role !== 'admin') {
            where.branchId = branchId;
        }

        const paymentLog = await models.PaymentLog.findOne({
            where,
            order: [['createdAt', 'DESC']]
        });

        if (!paymentLog) {
            return res.json({ status: 'PENDING', message: 'Transaction not found in logs' });
        }

        res.json({
            status: paymentLog.status,
            message: paymentLog.message,
            details: paymentLog.rawResponse
        });
    } catch (error) {
        console.error('M-Pesa status check error:', error);
        res.status(500).json({ error: error.message });
    }
});

// M-Pesa Callback (Webhook from Safaricom)
router.post('/callback', async (req, res) => {
    try {
        const callbackData = req.body.Body.stkCallback;
        const checkoutRequestId = callbackData.CheckoutRequestID;
        const resultCode = callbackData.ResultCode;

        console.log(`M-Pesa Callback received for ${checkoutRequestId}: Result ${resultCode}`);

        // Find the payment associated with this checkout
        const payment = await models.Payment.findOne({
            where: { externalReference: checkoutRequestId }
        });

        if (payment) {
            if (resultCode === 0) {
                // Success
                await payment.update({
                    status: 'completed',
                    paidAt: new Date()
                });
            } else {
                // Failed
                await payment.update({ status: 'failed' });
            }
        }

        // Always log the result
        await models.PaymentLog.create({
            paymentId: payment ? payment.id : null,
            branchId: payment ? payment.branchId : null,
            externalReference: checkoutRequestId,
            type: 'callback',
            status: resultCode === 0 ? 'SUCCESS' : 'FAILED',
            message: callbackData.ResultDesc,
            rawResponse: callbackData
        });

        // Safaricom expects a success response
        res.json({ ResultCode: 0, ResultDesc: 'Success' });
    } catch (error) {
        console.error('M-Pesa callback processing error:', error);
        res.status(500).json({ ResultCode: 1, ResultDesc: 'Internal Server Error' });
    }
});

// M-Pesa Callback (Branch-specific)
router.post('/callback/:branchId', async (req, res) => {
    try {
        const { branchId } = req.params;
        const callbackData = req.body.Body.stkCallback;
        const checkoutRequestId = callbackData.CheckoutRequestID;
        const resultCode = callbackData.ResultCode;

        console.log(`M-Pesa Callback for Branch ${branchId} received for ${checkoutRequestId}: Result ${resultCode}`);

        // Find the payment associated with this checkout and branch
        const payment = await models.Payment.findOne({
            where: {
                externalReference: checkoutRequestId,
                branchId: branchId
            }
        });

        if (payment) {
            if (resultCode === 0) {
                // Success
                await payment.update({
                    status: 'completed',
                    paidAt: new Date()
                });
            } else {
                // Failed
                await payment.update({ status: 'failed' });
            }
        }

        // Always log the result
        await models.PaymentLog.create({
            paymentId: payment ? payment.id : null,
            branchId: branchId,
            externalReference: checkoutRequestId,
            type: 'callback',
            status: resultCode === 0 ? 'SUCCESS' : 'FAILED',
            message: callbackData.ResultDesc,
            rawResponse: callbackData
        });

        res.json({ ResultCode: 0, ResultDesc: 'Success' });
    } catch (error) {
        console.error('M-Pesa branch callback processing error:', error);
        res.status(500).json({ ResultCode: 1, ResultDesc: 'Internal Server Error' });
    }
});

export default router;
