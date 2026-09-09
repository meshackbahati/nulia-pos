import express from 'express';
import models, { sequelize } from '../models/index.js';
import { authenticate, authorize } from '../lib/auth.js';
import notificationService from '../services/notificationService.js';

const router = express.Router();

// Get settings
router.get('/get', authenticate, async (req, res) => {
    try {
        const allSettings = await models.Setting.findAll();

        // Initialize default structure
        const structuredSettings = {
            mpesa: {},
            brevo: {},
            cloudinary: {},
            company: {},
            currency: {},
            paystack: {}
        };

        allSettings.forEach(s => {
            const category = s.category;
            if (!structuredSettings[category]) {
                structuredSettings[category] = {};
            }

            // Decrypt if it's a secret and user is admin
            if (s.isEncrypted) {
                structuredSettings[category][s.key] = req.user.role === 'admin' ? s.getDecryptedValue() : '********';
            } else {
                structuredSettings[category][s.key] = s.value;
            }
        });

        res.json({ settings: structuredSettings });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update settings
router.post('/update', authenticate, authorize('admin'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const nestedSettings = req.body; // { mpesa: {...}, brevo: {...} }

        // List of keys that should be encrypted
        const secretKeys = ['consumerKey', 'consumerSecret', 'passkey', 'apiKey', 'apiSecret', 'secretKey'];

        for (const [category, keys] of Object.entries(nestedSettings)) {
            if (typeof keys !== 'object') continue;

            for (const [key, value] of Object.entries(keys)) {
                if (value === '********') continue; // Don't overwrite with masked value

                const isSecret = secretKeys.includes(key);

                let setting = await models.Setting.findOne({
                    where: { category, key },
                    transaction: t
                });

                if (setting) {
                    if (isSecret) {
                        setting.setEncryptedValue(value);
                    } else {
                        setting.value = value;
                        setting.isEncrypted = false;
                    }
                    await setting.save({ transaction: t });
                } else {
                    const newSetting = models.Setting.build({
                        category,
                        key,
                        isEncrypted: isSecret
                    });
                    if (isSecret) {
                        newSetting.setEncryptedValue(value);
                    } else {
                        newSetting.value = value;
                    }
                    await newSetting.save({ transaction: t });
                }
            }
        }

        await t.commit();
        res.json({ success: true });
    } catch (error) {
        await t.rollback();
        console.error('Update settings error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Danger Zone: Clear Sales Data
router.post('/clear-sales', authenticate, authorize('admin'), async (req, res) => {
    try {
        await models.Payment.destroy({ where: {}, truncate: false });
        await models.SaleItem.destroy({ where: {}, truncate: false });
        await models.Sale.destroy({ where: {}, truncate: false });
        await models.PaymentLog.destroy({ where: {}, truncate: false });
        
        res.json({ success: true, message: 'All sales transactions cleared.' });
    } catch (error) {
        console.error('Clear sales error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Danger Zone: Clear Product Data
router.post('/clear-products', authenticate, authorize('admin'), async (req, res) => {
    try {
        await models.Inventory.destroy({ where: {}, truncate: false });
        await models.ProductVariant.destroy({ where: {}, truncate: false });
        await models.Product.destroy({ where: {}, truncate: false });
        
        res.json({ success: true, message: 'All products and inventory cleared.' });
    } catch (error) {
        console.error('Clear products error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Broadcast server update notification email to subscribers and staff
router.post('/notify-server-update', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { version, releaseNotes, title, date } = req.body;
        const sent = await notificationService.notifyServerUpdate({
            version,
            releaseNotes,
            title,
            date
        });
        if (sent) {
            res.json({ success: true, message: 'Server update notification emails sent successfully.' });
        } else {
            res.status(400).json({ success: false, error: 'No recipients found or emailing failed.' });
        }
    } catch (error) {
        console.error('Notify server update error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
