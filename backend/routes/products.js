import express from 'express';
import models, { sequelize } from '../models/index.js';
import { authenticate, authorize } from '../lib/auth.js';
import { createAuditLog, AUDIT_ACTIONS, AUDIT_RESOURCES } from '../lib/audit.js';
import { Op } from 'sequelize';
import multer from 'multer';
import cloudinary from '../lib/cloudinary.js';
import { parse } from 'csv-parse/sync';

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

// Upload image to Cloudinary
router.post('/upload-image', authenticate, authorize('head_of_sales'), upload.single('image'), async (req, res) => {
    if (req.user.role === 'head_of_sales' && !req.user.permissions?.canManageInventory) {
        return res.status(403).json({ error: 'Head of Sales requires explicit permission to upload images' });
    }
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        // Get Cloudinary config from settings
        const config = await cloudinary.getCloudinaryConfig();

        console.log(`[Upload] Processing image: ${req.file.originalname} (${req.file.size} bytes)`);

        const result = await cloudinary.uploadImage(req.file.buffer, {
            folder: 'bordershop/products',
            config,
            transformation: [
                { width: 800, height: 800, crop: 'limit' },
                { quality: 'auto' },
                { fetch_format: 'auto' }
            ]
        });

        res.json({ success: true, url: result.url });
    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Import products via CSV
router.post('/import-csv', authenticate, authorize('head_of_sales'), upload.single('file'), async (req, res) => {
    if (req.user.role === 'head_of_sales' && !req.user.permissions?.canManageInventory) {
        return res.status(403).json({ error: 'Head of Sales requires explicit permission to create products' });
    }
    let t;
    try {
        t = await sequelize.transaction();
        if (!req.file) {
            return res.status(400).json({ error: 'No CSV file provided' });
        }

        const { branchId } = req.body;
        const targetBranchId = req.user.role === 'admin' ? branchId : req.user.branchId;

        if (!targetBranchId) {
            return res.status(400).json({ error: 'Target branch ID is required for import' });
        }

        const records = parse(req.file.buffer, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        const results = {
            created: 0,
            updated: 0,
            errors: []
        };

        for (const record of records) {
            try {
                const {
                    name, sku, barcode, category, brand,
                    basePrice, costPrice, stockQuantity,
                    lowStockThreshold, barcodes, imageUrl
                } = record;

                if (!name) {
                    results.errors.push(`Missing name for record: ${JSON.stringify(record)}`);
                    continue;
                }

                // If SKU is missing, generate one from barcode or name+timestamp
                const finalSku = sku || barcode || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                const finalBarcode = barcode || finalSku;

                // Parse numeric fields
                const parsedBasePrice = parseFloat(basePrice || 0);
                const parsedCostPrice = parseFloat(costPrice || 0);
                const parsedStock = parseInt(stockQuantity || 0);
                const parsedThreshold = parseInt(lowStockThreshold || 10);

                // Parse barcodes array (comma separated in CSV)
                const parsedBarcodes = barcodes ? barcodes.split(',').map(b => b.trim()) : [];

                // 1. Find or create the product (unique by sku/barcode)
                let product = await models.Product.findOne({
                    where: {
                        [Op.or]: [
                            finalSku ? { sku: finalSku } : null,
                            finalBarcode ? { barcode: finalBarcode } : null
                        ].filter(Boolean)
                    },
                    transaction: t
                });

                if (product) {
                    await product.update({
                        name,
                        sku: finalSku,
                        barcode: finalBarcode,
                        category: category || 'General',
                        brand: brand || '',
                        basePrice: parsedBasePrice,
                        costPrice: parsedCostPrice,
                        barcodes: parsedBarcodes,
                        imageUrl: imageUrl || '',
                        isActive: true
                    }, { transaction: t });
                } else {
                    product = await models.Product.create({
                        name,
                        sku: finalSku,
                        barcode: finalBarcode,
                        category: category || 'General',
                        brand: brand || '',
                        basePrice: parsedBasePrice,
                        costPrice: parsedCostPrice,
                        barcodes: parsedBarcodes,
                        imageUrl: imageUrl || '',
                        isActive: true
                    }, { transaction: t });
                }

                // 2. Initialize/Update Inventory for this branch
                const [inventory, created] = await models.Inventory.findOrCreate({
                    where: {
                        branchId: targetBranchId,
                        productId: product.id,
                        variantId: null
                    },
                    defaults: {
                        quantity: parsedStock,
                        minStockLevel: parsedThreshold
                    },
                    transaction: t
                });

                if (!created) {
                    await inventory.update({
                        quantity: parsedStock,
                        minStockLevel: parsedThreshold
                    }, { transaction: t });
                }

                if (created) {
                    results.created++;
                } else {
                    results.updated++;
                }
            } catch (err) {
                results.errors.push(`Error processing record ${record.sku}: ${err.message}`);
            }
        }

        await createAuditLog({
            userId: req.user.id,
            action: AUDIT_ACTIONS.UPDATE,
            resource: AUDIT_RESOURCES.PRODUCT,
            details: `Bulk CSV Import: ${results.created} created, ${results.updated} updated, ${results.errors.length} errors for branch ${targetBranchId}`
        }, { transaction: t });

        await t.commit();
        res.json({ success: true, results });
    } catch (error) {
        await t.rollback();
        console.error('CSV import error:', error);
        res.status(500).json({ error: error.message });
    }
});

// List products (aliased to /list for UI consistency)
router.get('/list', authenticate, async (req, res) => {
    try {
        let branchId = req.user.branchId;
        if (req.user.role === 'admin' && req.query.branchId) {
            branchId = req.query.branchId;
        }

        const whereClause = { isActive: true };

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
                basePrice: parseFloat(product.basePrice.toString()),
                costPrice: parseFloat(product.costPrice.toString()),
                sku: product.sku,
                barcode: product.barcode,
                barcodes: product.barcodes || [],
                imageUrl: product.imageUrl,
                stockQuantity: inventory ? inventory.quantity : 0,
                minStockLevel: inventory ? inventory.minStockLevel : 0,
                variants: product.variants || [],
            };
        });

        res.json({ products: formattedProducts });
    } catch (error) {
        console.error('List products error:', error);
        res.status(500).json({ error: error.message });
    }
});

// List categories
router.get('/categories', authenticate, async (req, res) => {
    try {
        const categories = await models.Product.findAll({
            attributes: [
                [sequelize.fn('DISTINCT', sequelize.col('category')), 'category']
            ],
            where: { isActive: true },
            order: [[sequelize.col('category'), 'ASC']]
        });

        const categoryList = categories.map(c => c.category).filter(Boolean);
        res.json({ categories: categoryList });
    } catch (error) {
        console.error('List categories error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create product
router.post('/create', authenticate, authorize('head_of_sales'), async (req, res) => {
    // Check for specific permission if Head of Sales
    if (req.user.role === 'head_of_sales' && !req.user.permissions?.canManageInventory) {
        return res.status(403).json({ error: 'Head of Sales requires explicit permission to create products' });
    }

    let t;
    try {
        t = await sequelize.transaction();
        const { branchId, stockQuantity, lowStockThreshold, variants, ...productData } = req.body;

        // Enforce branchId scoping
        const targetBranchId = req.user.role === 'admin' ? branchId : req.user.branchId;
        if (!targetBranchId) {
            throw new Error('Target branch ID is required');
        }

        // If SKU is missing, generate one
        const finalSku = productData.sku || productData.barcode || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const finalBarcode = productData.barcode || finalSku;

        productData.sku = finalSku;
        productData.barcode = finalBarcode;

        // 1. Find or create the product (unique by sku/barcode)
        let product = await models.Product.findOne({
            where: {
                [Op.or]: [
                    finalSku ? { sku: finalSku } : null,
                    finalBarcode ? { barcode: finalBarcode } : null
                ].filter(Boolean)
            },
            transaction: t
        });

        if (product) {
            await product.update(productData, { transaction: t });
        } else {
            product = await models.Product.create(productData, { transaction: t });
        }

        // 2. Initialize/Update Inventory for this branch
        const [inventory] = await models.Inventory.findOrCreate({
            where: {
                branchId: targetBranchId,
                productId: product.id,
                variantId: null // Support for simple products first
            },
            defaults: {
                quantity: parseInt(stockQuantity || 0),
                minStockLevel: parseInt(lowStockThreshold || 10)
            },
            transaction: t
        });

        if (inventory) {
            await inventory.update({
                quantity: parseInt(stockQuantity || 0),
                minStockLevel: parseInt(lowStockThreshold || 10)
            }, { transaction: t });
        }

        // 3. Handle variants if any
        if (variants && variants.length > 0) {
            for (const v of variants) {
                const [variant] = await models.ProductVariant.findOrCreate({
                    where: { productId: product.id, sku: v.sku },
                    defaults: { ...v, isActive: true },
                    transaction: t
                });

                // Inventory for variant
                await models.Inventory.findOrCreate({
                    where: {
                        branchId: targetBranchId,
                        productId: product.id,
                        variantId: variant.id
                    },
                    defaults: {
                        quantity: parseInt(v.stock || 0),
                        minStockLevel: 5
                    },
                    transaction: t
                });
            }
        }

        await t.commit();
        res.json({ success: true, product });
    } catch (error) {
        await t.rollback();
        console.error('Create product error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update product
router.put('/update/:id', authenticate, authorize('head_of_sales'), async (req, res) => {
    if (req.user.role === 'head_of_sales' && !req.user.permissions?.canManageInventory) {
        return res.status(403).json({ error: 'Head of Sales requires explicit permission to update products' });
    }
    try {
        const { id } = req.params;
        const product = await models.Product.findByPk(id);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        await product.update(req.body);
        res.json({ success: true, product });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete product
router.delete('/delete/:id', authenticate, authorize('head_of_sales'), async (req, res) => {
    if (req.user.role === 'head_of_sales' && !req.user.permissions?.canManageInventory) {
        return res.status(403).json({ error: 'Head of Sales requires explicit permission to delete products' });
    }
    try {
        const { id } = req.params;
        const product = await models.Product.findByPk(id);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        await product.update({ isActive: false });
        res.json({ success: true });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Low stock (aliased here to match /products/low-stock)
router.get('/low-stock', authenticate, authorize('head_of_sales'), async (req, res) => {
    try {
        const { threshold = 10, branchId } = req.query;
        const targetBranchId = branchId || req.user.branchId;

        const products = await models.Product.findAll({
            where: { isActive: true },
            include: [
                {
                    model: models.Inventory,
                    as: 'inventory',
                    where: {
                        branchId: targetBranchId,
                        quantity: { [Op.lte]: Number(threshold) }
                    },
                    required: true
                }
            ]
        });

        res.json({ products, count: products.length });
    } catch (error) {
        console.error('Low stock error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Barcode lookup
router.get('/barcode/:barcode', authenticate, async (req, res) => {
    try {
        const { barcode } = req.params;
        let branchId = req.user.branchId;

        const product = await models.Product.findOne({
            where: {
                [Op.or]: [
                    { barcode: barcode },
                    { barcodes: { [Op.contains]: [barcode] } }
                ],
                isActive: true
            },
            include: [
                {
                    model: models.Inventory,
                    as: 'inventory',
                    where: branchId ? { branchId } : {},
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

        if (product) {
            return res.json({ product });
        }

        // Try variants
        const variant = await models.ProductVariant.findOne({
            where: { barcode, isActive: true },
            include: [
                {
                    model: models.Product,
                    as: 'product',
                    where: { isActive: true },
                },
            ],
        });

        if (variant) {
            return res.json({ variant });
        }

        res.status(404).json({ error: 'Product not found' });
    } catch (error) {
        console.error('Barcode lookup error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
