import express from 'express';
import models, { sequelize } from '../models/index.js';
import { authenticate, authorize } from '../lib/auth.js';
import { createAuditLog, AUDIT_ACTIONS, AUDIT_RESOURCES } from '../lib/audit.js';
import { triggerWebhook, WEBHOOK_EVENTS } from '../services/webhookService.js';

const router = express.Router();

/**
 * @openapi
 * /api/webhooks:
 *   get:
 *     tags: [Webhooks]
 *     summary: List all webhooks for current branch
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Webhook list
 */
router.get('/', authenticate, authorize('manager'), async (req, res) => {
    try {
        const branchId = req.query.branchId || req.user.branchId;
        const webhooks = await models.Webhook.findAll({
            where: { branchId },
            include: [{ model: models.User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] }],
            order: [['createdAt', 'DESC']],
        });
        res.json({ webhooks });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/webhooks:
 *   post:
 *     tags: [Webhooks]
 *     summary: Create a webhook
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               url: { type: string }
 *               events: { type: array, items: { type: string } }
 *               secret: { type: string }
 *     responses:
 *       201:
 *         description: Webhook created
 */
router.post('/', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { name, url, events, secret } = req.body;
        const branchId = req.body.branchId || req.user.branchId;

        if (!name || !url || !events || !Array.isArray(events) || events.length === 0) {
            return res.status(400).json({ error: 'name, url, and events are required' });
        }

        const webhook = await models.Webhook.create({
            name, url, events, secret: secret || null,
            branchId,
            createdBy: req.user.userId,
        });

        await createAuditLog({
            action: AUDIT_ACTIONS.CONFIG_UPDATE,
            resource: AUDIT_RESOURCES.SYSTEM,
            resourceId: webhook.id,
            userId: req.user.userId,
            branchId,
            newValues: { name, url, events, action: 'webhook_created' },
        }, req);

        res.status(201).json({ webhook });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/webhooks/{id}:
 *   put:
 *     tags: [Webhooks]
 *     summary: Update a webhook
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Webhook updated
 */
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const webhook = await models.Webhook.findByPk(req.params.id);
        if (!webhook) return res.status(404).json({ error: 'Webhook not found' });

        const { name, url, events, secret, isActive } = req.body;
        if (name) webhook.name = name;
        if (url) webhook.url = url;
        if (events) webhook.events = events;
        if (secret !== undefined) webhook.secret = secret;
        if (isActive !== undefined) webhook.isActive = isActive;

        await webhook.save();

        await createAuditLog({
            action: AUDIT_ACTIONS.CONFIG_UPDATE,
            resource: AUDIT_RESOURCES.SYSTEM,
            resourceId: webhook.id,
            userId: req.user.userId,
            branchId: webhook.branchId,
            newValues: { name, url, events, action: 'webhook_updated' },
        }, req);

        res.json({ webhook });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/webhooks/{id}:
 *   delete:
 *     tags: [Webhooks]
 *     summary: Delete a webhook
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Webhook deleted
 */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const webhook = await models.Webhook.findByPk(req.params.id);
        if (!webhook) return res.status(404).json({ error: 'Webhook not found' });

        await webhook.destroy();

        await createAuditLog({
            action: AUDIT_ACTIONS.CONFIG_UPDATE,
            resource: AUDIT_RESOURCES.SYSTEM,
            resourceId: webhook.id,
            userId: req.user.userId,
            branchId: webhook.branchId,
            newValues: { action: 'webhook_deleted' },
        }, req);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/webhooks/{id}/test:
 *   post:
 *     tags: [Webhooks]
 *     summary: Send a test payload to a webhook
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test sent
 */
router.post('/:id/test', authenticate, authorize('admin'), async (req, res) => {
    try {
        const webhook = await models.Webhook.findByPk(req.params.id);
        if (!webhook) return res.status(404).json({ error: 'Webhook not found' });

        const io = req.app.get('io');
        await triggerWebhook('test.event', { message: 'This is a test webhook payload from BorderShop' }, webhook.branchId, io);

        res.json({ success: true, message: 'Test webhook triggered' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export { WEBHOOK_EVENTS };
export default router;
