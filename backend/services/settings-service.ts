import models from '../../models';
import { encrypt } from '../../lib/encryption';

interface SettingInput {
    branchId?: string;
    category: 'payment' | 'email' | 'storage' | 'general';
    key: string;
    value: string;
    isEncrypted?: boolean;
    createdBy: string;
}

export async function getSetting(branchId: string | null, category: string, key: string) {
    try {
        const setting = await models.Setting.findOne({
            where: {
                branchId: branchId || null,
                category,
                key,
                isActive: true,
            },
        });

        if (!setting) return null;

        return {
            ...setting.toJSON(),
            value: setting.getDecryptedValue(),
        };
    } catch (error) {
        console.error('Error fetching setting:', error);
        return null;
    }
}

export async function getSettings(branchId: string | null, category?: string) {
    try {
        const where: any = {
            branchId: branchId || null,
            isActive: true,
        };

        if (category) {
            where.category = category;
        }

        const settings = await models.Setting.findAll({ where });

        return settings.map(setting => ({
            ...setting.toJSON(),
            value: setting.getDecryptedValue(),
        }));
    } catch (error) {
        console.error('Error fetching settings:', error);
        return [];
    }
}

export async function createOrUpdateSetting(data: SettingInput) {
    try {
        const [setting, created] = await models.Setting.findOrCreate({
            where: {
                branchId: data.branchId || null,
                category: data.category,
                key: data.key,
            },
            defaults: {
                value: data.isEncrypted ? encrypt(data.value) : data.value,
                isEncrypted: data.isEncrypted || false,
                createdBy: data.createdBy,
                updatedBy: data.createdBy,
            },
        });

        if (!created) {
            // Update existing
            setting.value = data.isEncrypted ? encrypt(data.value) : data.value;
            setting.isEncrypted = data.isEncrypted || false;
            setting.updatedBy = data.createdBy;
            await setting.save();
        }

        return { success: true, setting };
    } catch (error) {
        console.error('Error creating/updating setting:', error);
        return { success: false, error: 'Failed to save setting' };
    }
}

export async function deleteSetting(branchId: string | null, category: string, key: string) {
    try {
        await models.Setting.destroy({
            where: {
                branchId: branchId || null,
                category,
                key,
            },
        });

        return { success: true };
    } catch (error) {
        console.error('Error deleting setting:', error);
        return { success: false, error: 'Failed to delete setting' };
    }
}

// M-Pesa specific helpers
export async function getMpesaSettings(branchId: string) {
    const settings = await getSettings(branchId, 'payment');
    const mpesaSettings = settings.filter(s => s.key.startsWith('mpesa_'));

    return {
        consumerKey: mpesaSettings.find(s => s.key === 'mpesa_consumer_key')?.value,
        consumerSecret: mpesaSettings.find(s => s.key === 'mpesa_consumer_secret')?.value,
        passkey: mpesaSettings.find(s => s.key === 'mpesa_passkey')?.value,
        shortcode: mpesaSettings.find(s => s.key === 'mpesa_shortcode')?.value,
        environment: mpesaSettings.find(s => s.key === 'mpesa_environment')?.value || 'sandbox',
    };
}

// Brevo/Email specific helpers
export async function getEmailSettings(branchId?: string) {
    const settings = await getSettings(branchId || null, 'email');

    return {
        apiKey: settings.find(s => s.key === 'brevo_api_key')?.value,
        senderEmail: settings.find(s => s.key === 'sender_email')?.value,
        senderName: settings.find(s => s.key === 'sender_name')?.value,
    };
}

// Cloudinary specific helpers
export async function getCloudinarySettings(branchId?: string) {
    const settings = await getSettings(branchId || null, 'storage');

    return {
        cloudName: settings.find(s => s.key === 'cloudinary_cloud_name')?.value,
        apiKey: settings.find(s => s.key === 'cloudinary_api_key')?.value,
        apiSecret: settings.find(s => s.key === 'cloudinary_api_secret')?.value,
        uploadPreset: settings.find(s => s.key === 'cloudinary_upload_preset')?.value,
    };
}
