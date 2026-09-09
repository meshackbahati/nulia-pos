# RetailPro: Configuration Instructions

RetailPro uses environment variables and dynamic database settings to manage its behavior.

## 1. Backend Configuration (`backend/.env`)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `***REMOVED***` | PostgreSQL Connection String | (Required) |
| `PORT` | API Port | `5000` |
| `***REMOVED***` | Secret for token signing | (Required) |
| `FRONTEND_URL` | URL of the UI for reset links | `http://localhost:3000` |

## 2. API Endpoint Logic

RetailPro implements a **Primary + Fallback** strategy for maximum uptime:

1.  **Primary:** `https://your-nulia.vercel.app/api`
2.  **Fallback:** `https://your-nulia.vercel.app/api`

The system automatically switches to the fallback if the primary node is unreachable.

## 3. Payment Gateway Secrets

Secrets for M-Pesa and Paystack are **NOT** stored in `.env` files. They are entered by the Admin in the **System Nucleus (Settings Page)** and stored encrypted in the database.

*   **Encryption Method:** AES-256-CBC.
*   **Decryption:** Happens on-the-fly during transaction authorization.

## 4. Multi-Currency Rounding

RetailPro handles regional currency nuances:
*   **UGX / TZS:** Automatic rounding to whole numbers for cash payments.
*   **USD:** Standard 2-decimal point precision.
*   **Daily Rates:** Managed via the Settings interface.
