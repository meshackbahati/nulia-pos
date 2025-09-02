import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import models from '@/models';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);

    // Get user's branch (if not admin)
    let branchId = auth.branchId;
    if (auth.role === 'admin') {
      // Admin can see all products, but we'll filter by branch if specified
      const url = new URL(request.url);
      const branchParam = url.searchParams.get('branchId');
      if (branchParam) {
        branchId = branchParam;
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
        stock: inventory ? inventory.quantity : 0,
        minStockLevel: inventory ? inventory.minStockLevel : 0,
        variants: product.variants || [],
      };
    });

    return NextResponse.json({
      products: formattedProducts,
    });

  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'manager');
    const body = await request.json();

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
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: 'SKU or barcode already exists' },
        { status: 400 }
      );
    }

    // Create product
    const product = await models.Product.create({
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

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: parseFloat(product.basePrice.toString()),
      },
    });

  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}