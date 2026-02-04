import { Handler } from '@netlify/functions';
import models from '../../models';
import { createResponse, handleCORS, handleError } from '../../types';
import { verifyToken } from '../../middleware/auth';
import cloudinary from '../../lib/cloudinary';

export const handler: Handler = async (event, context) => {
    const corsResponse = handleCORS(event);
    if (corsResponse) return corsResponse;

    if (event.httpMethod !== 'DELETE') {
        return createResponse(405, { error: 'Method not allowed' });
    }

    try {
        // Verify token
        const user = await verifyToken(event.headers.authorization);
        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            return createResponse(403, { error: 'Only managers can delete products' });
        }

        const productId = event.path.split('/').pop();
        if (!productId) {
            return createResponse(400, { error: 'Product ID required' });
        }

        const product = await models.Product.findByPk(productId);
        if (!product) {
            return createResponse(404, { error: 'Product not found' });
        }

        // Delete image from Cloudinary if exists
        if (product.imageUrl) {
            try {
                const config = await cloudinary.getCloudinaryConfig();
                cloudinary.initCloudinary(config);
                const publicId = product.imageUrl.split('/').slice(-2).join('/').split('.')[0];
                await cloudinary.deleteImage(publicId);
            } catch (error) {
                console.error('Failed to delete image:', error);
                // Continue with product deletion even if image deletion fails
            }
        }

        // Soft delete (set isActive to false)
        await product.update({ isActive: false });

        return createResponse(200, {
            message: 'Product deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting product:', error);
        return handleError(error);
    }
};
