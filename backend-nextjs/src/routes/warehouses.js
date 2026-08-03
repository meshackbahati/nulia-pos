import express from 'express';
import models from '../models/index.js';
import { authenticate, authorize } from '../lib/auth.js';

const router = express.Router();

/**
 * @openapi
 * /api/warehouses:
 *   get:
 *     tags: [Warehouses]
 *     summary: List warehouses for a branch
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const branchId = req.query.branchId || req.user.branchId;
        const warehouses = await models.Warehouse.findAll({
            where: { branchId },
            include: [{ model: models.WarehouseZone, as: 'zones' }],
            order: [['name', 'ASC']],
        });
        res.json({ warehouses });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/warehouses:
 *   post:
 *     tags: [Warehouses]
 *     summary: Create a warehouse
 */
router.post('/', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { name, location } = req.body;
        const branchId = req.body.branchId || req.user.branchId;
        if (!name) return res.status(400).json({ error: 'name is required' });

        const warehouse = await models.Warehouse.create({ branchId, name, location });
        res.status(201).json({ warehouse });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/warehouses/{id}:
 *   put:
 *     tags: [Warehouses]
 *     summary: Update a warehouse
 */
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const warehouse = await models.Warehouse.findByPk(req.params.id);
        if (!warehouse) return res.status(404).json({ error: 'Warehouse not found' });

        if (req.body.name) warehouse.name = req.body.name;
        if (req.body.location) warehouse.location = req.body.location;
        if (req.body.isActive !== undefined) warehouse.isActive = req.body.isActive;
        await warehouse.save();

        res.json({ warehouse });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/warehouses/zones:
 *   post:
 *     tags: [Warehouses]
 *     summary: Create a zone in a warehouse
 */
router.post('/zones', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { warehouseId, name, code } = req.body;
        if (!warehouseId || !name) return res.status(400).json({ error: 'warehouseId and name are required' });

        const zone = await models.WarehouseZone.create({ warehouseId, name, code });
        res.status(201).json({ zone });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/warehouses/zones/{id}:
 *   put:
 *     tags: [Warehouses]
 *     summary: Update a warehouse zone
 */
router.put('/zones/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const zone = await models.WarehouseZone.findByPk(req.params.id);
        if (!zone) return res.status(404).json({ error: 'Zone not found' });

        if (req.body.name) zone.name = req.body.name;
        if (req.body.code !== undefined) zone.code = req.body.code;
        await zone.save();

        res.json({ zone });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/warehouses/zones/{id}:
 *   delete:
 *     tags: [Warehouses]
 *     summary: Delete a warehouse zone
 */
router.delete('/zones/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const zone = await models.WarehouseZone.findByPk(req.params.id);
        if (!zone) return res.status(404).json({ error: 'Zone not found' });
        await zone.destroy();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/warehouses/{id}:
 *   delete:
 *     tags: [Warehouses]
 *     summary: Delete a warehouse
 */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const warehouse = await models.Warehouse.findByPk(req.params.id);
        if (!warehouse) return res.status(404).json({ error: 'Warehouse not found' });
        await warehouse.destroy();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/warehouses/inventory:
 *   get:
 *     tags: [Warehouses]
 *     summary: Get inventory with warehouse/zone info
 */
router.get('/inventory', authenticate, async (req, res) => {
    try {
        const branchId = req.query.branchId || req.user.branchId;
        const inventory = await models.Inventory.findAll({
            where: { branchId },
            include: [
                { model: models.Product, as: 'product', attributes: ['id', 'name', 'sku'] },
            ],
        });

        // Group by warehouse if warehouseId is set
        const warehouses = await models.Warehouse.findAll({
            where: { branchId },
            include: [{ model: models.WarehouseZone, as: 'zones' }],
        });

        const withLocation = inventory.map(inv => {
            const wh = warehouses.find(w =>
                inv.warehouseId && w.id === inv.warehouseId
            );
            return {
                ...inv.toJSON(),
                warehouse: wh || null,
                zone: wh?.zones?.find(z => z.id === inv.zoneId) || null,
            };
        });

        res.json({ inventory: withLocation, warehouses });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
