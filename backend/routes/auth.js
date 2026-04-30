import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import models from '../models/index.js';
import { generateToken, authenticate } from '../lib/auth.js';
import { createAuditLog, AUDIT_ACTIONS, AUDIT_RESOURCES } from '../lib/audit.js';
import EmailService from '../lib/email.js';

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

// Forgot Password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await models.User.findOne({ where: { email, isActive: true } });

        if (!user) {
            return res.json({ success: true, message: 'If this email is registered, you will receive a reset link.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600000); // 1 hour

        await user.update({
            resetToken: token,
            resetTokenExpires: expires
        });

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`;

        await EmailService.sendEmail({
            to: user.email,
            subject: 'Password Reset Request - BorderShop POS',
            html: `
                <div style="font-family: sans-serif; max-width: 500px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #479558;">Security Alert</h2>
                    <p>A password reset was requested for your BorderShop POS account.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background: #479558; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">RESET PASSWORD</a>
                    </div>
                    <p style="font-size: 12px; color: #666;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
                </div>
            `
        });

        res.json({ success: true, message: 'Reset link sent to your email.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        const user = await models.User.findOne({
            where: {
                resetToken: token,
                resetTokenExpires: { [models.Op.gt]: new Date() }
            }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        await user.update({
            password: newPassword,
            resetToken: null,
            resetTokenExpires: null
        });

        res.json({ success: true, message: 'Password reset successful. You can now login.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

export default router;
