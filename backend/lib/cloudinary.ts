import cloudinary from 'cloudinary';

// Initialize Cloudinary
export const initCloudinary = (config: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
}) => {
    cloudinary.v2.config({
        cloud_name: config.cloudName,
        api_key: config.apiKey,
        api_secret: config.apiSecret,
        secure: true,
    });
};

// Upload image to Cloudinary
export const uploadImage = async (
    file: Buffer | string,
    options: {
        folder?: string;
        publicId?: string;
        transformation?: any;
    } = {}
): Promise<{ url: string; publicId: string }> => {
    try {
        const result = await cloudinary.v2.uploader.upload(file, {
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
export const deleteImage = async (publicId: string): Promise<void> => {
    try {
        await cloudinary.v2.uploader.destroy(publicId);
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        throw new Error('Failed to delete image from Cloudinary');
    }
};

// Get Cloudinary config from settings
export const getCloudinaryConfig = async () => {
    const Setting = (await import('../models')).default.Setting;

    const cloudName = await Setting.getSetting('cloudinary_cloud_name');
    const apiKey = await Setting.getSetting('cloudinary_api_key');
    const apiSecret = await Setting.getSetting('cloudinary_api_secret');

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
