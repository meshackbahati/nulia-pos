import express from 'express';
import models from '../models/index.js';
import { authenticate } from '../lib/auth.js';

const router = express.Router();

/**
 * Get Paystack public key for the current branch or global fallback
 */
router.get('/config', authenticate, async (req, res) => {
    try {
        const { branchId } = req.user;
        let publicKey = null;

        // 1. Check branch-specific configuration
        if (branchId) {
            const branch = await models.Branch.findByPk(branchId);
            if (branch && branch.paystackPublicKey) {
                publicKey = branch.paystackPublicKey;
            }
        }

        // 2. Fallback to global configuration
        if (!publicKey) {
            const globalPublicKey = await models.Setting.findOne({
                where: { category: 'paystack', key: 'publicKey' }
            });
            if (globalPublicKey) {
                publicKey = globalPublicKey.value;
            }
        }

        // 3. Fallback to env if all else fails
        if (!publicKey) {
            publicKey = process.env.VITE_PAYSTACK_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC_KEY;
        }

        res.json({ publicKey });
    } catch (error) {
        console.error('Error fetching Paystack config:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Paystack Webhook Handler
 */
router.post('/webhook', async (req, res) => {
    // Note: In a production environment, you should verify the Paystack signature
    // using the secret key.
    try {
        const event = req.body;
        console.log('Paystack Webhook received:', event.event);

        if (event.event === 'charge.success') {
            const { reference } = event.data;
            const payment = await models.Payment.findOne({
                where: { externalReference: reference }
            });

            if (payment) {
                await payment.update({
                    status: 'completed',
                    paidAt: new Date()
                });

                await models.PaymentLog.create({
                    paymentId: payment.id,
                    branchId: payment.branchId,
                    externalReference: reference,
                    type: 'paystack_webhook',
                    status: 'SUCCESS',
                    message: 'Payment verified via webhook',
                    rawResponse: event
                });
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Paystack webhook error:', error);
        res.sendStatus(500);
    }
});

export default router;
