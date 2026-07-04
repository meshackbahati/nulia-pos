import crypto from 'crypto';
import axios from 'axios';

export const WEBHOOK_EVENTS = {
    SALE_CREATED: 'sale.created',
    SALE_VOIDED: 'sale.voided',
    PRODUCT_CREATED: 'product.created',
    PRODUCT_UPDATED: 'product.updated',
    INVENTORY_ADJUSTED: 'inventory.adjusted',
    INVENTORY_LOW_STOCK: 'inventory.low_stock',
    RETURN_CREATED: 'return.created',
    RETURN_COMPLETED: 'return.completed',
};

export async function triggerWebhook(event, payload, branchId, io) {
    try {
        const { default: models } = await import('../models/index.js');

        const webhooks = await models.Webhook.findAll({
            where: {
                branchId,
                isActive: true,
                events: { [models.Op.contains]: [event] },
            },
        });

        if (webhooks.length === 0) return;

        const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });

        for (const wh of webhooks) {
            const secret = wh.getDecryptedSecret();
            const signature = secret
                ? crypto.createHmac('sha256', secret).update(body).digest('hex')
                : '';

            let retries = 0;
            const maxRetries = 3;
            let success = false;

            while (retries < maxRetries && !success) {
                try {
                    await axios.post(wh.url, body, {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Webhook-Signature': signature,
                            'X-Webhook-Event': event,
                        },
                        timeout: 10000,
                    });
                    success = true;
                } catch (err) {
                    retries++;
                    if (retries < maxRetries) {
                        await new Promise(r => setTimeout(r, Math.pow(2, retries) * 1000));
                    }
                }
            }

            const updates = { lastTriggeredAt: new Date() };
            if (success) {
                updates.failureCount = 0;
            } else {
                updates.failureCount = (wh.failureCount || 0) + 1;
                if (updates.failureCount >= 10) {
                    updates.isActive = false;
                }
            }
            await models.Webhook.update(updates, { where: { id: wh.id } });

            if (io) {
                io.to(`branch-${branchId}`).emit('webhook-status', {
                    webhookId: wh.id,
                    event,
                    success,
                    failureCount: updates.failureCount,
                });
            }
        }
    } catch (err) {
        console.error('[WebhookService] Error triggering webhooks:', err.message);
    }
}
