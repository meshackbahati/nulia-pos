
import models from '../models/index.js';
import { Op } from 'sequelize';

async function fixEmptySkus() {
    try {
        console.log('--- Cleaning up empty SKUs and Barcodes ---');
        
        // Fix Products
        const emptySkus = await models.Product.findAll({
            where: {
                [Op.or]: [
                    { sku: '' },
                    { barcode: '' }
                ]
            }
        });

        console.log(`Found ${emptySkus.length} products with empty strings as SKU/Barcode.`);

        for (const product of emptySkus) {
            console.log(`Fixing product: ${product.name} (ID: ${product.id})`);
            if (product.sku === '') product.sku = null;
            if (product.barcode === '') product.barcode = null;
            await product.save();
        }

        // Fix Variants
        const emptyVariantSkus = await models.ProductVariant.findAll({
            where: {
                [Op.or]: [
                    { sku: '' },
                    { barcode: '' }
                ]
            }
        });

        console.log(`Found ${emptyVariantSkus.length} variants with empty strings as SKU/Barcode.`);

        for (const variant of emptyVariantSkus) {
            console.log(`Fixing variant: ${variant.name} (ID: ${variant.id})`);
            if (variant.sku === '') variant.sku = null;
            if (variant.barcode === '') variant.barcode = null;
            await variant.save();
        }

        console.log('Cleanup complete!');
        process.exit(0);
    } catch (error) {
        console.error('Cleanup failed:', error);
        process.exit(1);
    }
}

fixEmptySkus();
