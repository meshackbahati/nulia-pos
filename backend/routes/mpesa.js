import express from 'express';
import models from '../models/index.js';
import { authenticate } from '../lib/auth.js';

const router = express.Router();

// Check M-Pesa Transaction Status
router.get('/status', authenticate, async (req, res) => {
    try {
        const { checkoutRequestId } = req.query;
        if (!checkoutRequestId) {
            return res.status(400).json({ error: 'CheckoutRequestID is required' });
        }

        const paymentLog = await models.PaymentLog.findOne({
            where: { externalReference: checkoutRequestId },
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

export default router;
