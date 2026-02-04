import axios from 'axios';
import { encrypt, decrypt } from './encryption';
import models from '@/models';

export interface MpesaCredentials {
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  shortcode: string;
}

export interface STKPushRequest {
  phoneNumber: string;
  amount: number;
  reference: string;
  description: string;
}

export interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export class MpesaService {
  private credentials: MpesaCredentials;
  private baseUrl: string;
  private branchId: string;

  constructor(credentials: MpesaCredentials, branchId: string) {
    this.credentials = credentials;
    this.branchId = branchId;
    this.baseUrl = process.env.MPESA_ENVIRONMENT === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  private async getAccessToken(): Promise<string> {
    try {
      const auth = Buffer.from(
        `${this.credentials.consumerKey}:${this.credentials.consumerSecret}`
      ).toString('base64');

      const response = await axios.get(
        `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      return response.data.access_token;
    } catch (error) {
      console.error('Failed to get M-Pesa access token:', error);
      throw new Error('Failed to authenticate with M-Pesa');
    }
  }

  public async initiateSTKPush(request: STKPushRequest): Promise<STKPushResponse> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);

      const password = Buffer.from(
        `${this.credentials.shortcode}${this.credentials.passkey}${timestamp}`
      ).toString('base64');

      // Format phone number
      const phoneNumber = this.formatPhoneNumber(request.phoneNumber);

      const stkPushData = {
        BusinessShortCode: this.credentials.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(request.amount),
        PartyA: phoneNumber,
        PartyB: this.credentials.shortcode,
        PhoneNumber: phoneNumber,
        CallBackURL: this.generateCallbackUrl(),
        AccountReference: request.reference,
        TransactionDesc: request.description,
      };

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        stkPushData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('STK Push failed:', error);
      throw new Error('Failed to initiate M-Pesa payment');
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Convert to 254 format
    if (cleaned.startsWith('0')) {
      return '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('254')) {
      return cleaned;
    } else if (cleaned.startsWith('+254')) {
      return cleaned.substring(1);
    }

    return '254' + cleaned;
  }

  private generateCallbackUrl(): string {
    const baseUrl = process.env.MPESA_CALLBACK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://yourapp.netlify.app/.netlify/functions';
    // Ensure we point to the functions endpoint
    const url = baseUrl.includes('.netlify/functions')
      ? baseUrl
      : `${baseUrl}/.netlify/functions`;

    return `${url}/mpesa/callback`;
  }

  public static async getBranchMpesaService(branchId: string): Promise<MpesaService | null> {
    try {
      const branch: any = await models.Branch.findByPk(branchId);
      if (!branch) {
        throw new Error('Branch not found');
      }

      const credentials = branch.getMpesaCredentials();
      if (!credentials.consumerKey || !credentials.consumerSecret || !credentials.passkey) {
        // Use default credentials if branch doesn't have its own
        const defaultCredentials = {
          consumerKey: process.env.DEFAULT_MPESA_CONSUMER_KEY!,
          consumerSecret: process.env.DEFAULT_MPESA_CONSUMER_SECRET!,
          passkey: process.env.DEFAULT_MPESA_PASSKEY!,
          shortcode: process.env.DEFAULT_MPESA_SHORTCODE!,
        };

        if (!defaultCredentials.consumerKey) {
          return null;
        }

        return new MpesaService(defaultCredentials, branchId);
      }

      return new MpesaService({
        consumerKey: credentials.consumerKey!,
        consumerSecret: credentials.consumerSecret!,
        passkey: credentials.passkey!,
        shortcode: credentials.shortcode || process.env.DEFAULT_MPESA_SHORTCODE!,
      }, branchId);
    } catch (error) {
      console.error('Failed to get M-Pesa service for branch:', error);
      return null;
    }
  }
}

export default MpesaService;