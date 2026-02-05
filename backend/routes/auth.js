import express from 'express';
import bcrypt from 'bcryptjs';
import models from '../models/index.js';
import { generateToken, authenticate } from '../lib/auth.js';
import { createAuditLog, AUDIT_ACTIONS, AUDIT_RESOURCES } from '../lib/audit.js';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user by email
        const user = await models.User.findOne({
            where: {
                email,
                isActive: true,
            },
            include: [
                {
                    model: models.Branch,
                    as: 'branch',
                    attributes: ['id', 'name', 'currency', 'currencySymbol'],
                },
            ],
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Validate password
        const isValidPassword = await user.validatePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Update last login
        await user.update({ lastLoginAt: new Date() });

        // Create audit log
        await createAuditLog({
            userId: user.id,
            branchId: user.branchId,
            action: AUDIT_ACTIONS.USER_LOGIN,
            resource: AUDIT_RESOURCES.USER,
            resourceId: user.id,
            metadata: {
                loginTime: new Date().toISOString(),
            },
        }, req);

        // Generate token
        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
            branchId: user.branchId,
        });

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                branchId: user.branchId,
                branch: user.branch
            },
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Get current user (me)
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await models.User.findByPk(req.user.userId, {
            attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'branchId', 'isActive'],
            include: [
                {
                    model: models.Branch,
                    as: 'branch',
                    attributes: ['id', 'name', 'currency', 'currencySymbol'],
                },
            ],
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
