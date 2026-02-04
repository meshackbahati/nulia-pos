import { Handler } from '@netlify/functions';
import { requireAuth } from '../../middleware/auth';
import models from '../../models';
import { createResponse, handleCORS, handleError } from '../../types';

export const handler: Handler = async (event, context) => {
    // Handle CORS preflight
    const corsResponse = handleCORS(event);
    if (corsResponse) return corsResponse;

    try {
        const auth = await requireAuth(event);

        // Get user's branch (if not admin)
        let branchId = auth.branchId;
        if (auth.role === 'admin') {
            // Admin can see all products, but we'll filter by branch if specified
            const params = event.queryStringParameters || {};
            if (params.branchId) {
                branchId = params.branchId;
            }
        }

        // Build where clause
        const whereClause: any = { isActive: true };

        // Get products with inventory information
        const products = await models.Product.findAll({
            where: whereClause,
            include: [
                {
                    model: models.Inventory,
                    as: 'inventory',
                    where: branchId ? { branchId } : {},
                    required: false,
                    attributes: ['quantity', 'minStockLevel', 'maxStockLevel'],
                },
                {
                    model: models.ProductVariant,
                    as: 'variants',
                    where: { isActive: true },
                    required: false,
                },
            ],
            order: [['name', 'ASC']],
        });

        const formattedProducts = products.map(product => {
            const inventory = product.inventory?.[0];
            return {
                id: product.id,
                name: product.name,
                description: product.description,
                category: product.category,
                brand: product.brand,
                price: parseFloat(product.basePrice.toString()),
                costPrice: parseFloat(product.costPrice.toString()),
                sku: product.sku,
                barcode: product.barcode,
                imageUrl: product.imageUrl,
                stockQuantity: inventory ? inventory.quantity : 0,
                minStockLevel: inventory ? inventory.minStockLevel : 0,
                variants: product.variants || [],
            };
        });

        return createResponse(200, { products: formattedProducts });

    } catch (error) {
        return handleError(error);
    }
};
