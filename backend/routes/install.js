import express from 'express';
import models, { sequelize } from '../models/index.js';

const router = express.Router();

// Check if system needs setup
router.get('/check', async (req, res) => {
    try {
        // Check if any users exist
        const userCount = await models.User.count();

        // Check if any branches exist
        const branchCount = await models.Branch.count();

        const needsSetup = userCount === 0 || branchCount === 0;

        res.json({
            needsSetup,
            database: 'connected',
            stats: {
                users: userCount,
                branches: branchCount
            }
        });
    } catch (error) {
        console.error('Install check error:', error);
        // If table doesn't exist yet, it definitely needs setup (or migrations)
        res.json({ needsSetup: true, error: error.message });
    }
});

// Setup initial installation (create first branch and admin)
router.post('/setup', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { branch, admin } = req.body;

        if (!branch || !admin) {
            return res.status(400).json({ error: 'Branch and Admin data required' });
        }

        // Check if already installed
        const userCount = await models.User.count();
        if (userCount > 0) {
            return res.status(400).json({ error: 'System already initialized' });
        }

        // Create branch with defaults for mandatory fields not collected in setup form
        const newBranch = await models.Branch.create({
            ...branch,
            address: branch.address || 'Default Headquarters',
            phone: branch.phone || '0000000000',
            email: branch.email || admin.email
        }, { transaction: t });

        // Create admin user
        const newAdmin = await models.User.create({
            ...admin,
            branchId: newBranch.id,
            role: 'admin',
            isActive: true
        }, { transaction: t });

        await t.commit();

        res.json({
            success: true,
            message: 'System successfully initialized',
            branch: newBranch,
            admin: {
                id: newAdmin.id,
                email: newAdmin.email,
                firstName: newAdmin.firstName,
                lastName: newAdmin.lastName
            }
        });
    } catch (error) {
        await t.rollback();
        console.error('Setup error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
