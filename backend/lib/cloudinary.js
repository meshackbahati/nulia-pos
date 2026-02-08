import { v2 as cloudinary } from 'cloudinary';

// Upload image to Cloudinary using Streams (Memory Efficient)
export const uploadImage = (fileBuffer, options = {}) => {
    const config = options.config;
    if (!config || !config.cloudName || !config.apiKey || !config.apiSecret) {
        throw new Error('Cloudinary credentials missing for upload');
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
                    console.error('[Cloudinary] Stream upload failed:', error);
                    return reject(new Error(`Cloudinary upload failed: ${error.message}`));
                }
                console.log('[Cloudinary] Stream upload successful');
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                });
            }
        );

        // Pipe the buffer to the stream
        const streamifier = {
            createReadStream: (buffer) => {
                const { Readable } = require('stream');
                const readable = new Readable();
                readable._read = () => { };
                readable.push(buffer);
                readable.push(null);
                return readable;
            }
        };

        // Standard node stream approach
        import('stream').then(({ Readable }) => {
            const readable = new Readable();
            readable._read = () => { };
            readable.push(fileBuffer);
            readable.push(null);
            readable.pipe(uploadStream);
        }).catch(err => {
            console.error('[Cloudinary] Failed to import stream:', err);
            reject(err);
        });
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
