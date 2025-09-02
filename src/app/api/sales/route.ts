import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import models from '@/models';
import { createAuditLog, AUDIT_ACTIONS, AUDIT_RESOURCES } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json();

    const {
      items,
      paymentMethod,
      totalAmount,
      customerPhone,
      customerEmail,
      notes,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'No items in cart' },
        { status: 400 }
      );
    }

    if (!auth.branchId) {
      return NextResponse.json(
        { error: 'User not assigned to a branch' },
        { status: 400 }
      );
    }

    // Start transaction
    const transaction = await models.sequelize.transaction();

    try {
      // Check inventory availability
      for (const item of items) {
        const inventory = await models.Inventory.findOne({
          where: {
            branchId: auth.branchId,
            productId: item.productId,
            ...(item.variantId && { variantId: item.variantId }),
          },
          transaction,
        });

        if (!inventory || !inventory.canFulfillOrder(item.quantity)) {
          await transaction.rollback();
          return NextResponse.json(
            { error: `Insufficient stock for ${item.name}` },
            { status: 400 }
          );
        }
      }

      // Calculate totals
      const subtotal = items.reduce((sum: number, item: any) => sum + item.total, 0);
      const taxAmount = subtotal * 0.1; // 10% tax
      const discountAmount = 0; // No discount for now
      const finalTotal = subtotal + taxAmount - discountAmount;

      // Create sale
      const sale = await models.Sale.create({
        branchId: auth.branchId,
        userId: auth.userId,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount: finalTotal,
        paymentMethod,
        paymentStatus: paymentMethod === 'cash' ? 'completed' : 'pending',
        customerPhone,
        customerEmail,
        notes,
      }, { transaction });

      // Create sale items and update inventory
      for (const item of items) {
        // Create sale item
        await models.SaleItem.create({
          saleId: sale.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.total,
          discountAmount: 0,
        }, { transaction });

        // Update inventory
        await models.Inventory.decrement(
          'quantity',
          {
            by: item.quantity,
            where: {
              branchId: auth.branchId,
              productId: item.productId,
              ...(item.variantId && { variantId: item.variantId }),
            },
            transaction,
          }
        );
      }

      // Create payment record
      await models.Payment.create({
        branchId: auth.branchId,
        saleId: sale.id,
        amount: finalTotal,
        currency: 'USD', // Get from branch settings
        method: paymentMethod === 'mpesa' ? 'mpesa_stk' : paymentMethod,
        status: paymentMethod === 'cash' ? 'completed' : 'pending',
        customerPhone,
      }, { transaction });

      // Create audit log
      await createAuditLog({
        userId: auth.userId,
        branchId: auth.branchId,
        action: AUDIT_ACTIONS.SALE_CREATE,
        resource: AUDIT_RESOURCES.SALE,
        resourceId: sale.id,
        newValues: {
          receiptId: sale.receiptId,
          totalAmount: finalTotal,
          itemCount: items.length,
          paymentMethod,
        },
        metadata: {
          customerPhone,
          customerEmail,
        },
      }, request);

      await transaction.commit();

      return NextResponse.json({
        success: true,
        saleId: sale.id,
        receiptId: sale.receiptId,
        totalAmount: finalTotal,
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Sale creation error:', error);
    return NextResponse.json(
      { error: 'Failed to process sale' },
      { status: 500 }
    );
  }
}