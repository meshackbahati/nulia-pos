import { NextResponse } from 'next/server';
import { mpesaService } from '@/lib/payment/mpesa';
import { createClient } from '@/lib/supabase/server';

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

    const { phoneNumber, amount, reference, description } = await request.json();

    if (!phoneNumber || !amount || !reference) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate amount is a positive number
    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^(?:254|0)[17]\d{8}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use format: 07XXXXXXXX or 2547XXXXXXXX' },
        { status: 400 }
      );
    }

    // Initiate STK push
    const response = await mpesaService.stkPush(
      phoneNumber,
      amountNum,
      reference,
      description
    );

    // Log the payment attempt
    await supabase.from('payment_attempts').insert({
      user_id: user.id,
      amount: amountNum,
      reference,
      phone_number: phoneNumber,
      status: 'requested',
      provider: 'mpesa',
      provider_reference: response.CheckoutRequestID,
      metadata: {
        mpesa_response: response,
        description,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Payment request sent successfully',
      data: response,
    });
  } catch (error) {
    console.error('STK Push Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
