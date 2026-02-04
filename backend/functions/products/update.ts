import { Handler } from '@netlify/functions';
import models from '../../models';
import { createResponse, handleCORS, handleError } from '../../types';
import { verifyToken } from '../../middleware/auth';
import cloudinary from '../../lib/cloudinary';

export const handler: Handler = async (event, context) => {
    const corsResponse = handleCORS(event);
    if (corsResponse) return corsResponse;

    if (event.httpMethod !== 'PUT') {
        return createResponse(405, { error: 'Method not allowed' });
    }

    try {
        // Verify token
        const user = await verifyToken(event.headers.authorization);
        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            return createResponse(403, { error: 'Only managers can update products' });
        }

        const productId = event.path.split('/').pop();
        if (!productId) {
            return createResponse(400, { error: 'Product ID required' });
        }

        const product = await models.Product.findByPk(productId);
        if (!product) {
            return createResponse(404, { error: 'Product not found' });
        }

        const updateData = JSON.parse(event.body || '{}');
        const { imageBase64, deleteOldImage, ...otherFields } = updateData;

        // Handle image update
        if (imageBase64) {
            try {
                const config = await cloudinary.getCloudinaryConfig();
                cloudinary.initCloudinary(config);

                // Delete old image if requested
                if (deleteOldImage && product.imageUrl) {
                    const publicId = product.imageUrl.split('/').slice(-2).join('/').split('.')[0];
                    await cloudinary.deleteImage(publicId);
                }

                // Upload new image
                const upload = await cloudinary.uploadImage(imageBase64, {
                    folder: 'bordershop/products',
                    publicId: `product_${product.sku}_${Date.now()}`,
                });

                otherFields.imageUrl = upload.url;
            } catch (error) {
                console.error('Image upload error:', error);
                return createResponse(500, { error: 'Failed to upload image' });
            }
        }

        // Update product
        await product.update(otherFields);

        return createResponse(200, {
            message: 'Product updated successfully',
            product,
        });
    } catch (error) {
        console.error('Error updating product:', error);
        return handleError(error);
    }
};
