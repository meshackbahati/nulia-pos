import { Handler } from '@netlify/functions';
import { requireAuth } from '../../middleware/auth';
import models from '../../models';
import { createResponse, handleCORS, handleError } from '../../types';

export const handler: Handler = async (event, context) => {
    // Handle CORS preflight
    const corsResponse = handleCORS(event);
    if (corsResponse) return corsResponse;

    // Only allow GET
    if (event.httpMethod !== 'GET') {
        return createResponse(405, { error: 'Method not allowed' });
    }

    try {
        const auth = await requireAuth(event);

        // Get barcode from path
        const barcode = event.path.split('/').pop();

        if (!barcode) {
            return createResponse(400, { error: 'Barcode is required' });
        }

        let product: any = await models.Product.findOne({
            where: { barcode, isActive: true },
            include: [
                {
                    model: models.Inventory,
                    as: 'inventory',
                    where: auth.branchId ? { branchId: auth.branchId } : {},
                    required: false,
                },
                {
                    model: models.ProductVariant,
                    as: 'variants',
                    where: { isActive: true },
                    required: false,
                },
            ],
        });

        let matchedVariant: any = null;

        if (!product) {
            // Try matching a variant
            const variant: any = await models.ProductVariant.findOne({
                where: { barcode, isActive: true },
                include: [
                    {
                        model: models.Product,
                        as: 'product',
                        include: [
                            {
                                model: models.ProductVariant,
                                as: 'variants',
                                where: { isActive: true },
                                required: false,
                            }
                        ]
                    }
                ]
            });

            if (variant) {
                product = variant.product;
                matchedVariant = variant;
            }
        }

        if (!product) {
            return createResponse(404, { error: 'Product not found' });
        }

        // Get inventory for specific variant or product
        let inventory;
        if (matchedVariant) {
            const variantInventory = await models.Inventory.findOne({
                where: {
                    productId: product.id,
                    variantId: matchedVariant.id,
                    ...(auth.branchId ? { branchId: auth.branchId } : {})
                }
            });
            inventory = variantInventory;
        } else {
            inventory = product.inventory?.[0]; // Default product inventory (no variant)
        }

        return createResponse(200, {
            product: {
                id: product.id,
                variantId: matchedVariant?.id,
                name: matchedVariant ? `${product.name} - ${matchedVariant.name}` : product.name,
                description: product.description,
                category: product.category,
                brand: product.brand,
                basePrice: parseFloat((matchedVariant?.price || product.basePrice).toString()),
                costPrice: parseFloat((matchedVariant?.costPrice || product.costPrice).toString()),
                sku: matchedVariant?.sku || product.sku,
                barcode: matchedVariant?.barcode || product.barcode,
                imageUrl: product.imageUrl,
                stockQuantity: inventory ? inventory.quantity : 0,
                variants: product.variants || [],
            }
        });

    } catch (error) {
        return handleError(error);
    }
};
