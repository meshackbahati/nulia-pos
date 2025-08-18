import { NextResponse } from 'next/server';
import { mpesaService } from '@/lib/payment/mpesa';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = createClient();
  
  try {
    const callbackData = await request.json();
    
    // Log the raw callback for debugging
    console.log('M-Pesa Callback Received:', JSON.stringify(callbackData, null, 2));
    
    // Verify the callback is valid
    if (!mpesaService.validateCallback(callbackData.Body.stkCallback)) {
      console.error('Invalid M-Pesa callback signature');
      return NextResponse.json(
        { ResultCode: 1, ResultDesc: 'Invalid signature' },
        { status: 200 }
      );
    }

    const { Body: { stkCallback: callback } } = callbackData;
    const { CheckoutRequestID, ResultCode, CallbackMetadata } = callback;
    
    // Find the payment attempt
    const { data: paymentAttempt, error: findError } = await supabase
      .from('payment_attempts')
      .select('*')
      .eq('provider_reference', CheckoutRequestID)
      .single();

    if (findError || !paymentAttempt) {
      console.error('Payment attempt not found:', CheckoutRequestID);
      return NextResponse.json(
        { ResultCode: 1, ResultDesc: 'Payment attempt not found' },
        { status: 200 }
      );
    }

    const status = ResultCode === 0 ? 'completed' : 'failed';
    const metadata = {
      ...(paymentAttempt.metadata || {}),
      callback_data: callback,
      processed_at: new Date().toISOString(),
    };

    // Update payment attempt
    const { error: updateError } = await supabase
      .from('payment_attempts')
      .update({
        status,
        metadata,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', paymentAttempt.id);

    if (updateError) {
      console.error('Error updating payment attempt:', updateError);
    }

    // If payment was successful, create a payment record
    if (status === 'completed' && CallbackMetadata) {
      const metadataMap = new Map(
        CallbackMetadata.Item.map((item: any) => [item.Name, item.Value])
      );

      const paymentData = {
        user_id: paymentAttempt.user_id,
        amount: paymentAttempt.amount,
        reference: paymentAttempt.reference,
        provider: 'mpesa',
        provider_reference: metadataMap.get('MpesaReceiptNumber') || CheckoutRequestID,
        method: 'stk_push',
        status: 'completed',
        currency: 'KES',
        metadata: {
          phone_number: paymentAttempt.phone_number,
          receipt_number: metadataMap.get('MpesaReceiptNumber'),
          transaction_date: metadataMap.get('TransactionDate'),
          phone_number_sent: metadataMap.get('PhoneNumber'),
        },
      };

      const { error: paymentError } = await supabase
        .from('payments')
        .insert(paymentData);

      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
      }

      // TODO: Update order status or perform other business logic
    }

    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Callback processed successfully',
    });
  } catch (error) {
    console.error('Error processing M-Pesa callback:', error);
    return NextResponse.json(
      { ResultCode: 1, ResultDesc: 'Error processing callback' },
      { status: 200 }
    );
  }
}
