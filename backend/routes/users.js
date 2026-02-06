import express from 'express';
import models from '../models/index.js';
import { authenticate, authorize } from '../lib/auth.js';

const router = express.Router();

// List users
router.get('/list', authenticate, async (req, res) => {
    try {
        const { branchId, includeInactive } = req.query;
        const where = includeInactive === 'true' ? {} : { isActive: true };

        if (req.user.role === 'manager' || req.user.role === 'head_of_sales') {
            // Managers and Head of Sales can see users in their branch OR users they created
            where[models.Sequelize.Op.or] = [
                { branchId: req.user.branchId },
                { createdBy: req.user.userId }
            ];
            // If they filter by branch, it must be their own or one they manage
            if (branchId) {
                const branch = await models.Branch.findByPk(branchId);
                if (branch && branch.managedBy === req.user.userId) {
                    where.branchId = branchId;
                } else if (branchId !== req.user.branchId) {
                    return res.status(403).json({ error: 'Unauthorized to view this branch staff' });
                }
            }
        } else if (branchId) {
            where.branchId = branchId;
        }

        const users = await models.User.findAll({
            where,
            attributes: { exclude: ['password'] },
            include: [{
                model: models.Branch,
                as: 'branch',
                attributes: ['id', 'name']
            }],
            order: [['lastName', 'ASC']]
        });
        res.json({ users });
    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create user
router.post('/create', authenticate, authorize('head_of_sales'), async (req, res) => {
    try {
        const userData = {
            ...req.body,
            createdBy: req.user.userId
        };

        // Non-admins can only create users for their own branch or branches they manage
        if (req.user.role !== 'admin') {
            const branchId = userData.branchId || req.user.branchId;
            const branch = await models.Branch.findByPk(branchId);

            if (branchId !== req.user.branchId && (!branch || branch.managedBy !== req.user.userId)) {
                return res.status(403).json({ error: 'Unauthorized to create users for this branch' });
            }

            // Role-based creation limits
            if (req.user.role === 'manager') {
                // Managers can create head_of_sales and salesperson
                if (!['head_of_sales', 'salesperson'].includes(userData.role)) {
                    userData.role = 'salesperson';
                }
            } else if (req.user.role === 'head_of_sales') {
                // Head of Sales can ONLY create salespeople
                userData.role = 'salesperson';
            }
        }

        // Check if email exists
        const existing = await models.User.findOne({ where: { email: userData.email } });
        if (existing) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const user = await models.User.create(userData);

        // Remove password from response
        const userObj = user.toJSON();
        delete userObj.password;

        res.json({ success: true, user: userObj });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update user
router.put('/update/:id', authenticate, authorize('head_of_sales'), async (req, res) => {
    try {
        const { id } = req.params;
        const { password, ...updateData } = req.body;

        const user = await models.User.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Role-based authorization
        if (req.user.role !== 'admin') {
            // Managers and Head of Sales can only update users in their branch or users they created
            const isAuthorized = user.branchId === req.user.branchId || user.createdBy === req.user.userId;
            if (!isAuthorized) {
                return res.status(403).json({ error: 'Unauthorized to update this user' });
            }

            // Role-based update limits
            if (req.user.role === 'manager') {
                // Managers can update anyone to head_of_sales or salesperson, but cannot create admins
                if (updateData.role && !['head_of_sales', 'salesperson'].includes(updateData.role)) {
                    delete updateData.role;
                }
            } else if (req.user.role === 'head_of_sales') {
                // Head of Sales can ONLY update users to salesperson, and ONLY if the target is NOT a higher role
                if (['admin', 'manager', 'head_of_sales'].includes(user.role)) {
                    return res.status(403).json({ error: 'Unauthorized to update higher or equal roles' });
                }
                if (updateData.role && updateData.role !== 'salesperson') {
                    updateData.role = 'salesperson';
                }
            }
        }

        // If password is provided, it will be hashed by the model hook `beforeUpdate`
        if (password) {
            user.password = password;
        }

        // Update other fields
        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined) {
                user[key] = updateData[key];
            }
        });

        await user.save();

        const userObj = user.toJSON();
        delete userObj.password;

        res.json({ success: true, user: userObj });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
