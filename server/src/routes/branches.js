import express from 'express';
import models from '../models/index.js';
import { authenticate, authorize } from '../lib/auth.js';

const router = express.Router();

// List all branches
router.get('/list', authenticate, async (req, res) => {
    try {
        const { includeInactive } = req.query;
        const where = {};

        if (includeInactive !== 'true') {
            where.isActive = true;
        }

        // Non-admins only see branches they belong to or manage
        if (req.user.role !== 'admin') {
            where[models.Sequelize.Op.or] = [
                { id: req.user.branchId },
                { managedBy: req.user.userId }
            ];
            // Non-admins can NEVER see inactive branches
            where.isActive = true;
        }

        const branches = await models.Branch.findAll({
            where,
            order: [['name', 'ASC']]
        });
        res.json({ branches });
    } catch (error) {
        console.error('List branches error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get current user's branch
router.get('/me', authenticate, async (req, res) => {
    try {
        // SMART BRANCH DETECTION:
        // 1. Try query param (favored by POS terminal)
        // 2. Try custom header
        // 3. Fallback to user's assigned branchId from profile
        const branchId = req.query.branchId || req.headers['x-branch-id'] || req.user.branchId;

        if (!branchId) {
            console.log(`[BRANCH] No branchId found in request or profile for user ${req.user.userId}`);
            return res.status(404).json({ error: 'Branch Context Not Found. Please specify a branchId.' });
        }

        const branch = await models.Branch.findByPk(branchId);
        if (!branch) {
            console.log(`[BRANCH] Branch ${branchId} not found in DB`);
            return res.status(404).json({ error: 'Branch not found' });
        }

        // Security check: If not admin, verify they belong to this branch
        if (req.user.role !== 'admin' && req.user.branchId !== branchId) {
            // Check managed branches for managers
            const isManagerOfThis = branch.managedBy === req.user.userId;
            if (!isManagerOfThis) {
                console.log(`[BRANCH] Access Denied: User ${req.user.userId} attempting to access branch ${branchId}`);
                return res.status(403).json({ error: 'Access denied for this branch' });
            }
        }

        res.json({ branch });
    } catch (error) {
        console.error('Get branch/me error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create new branch
router.post('/create', authenticate, authorize('manager'), async (req, res) => {
    try {
        const branchData = {
            ...req.body,
            managedBy: req.user.userId // Track who created it
        };
        const branch = await models.Branch.create(branchData);
        res.json({ success: true, branch });
    } catch (error) {
        console.error('Create branch error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update branch
router.post('/update', authenticate, authorize('manager', true), async (req, res) => {
    try {
        const { id, ...updateData } = req.body;
        const branch = await models.Branch.findByPk(id);

        if (!branch) {
            return res.status(404).json({ error: 'Branch not found' });
        }

        // Additional security check for non-admins (already mostly handled by middleware 'checkBranch')
        if (req.user.role !== 'admin' && branch.managedBy !== req.user.userId && branch.id !== req.user.branchId) {
            return res.status(403).json({ error: 'Unauthorized to update this branch' });
        }

        // Handle per-branch payment credentials — only overwrite if non-empty (encrypted fields never prefilled)
        if (updateData.mpesaConsumerKey) branch.mpesaConsumerKey = updateData.mpesaConsumerKey;
        if (updateData.mpesaConsumerSecret) branch.mpesaConsumerSecret = updateData.mpesaConsumerSecret;
        if (updateData.mpesaPasskey) branch.mpesaPasskey = updateData.mpesaPasskey;
        if (updateData.mpesaShortcode) branch.mpesaShortcode = updateData.mpesaShortcode;
        if (updateData.paystackPublicKey) branch.paystackPublicKey = updateData.paystackPublicKey;
        if (updateData.paystackSecretKey) branch.paystackSecretKey = updateData.paystackSecretKey;
        // preferredGateway / gatewayEnabled can be empty/none — allow explicit set
        if (updateData.preferredGateway !== undefined) branch.preferredGateway = updateData.preferredGateway;
        if (updateData.gatewayEnabled !== undefined) branch.gatewayEnabled = updateData.gatewayEnabled;

        // Remove payment fields from updateData to prevent double-assignment / empty overwrite
        delete updateData.mpesaConsumerKey;
        delete updateData.mpesaConsumerSecret;
        delete updateData.mpesaPasskey;
        delete updateData.mpesaShortcode;
        delete updateData.paystackPublicKey;
        delete updateData.paystackSecretKey;
        delete updateData.preferredGateway;
        delete updateData.gatewayEnabled;

        await branch.update(updateData);
        res.json({ success: true, branch });
    } catch (error) {
        console.error('Update branch error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
