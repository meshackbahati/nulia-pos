# Barcode Scanner & Payment Integration Guide

This document provides a comprehensive guide to setting up and using the barcode scanning and payment integration features in the Bordershop POS system.

## Table of Contents
- [Barcode Scanner Integration](#barcode-scanner-integration)
  - [Supported Scanner Types](#supported-scanner-types)
  - [Network Scanner Setup](#network-scanner-setup)
  - [USB Scanner Setup](#usb-scanner-setup)
  - [Camera Scanner](#camera-scanner)
- [Payment Integration](#payment-integration)
  - [M-Pesa Setup](#m-pesa-setup)
  - [Card Payments](#card-payments)
  - [Cash Payments](#cash-payments)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

## Barcode Scanner Integration

### Supported Scanner Types

1. **Network Scanners**
   - Connect via WebSocket
   - Recommended for Android/iOS scanner apps
   - Supports real-time barcode transmission

2. **USB Scanners**
   - Plug-and-play HID devices
   - Appear as keyboard input
   - No additional drivers required for most models

3. **Camera Scanners**
   - Uses device camera
   - Built-in barcode detection
   - No additional hardware needed

### Network Scanner Setup

#### Using Barcode to PC App (Recommended)

1. Install the "Barcode to PC" app on your mobile device:
   - [Android](https://play.google.com/store/apps/details?id=com.eme.barcode.pc)
   - [iOS](https://apps.apple.com/app/barcode-to-pc-wireless/id1179750280)

2. Configure the app:
   - Set server URL to `ws://YOUR_PC_IP:8080`
   - Enable "Send as barcode"
   - Set barcode suffix to `\n` (newline)

3. Update environment variables in `.env.local`:
   ```env
   NEXT_PUBLIC_NETWORK_SCANNER_ENABLED=true
   NEXT_PUBLIC_NETWORK_SCANNER_PORT=8080
   NEXT_PUBLIC_NETWORK_SCANNER_SECRET=your_secure_secret_here
   ```

### USB Scanner Setup

1. Connect your USB barcode scanner to the computer
2. The scanner should be automatically detected as a keyboard
3. Test by scanning a barcode into a text field
4. Update environment variables in `.env.local` if needed:
   ```env
   NEXT_PUBLIC_USB_SCANNER_ENABLED=true
   ```

### Camera Scanner

The camera scanner is enabled by default. To use it:

1. Click the camera icon in the POS interface
2. Grant camera permissions when prompted
3. Position the barcode in the viewfinder
4. The scanner will automatically detect and process barcodes

## Payment Integration

### M-Pesa Setup

#### Sandbox Testing

1. Get test credentials from [Safaricom Developer Portal](https://developer.safaricom.co.ke/)
2. Update `.env.local` with your test credentials:
   ```env
   MPESA_CONSUMER_KEY=your_consumer_key
   MPESA_CONSUMER_SECRET=your_consumer_secret
   MPESA_PASSKEY=your_passkey
   MPESA_SHORTCODE=174379
   MPESA_INITIATOR_NAME=testapi
   MPESA_SECURITY_CREDENTIAL=your_security_credential
   MPESA_ENVIRONMENT=sandbox
   ```

#### Production Setup

1. Apply for production credentials from Safaricom
2. Update `.env.local` with production credentials:
   ```env
   MPESA_CONSUMER_KEY=your_prod_consumer_key
   MPESA_CONSUMER_SECRET=your_prod_consumer_secret
   MPESA_PASSKEY=your_prod_passkey
   MPESA_SHORTCODE=your_shortcode
   MPESA_INITIATOR_NAME=your_initiator_name
   MPESA_SECURITY_CREDENTIAL=your_prod_security_credential
   MPESA_ENVIRONMENT=production
   ```

### Card Payments

1. Sign up for a Stripe account at [stripe.com](https://stripe.com/)
2. Get your API keys from the Stripe Dashboard
3. Update `.env.local`:
   ```env
   STRIPE_SECRET_KEY=your_stripe_secret_key
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   ```

### Cash Payments

Cash payments are handled locally and don't require external configuration. The system will track:
- Amount tendered
- Change due
- Transaction timestamp

## Environment Variables

Copy `.env.example` to `.env.local` and update with your configuration:

```bash
cp .env.example .env.local
```

Key variables to configure:

```env
# Base URL for callbacks
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
***REMOVED***=your_database_connection_string

# M-Pesa
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_PASSKEY=your_passkey

# Stripe (for card payments)
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Scanner Settings
NEXT_PUBLIC_NETWORK_SCANNER_ENABLED=true
NEXT_PUBLIC_USB_SCANNER_ENABLED=true
```

## Troubleshooting

### Scanner Not Working

1. **Network Scanner**
   - Ensure the device is on the same network as the POS system
   - Check if the port is not blocked by firewall
   - Verify the WebSocket URL in the scanner app

2. **USB Scanner**
   - Try a different USB port
   - Test the scanner with a text editor to ensure it's working
   - Check if the scanner is in HID mode

3. **Camera Scanner**
   - Ensure camera permissions are granted
   - Check if another app is using the camera
   - Try with better lighting and clear barcodes

### Payment Issues

1. **M-Pesa STK Push Not Received**
   - Verify phone number format (should be 2547XXXXXXXX)
   - Check Safaricom account balance
   - Verify API credentials

2. **Card Payment Declined**
   - Test with Stripe test cards
   - Check Stripe Dashboard for errors
   - Verify API keys are correct

### Debugging

Enable debug mode in `.env.local`:

```env
DEBUG=true
NEXT_PUBLIC_SCANNER_DEBUG_MODE=true
LOG_LEVEL=debug
```

Check browser console and server logs for error messages.

## Support

For additional help, please contact support@bordershop.com or visit our [documentation](https://docs.bordershop.com).
