import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import models from '@/models';

export async function GET(
  request: NextRequest,
  { params }: { params: { barcode: string } }
) {
  try {
    const auth = await requireAuth(request);
    const { barcode } = params;

    // Find product by barcode
    const product = await models.Product.findOne({
      where: { 
        barcode,
        isActive: true 
      },
      include: [
        {
          model: models.Inventory,
          as: 'inventory',
          where: auth.branchId ? { branchId: auth.branchId } : {},
          required: false,
          attributes: ['quantity', 'minStockLevel'],
        },
      ],
    });

    if (!product) {
      // Try to find by variant barcode
      const variant = await models.ProductVariant.findOne({
        where: { 
          barcode,
          isActive: true 
        },
        include: [
          {
            model: models.Product,
            as: 'product',
            where: { isActive: true },
            include: [
              {
                model: models.Inventory,
                as: 'inventory',
                where: auth.branchId ? { branchId: auth.branchId } : {},
                required: false,
              },
            ],
          },
        ],
      });

      if (!variant) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }

      const inventory = variant.product.inventory?.[0];
      return NextResponse.json({
        product: {
          id: variant.product.id,
          variantId: variant.id,
          name: `${variant.product.name} - ${variant.name}`,
          price: parseFloat(variant.price.toString()),
          barcode: variant.barcode,
          category: variant.product.category,
          stock: inventory ? inventory.quantity : 0,
        },
      });
    }

    const inventory = product.inventory?.[0];
    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        price: parseFloat(product.basePrice.toString()),
        barcode: product.barcode,
        category: product.category,
        stock: inventory ? inventory.quantity : 0,
      },
    });

  } catch (error) {
    console.error('Barcode lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to lookup product' },
      { status: 500 }
    );
  }
}