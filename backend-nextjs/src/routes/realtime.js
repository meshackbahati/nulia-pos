import { Router } from 'express';
import models from '../models/index.js';
import { authenticate } from '../lib/auth.js';

const router = Router();

/**
 * @swagger
 * /api/realtime/events:
 *   get:
 *     summary: Fetch realtime events since a cursor (serverless polling fallback for socket.io)
 *     tags: [Realtime]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: since
 *         schema: { type: integer }
 *         description: Only return events with id greater than this cursor
 *     responses:
 *       200:
 *         description: List of events and the new cursor
 *       401:
 *         description: Authentication required
 */
router.get('/events', authenticate, async (req, res) => {
    try {
        const since = parseInt(req.query.since, 10);
        const cursor = Number.isInteger(since) && since > 0 ? since : 0;

        const isAdmin = req.user.role === 'admin';
        const where = { id: { [models.Sequelize.Op.gt]: cursor } };

        if (!isAdmin && req.user.branchId) {
            where[models.Sequelize.Op.or] = [
                { branchId: null },
                { branchId: req.user.branchId },
            ];
        }

        const [events, lastEvent] = await Promise.all([
            models.RealtimeEvent.findAll({
                where,
                order: [['id', 'ASC']],
                limit: 100,
                attributes: ['id', 'type', 'branchId', 'payload', 'createdAt'],
            }),
            models.RealtimeEvent.findOne({
                order: [['id', 'DESC']],
                attributes: ['id'],
            }),
        ]);

        res.json({
            events: events.map((e) => ({
                id: e.id,
                type: e.type,
                branchId: e.branchId,
                payload: e.payload,
                createdAt: e.createdAt,
            })),
            lastId: lastEvent ? lastEvent.id : 0,
        });
    } catch (error) {
        console.error('[realtime] Error fetching events:', error.message);
        res.status(500).json({ error: error.message });
    }
});

export default router;
