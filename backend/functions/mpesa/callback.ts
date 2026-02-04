import { Handler } from '@netlify/functions';
import models from '../../models';

export const handler: Handler = async (event) => {
    // Log the incoming callback for debugging
    console.log('M-Pesa Callback:', JSON.stringify(event.body));

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { Body } = body;

        if (!Body || !Body.stkCallback) {
            console.error('Invalid M-Pesa callback format');
            return { statusCode: 400, body: 'Invalid format' };
        }

        const {
            MerchantRequestID,
            CheckoutRequestID,
            ResultCode,
            ResultDesc,
            CallbackMetadata
        } = Body.stkCallback;

        // Find the payment
        const payment = await models.Payment.findOne({
            where: {
                // We stored CheckoutRequestID as externalReference or reference
                // Ideally externalReference
                externalReference: CheckoutRequestID
            },
            include: [{ model: models.Sale, as: 'sale' }]
        });

        if (!payment) {
            console.error(`Payment not found for CheckoutRequestID: ${CheckoutRequestID}`);
            return { statusCode: 404, body: 'Payment not found' };
        }

        // Determine status
        if (ResultCode === 0) {
            // Success
            let mpesaReceiptNumber = '';

            // Extract Receipt Number from Metadata
            if (CallbackMetadata && CallbackMetadata.Item) {
                const receiptItem = CallbackMetadata.Item.find((item: any) => item.Name === 'MpesaReceiptNumber');
                if (receiptItem) {
                    mpesaReceiptNumber = receiptItem.Value;
                }
            }

            // Update Payment
            await payment.update({
                status: 'completed',
                mpesaReceiptNumber,
                processedAt: new Date(),
                metadata: { ...payment.metadata, callback: Body.stkCallback }
            });

            // Update Sale if linked
            if (payment.sale) {
                await payment.sale.update({
                    paymentStatus: 'completed'
                });
            }

        } else {
            // Failed/Cancelled
            await payment.update({
                status: 'failed',
                failureReason: ResultDesc,
                metadata: { ...payment.metadata, callback: Body.stkCallback }
            });

            // Update Sale if linked
            if (payment.sale) {
                // If this was the only payment, maybe fail the sale or keep it pending?
                // Usually keep pending so they can retry with another method, but for now mark failed if strictly M-Pesa.
                // Actually, keep 'pending' allows retry. 'failed' might lock it.
                // Let's keep sale 'pending' but log? Or 'failed'? 
                // If the payment failed, the sale isn't paid.
                // Let's leave sale as pending, but frontend will see payment failed.

                // However, user might want to know it failed.
                // Let's set to 'failed' for now.
                await payment.sale.update({
                    paymentStatus: 'failed',
                    notes: `M-Pesa Failed: ${ResultDesc}`
                });
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true }),
        };

    } catch (error) {
        console.error('Error processing M-Pesa callback:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server error' }),
        };
    }
};
