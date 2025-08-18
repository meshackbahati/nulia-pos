import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { 
      items, 
      paymentMethod, 
      paymentReference, 
      amount, 
      customerInfo 
    } = await request.json();

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'No items in cart' },
        { status: 400 }
      );
    }

    if (!paymentMethod || !amount) {
      return NextResponse.json(
        { error: 'Missing payment information' },
        { status: 400 }
      );
    }

    // Start a transaction
    const { data: order, error: orderError } = await supabase.rpc('create_order_with_items', {
      p_user_id: user.id,
      p_payment_method: paymentMethod,
      p_payment_reference: paymentReference || null,
      p_amount: amount,
      p_customer_name: customerInfo?.name || 'Walk-in Customer',
      p_customer_phone: customerInfo?.phone || null,
      p_customer_email: customerInfo?.email || null,
      p_items: items.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
        name: item.name,
        barcode: item.barcode || null,
      })),
    });

    if (orderError) {
      console.error('Order creation error:', orderError);
      throw orderError;
    }

    // Update inventory
    const { error: inventoryError } = await supabase.rpc('update_inventory_after_order', {
      p_items: items.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
      })),
    });

    if (inventoryError) {
      console.error('Inventory update error:', inventoryError);
      // Don't fail the order if inventory update fails, just log it
    }

    // Generate receipt (in background)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/receipts/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.INTERNAL_API_KEY || '',
      },
      body: JSON.stringify({
        orderId: order.id,
        sendEmail: !!customerInfo?.email,
        sendSms: !!customerInfo?.phone,
      }),
    }).catch(error => {
      console.error('Failed to generate receipt:', error);
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
    });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create order',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
