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

    // Note: getSetting might need to be implemented or adjusted in the new model structure
    // For now, assuming it exists or using findOne
    const cloudNameSetting = await Setting.findOne({ where: { key: 'cloudinary_cloud_name' } });
    const apiKeySetting = await Setting.findOne({ where: { key: 'cloudinary_api_key' } });
    const apiSecretSetting = await Setting.findOne({ where: { key: 'cloudinary_api_secret' } });

    const cloudName = cloudNameSetting?.value;
    const apiKey = apiKeySetting?.value;
    const apiSecret = apiSecretSetting?.value;

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Cloudinary credentials not configured');
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
