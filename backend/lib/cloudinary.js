import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Upload image to Cloudinary using Streams (Memory Efficient)
export const uploadImage = (fileBuffer, options = {}) => {
    const config = options.config;
    if (!config || !config.cloudName || !config.apiKey || !config.apiSecret) {
        return Promise.reject(new Error('Cloudinary credentials missing for upload'));
    }

    return new Promise((resolve, reject) => {
        console.log(`[Cloudinary] Starting stream upload with API Key: ${config.apiKey}`);

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                cloud_name: config.cloudName,
                api_key: config.apiKey,
                api_secret: config.apiSecret,
                folder: options.folder || 'bordershop/products',
                public_id: options.publicId,
                transformation: options.transformation || [
                    { width: 1000, height: 1000, crop: 'limit' },
                    { quality: 'auto:good' },
                    { fetch_format: 'auto' },
                ],
                secure: true
            },
            (error, result) => {
                if (error) {
                    console.error('[Cloudinary] ERROR:', error);
                    return reject(new Error(`Cloudinary upload failed: ${error.message || 'Unknown error'}`));
                }
                console.log('[Cloudinary] SUCCESS:', result.secure_url);
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                });
            }
        );

        // Handle stream errors
        uploadStream.on('error', (err) => {
            console.error('[Cloudinary] Stream error:', err);
            reject(err);
        });

        // Pipe buffer directly
        const readableStream = new Readable();
        readableStream._read = () => { };
        readableStream.push(fileBuffer);
        readableStream.push(null);
        readableStream.pipe(uploadStream);
    });
};

// Initialize Cloudinary (Deprecated: Use direct config in uploadImage)
export const initCloudinary = (config) => {
    console.warn('initCloudinary is deprecated. Credentials are now passed directly to uploadImage.');
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

// Get Cloudinary config from settings - Optimized Batch Fetch
export const getCloudinaryConfig = async () => {
    const models = (await import('../models/index.js')).default;
    const Setting = models.Setting;

    // Fetch all in one query
    const settings = await Setting.findAll({
        where: {
            category: 'cloudinary',
            key: ['cloudName', 'apiKey', 'apiSecret']
        }
    });

    const configMap = {};
    settings.forEach(s => {
        configMap[s.key] = s.getDecryptedValue();
    });

    const { cloudName, apiKey, apiSecret } = configMap;

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

    return { cloudName, apiKey, apiSecret };
};

export default {
    initCloudinary,
    uploadImage,
    deleteImage,
    getCloudinaryConfig,
};
