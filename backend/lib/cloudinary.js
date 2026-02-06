import { v2 as cloudinary } from 'cloudinary';

// Initialize Cloudinary
export const initCloudinary = (config) => {
    cloudinary.config({
        cloud_name: config.cloudName,
        api_key: config.apiKey,
        api_secret: config.apiSecret,
        secure: true,
    });
};

// Upload image to Cloudinary
export const uploadImage = async (file, options = {}) => {
    try {
        const result = await cloudinary.uploader.upload(file, {
            folder: options.folder || 'bordershop/products',
            public_id: options.publicId,
            transformation: options.transformation || [
                { width: 1000, height: 1000, crop: 'limit' },
                { quality: 'auto:good' },
                { fetch_format: 'auto' },
            ],
        });

        return {
            url: result.secure_url,
            publicId: result.public_id,
        };
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error('Failed to upload image to Cloudinary');
    }
};

// Delete image from Cloudinary
export const deleteImage = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        throw new Error('Failed to delete image from Cloudinary');
    }
};

// Get Cloudinary config from settings
export const getCloudinaryConfig = async () => {
    const models = (await import('../models/index.js')).default;
    const Setting = models.Setting;

    const cloudNameSetting = await Setting.findOne({
        where: { category: 'cloudinary', key: 'cloudName' }
    });
    const apiKeySetting = await Setting.findOne({
        where: { category: 'cloudinary', key: 'apiKey' }
    });
    const apiSecretSetting = await Setting.findOne({
        where: { category: 'cloudinary', key: 'apiSecret' }
    });

    const cloudName = cloudNameSetting?.getDecryptedValue();
    const apiKey = apiKeySetting?.getDecryptedValue();
    const apiSecret = apiSecretSetting?.getDecryptedValue();

    if (!cloudName || !apiKey || !apiSecret) {
        console.error('Missing Cloudinary credentials:', {
            cloudName: !!cloudName,
            apiKey: !!apiKey,
            apiSecret: !!apiSecret
        });
        throw new Error('Cloudinary credentials not configured or failed to decrypt');
    }

    if (apiKey === '[DECRYPTION_ERROR]' || apiSecret === '[DECRYPTION_ERROR]') {
        throw new Error('Cloudinary credentials decryption failed. Please re-save them in settings.');
    }

    return {
        cloudName,
        apiKey,
        apiSecret,
    };
};

export default {
    initCloudinary,
    uploadImage,
    deleteImage,
    getCloudinaryConfig,
};
