import axios from 'axios';
import crypto from 'crypto';

export interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  businessShortCode: string;
  passkey: string;
  environment: 'sandbox' | 'production';
  callbackUrl: string;
  accountReference: string;
  transactionDesc: string;
}

export interface MpesaAuthResponse {
  access_token: string;
  expires_in: string;
}

export interface MpesaStkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export class MpesaService {
  private config: MpesaConfig;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: MpesaConfig) {
    this.config = config;
  }

  private getBaseUrl(): string {
    return this.config.environment === 'sandbox'
      ? 'https://sandbox.safaricom.co.ke'
      : 'https://api.safaricom.co.ke';
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = Buffer.from(
      `${this.config.consumerKey}:${this.config.consumerSecret}`
    ).toString('base64');

    try {
      const response = await axios.get<MpesaAuthResponse>(
        `${this.getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      this.accessToken = response.data.access_token;
      // Set token expiry to 50 minutes to be safe (tokens expire after 1 hour)
      this.tokenExpiry = new Date(Date.now() + 50 * 60 * 1000);
      return this.accessToken;
    } catch (error) {
      console.error('Error getting M-Pesa access token:', error);
      throw new Error('Failed to authenticate with M-Pesa');
    }
  }

  private generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  private generatePassword(shortcode: string, passkey: string, timestamp: string): string {
    const data = `${shortcode}${passkey}${timestamp}`;
    return Buffer.from(data).toString('base64');
  }

  async stkPush(
    phoneNumber: string,
    amount: number,
    reference: string,
    description?: string
  ): Promise<MpesaStkPushResponse> {
    try {
      const token = await this.getAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(
        this.config.businessShortCode,
        this.config.passkey,
        timestamp
      );

      // Format phone number (strip + and add country code if needed)
      const formattedPhone = phoneNumber.startsWith('254')
        ? phoneNumber
        : phoneNumber.replace(/^0/, '254');

      const response = await axios.post<MpesaStkPushResponse>(
        `${this.getBaseUrl()}/mpesa/stkpush/v1/processrequest`,
        {
          BusinessShortCode: this.config.businessShortCode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: amount,
          PartyA: formattedPhone,
          PartyB: this.config.businessShortCode,
          PhoneNumber: formattedPhone,
          CallBackURL: this.config.callbackUrl,
          AccountReference: reference,
          TransactionDesc: description || this.config.transactionDesc,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('M-Pesa STK push error:', error);
      throw new Error('Failed to initiate M-Pesa payment');
    }
  }

  // Add method to validate M-Pesa callback
  validateCallback(callbackData: any): boolean {
    // Verify the callback signature
    const { passkey, businessShortCode } = this.config;
    const { Timestamp, Password, ...rest } = callbackData;
    
    // Reconstruct the expected password
    const expectedPassword = this.generatePassword(businessShortCode, passkey, Timestamp);
    
    // Verify the password matches
    if (Password !== expectedPassword) {
      return false;
    }
    
    // Add additional validation as needed
    return true;
  }
}

// Create a singleton instance
export const mpesaService = new MpesaService({
  consumerKey: process.env.MPESA_CONSUMER_KEY || '',
  consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
  businessShortCode: process.env.MPESA_BUSINESS_SHORTCODE || '',
  passkey: process.env.MPESA_PASSKEY || '',
  environment: (process.env.MPESA_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
  callbackUrl: process.env.MPESA_CALLBACK_URL || `${process.env.NEXT_PUBLIC_APP_URL}/api/mpesa/callback`,
  accountReference: 'Bordershop',
  transactionDesc: 'Payment for goods',
});
