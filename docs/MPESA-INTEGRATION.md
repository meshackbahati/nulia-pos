# M-Pesa STK Push Integration

This document provides comprehensive documentation for the M-Pesa STK Push integration in the Bordershop POS system.

## Overview

The M-Pesa integration allows customers to make payments using M-Pesa's STK Push service. When a payment is initiated, the customer receives a push notification on their phone to authorize the payment.

## Prerequisites

1. M-Pesa Developer Account (https://developer.safaricom.co.ke/)
2. Business/Organization registered with M-Pesa
3. Test credentials (for sandbox environment) or production credentials

## Environment Variables

Add the following to your `.env` file:

```env
# M-Pesa Configuration
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_BUSINESS_SHORTCODE=your_business_shortcode
MPESA_PASSKEY=your_passkey
MPESA_ENVIRONMENT=sandbox # or 'production' for live environment
NEXT_PUBLIC_APP_URL=http://localhost:3000 # Your app's base URL
MPESA_CALLBACK_URL=https://your-domain.com/api/mpesa/callback
```

## API Endpoints

### 1. Initiate STK Push

Initiates an M-Pesa STK push payment request.

**Endpoint:** `POST /api/mpesa/stk-push`

**Request Body:**
```json
{
  "phoneNumber": "254712345678", // Format: 2547... or 07...
  "amount": 100,                // Amount in KES
  "reference": "ORDER-123",     // Your internal reference
  "description": "Order #123"   // Optional description
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment request sent successfully",
  "data": {
    "MerchantRequestID": "...",
    "CheckoutRequestID": "...",
    "ResponseCode": "0",
    "ResponseDescription": "Success. Request accepted for processing",
    "CustomerMessage": "Success. Request accepted for processing"
  }
}
```

### 2. M-Pesa Callback (Webhook)

Handles callbacks from M-Pesa when a payment is processed.

**Endpoint:** `POST /api/mpesa/callback`

**Callback Payload:**
M-Pesa sends a POST request with the payment status. The system automatically processes this and updates the payment status in the database.

## React Hook

Use the `useMpesaPayment` hook to initiate payments from your React components:

```typescript
import { useMpesaPayment } from '@/hooks/useMpesaPayment';

function PaymentButton() {
  const { initiatePayment, isLoading, error } = useMpesaPayment({
    onSuccess: (data) => {
      console.log('Payment initiated:', data);
    },
    onError: (error) => {
      console.error('Payment error:', error);
    },
  });

  const handlePay = async () => {
    try {
      await initiatePayment(
        100,                // amount in KES
        '254712345678',     // customer's phone number
        'ORDER-123',        // your reference
        'Order #123'        // description
      );
    } catch (err) {
      // Handle error
    }
  };

  return (
    <button 
      onClick={handlePay}
      disabled={isLoading}
    >
      {isLoading ? 'Processing...' : 'Pay with M-Pesa'}
    </button>
  );
}
```

## Database Schema

The following tables are used for M-Pesa payments:

### `payment_attempts`
- `id` (uuid): Primary key
- `user_id` (uuid): Reference to user
- `amount` (numeric): Payment amount
- `reference` (text): Internal reference
- `phone_number` (text): Customer's phone number
- `status` (text): Payment status (requested, completed, failed)
- `provider` (text): Payment provider ('mpesa')
- `provider_reference` (text): M-Pesa's reference (CheckoutRequestID)
- `metadata` (jsonb): Additional payment data
- `created_at` (timestamp): When the payment was initiated
- `completed_at` (timestamp): When the payment was completed

### `payments`
- `id` (uuid): Primary key
- `user_id` (uuid): Reference to user
- `amount` (numeric): Payment amount
- `reference` (text): Internal reference
- `provider` (text): Payment provider
- `provider_reference` (text): Provider's reference
- `method` (text): Payment method (e.g., 'stk_push')
- `status` (text): Payment status
- `currency` (text): Currency code (e.g., 'KES')
- `metadata` (jsonb): Additional payment data
- `created_at` (timestamp): When the payment was created

## Testing

### Sandbox Environment
1. Use test credentials from the M-Pesa Developer Portal
2. Test phone numbers must be registered on the M-Pesa test environment
3. Use the sandbox URL: `https://sandbox.safaricom.co.ke`

### Test Cases
1. Successful payment
2. Insufficient funds
3. Wrong PIN
4. Timeout
5. Duplicate payment

## Troubleshooting

### Common Issues
1. **Invalid Consumer Key/Secret**
   - Verify your credentials in the M-Pesa Developer Portal
   - Ensure there are no extra spaces in the environment variables

2. **Callback Not Received**
   - Check that your server is accessible from the internet
   - Verify the callback URL is correctly configured
   - Check server logs for errors

3. **Payment Not Showing as Completed**
   - Check the `payment_attempts` and `payments` tables
   - Verify the callback is being received and processed
   - Check for any validation errors in the logs

## Security Considerations

1. Always use HTTPS in production
2. Store sensitive credentials in environment variables
3. Validate all incoming data
4. Implement rate limiting on the API endpoints
5. Log all payment activities for auditing

## Support

For issues with the M-Pesa integration, contact:
- M-Pesa Developer Support: https://developer.safaricom.co.ke/support
- Technical Team: [Your Support Email]
