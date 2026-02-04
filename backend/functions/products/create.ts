import { Handler } from '@netlify/functions';
import { requireAuth } from '../../middleware/auth';
import models from '../../models';
import { Op } from 'sequelize';
import { createResponse, handleCORS, handleError } from '../../types';

export const handler: Handler = async (event, context) => {
    // Handle CORS preflight
    const corsResponse = handleCORS(event);
    if (corsResponse) return corsResponse;

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return createResponse(405, { error: 'Method not allowed' });
    }

    try {
        const auth = await requireAuth(event, 'manager');
        const body = JSON.parse(event.body || '{}');

        const {
            name,
            description,
            category,
            brand,
            basePrice,
            costPrice,
            sku,
            barcode,
            imageUrl,
            initialStock = 0,
        } = body;

        // Validate required fields
        if (!name || !category || !basePrice || !costPrice || !sku) {
            return createResponse(400, {
                error: 'Missing required fields'
            });
        }

        // Check if SKU or barcode already exists
        const existingProduct = await models.Product.findOne({
            where: {
                [Op.or]: [
                    { sku },
                    ...(barcode ? [{ barcode }] : [])
                ]
            }
        });

        if (existingProduct) {
            return createResponse(400, {
                error: 'SKU or barcode already exists'
            });
        }

        // Create product
        const product: any = await models.Product.create({
            name,
            description,
            category,
            brand,
            basePrice,
            costPrice,
            sku,
            barcode,
            imageUrl,
            isActive: true,
        });

        // Create initial inventory if user has a branch
        if (auth.branchId && initialStock > 0) {
            await models.Inventory.create({
                branchId: auth.branchId,
                productId: product.id,
                quantity: initialStock,
                reservedQuantity: 0,
                minStockLevel: 10,
                maxStockLevel: 1000,
            });
        }

        // Create variants if provided
        const { variants } = body;
        if (variants && Array.isArray(variants)) {
            for (const variant of variants) {
                if (variant.name && variant.sku && variant.price) {
                    const newVariant: any = await models.ProductVariant.create({
                        productId: product.id,
                        name: variant.name,
                        sku: variant.sku,
                        barcode: variant.barcode,
                        price: variant.price,
                        costPrice: variant.costPrice || variant.price,
                        isActive: true
                    });

                    // Create variant inventory
                    if (auth.branchId && variant.stock > 0) {
                        await models.Inventory.create({
                            branchId: auth.branchId,
                            productId: product.id,
                            variantId: newVariant.id,
                            quantity: variant.stock,
                            reservedQuantity: 0,
                            minStockLevel: 5,
                            maxStockLevel: 1000,
                        });
                    }
                }
            }
        }

        return createResponse(201, {
            success: true,
            product: {
                id: product.id,
                name: product.name,
                sku: product.sku,
                price: parseFloat(product.basePrice.toString()),
            },
        });

    } catch (error) {
        return handleError(error);
    }
};
