# Paystack Integration & Configuration Guide

RetailPro supports Paystack as a primary payment gateway for processing card and mobile money transactions across Africa (Nigeria, Ghana, Kenya, and South Africa).

## 1. Prerequisites
*   A **Paystack Account** (Live or Test).
*   API keys from the [Paystack Dashboard](https://dashboard.paystack.com/#/settings/developer).

## 2. Admin Configuration
Navigate to the **System Nucleus (Settings Page)** in the RetailPro dashboard.

1.  Select the **Paystack Infrastructure** tab under "Payment Gateways".
2.  Enter your keys:
    *   **Public Key**: Used by the frontend/POS to initialize transactions. (Example: `pk_live_...` or `pk_test_...`)
    *   **Secret Key**: Used by the backend to verify transactions and process refunds. (Example: `sk_live_...` or `sk_test_...`)
3.  Click **Authorize Sync** at the bottom of the page to save.

> [!IMPORTANT]
> **Encryption Security**: All keys are encrypted using AES-256-CBC before being stored in the database. Only authorized backend nodes can decrypt them during transaction processing.

## 3. Webhook Configuration (Optional but Recommended)
For real-time payment status updates, configure your Paystack Webhook URL:

*   **Webhook URL**: `https://your-nulia.vercel.app/api/payments/paystack/webhook`
*   **Events to Listen for**: `charge.success`, `transfer.success`.

## 4. Operational Nuances
*   **Currency Matching**: Ensure your Paystack account supports the currency configured for your branch (e.g., KES, GHS, NGN).
*   **Rounding**: Paystack requires amounts in the smallest currency unit (e.g., Kobo for NGN, Cents for USD). RetailPro handles this conversion automatically.
