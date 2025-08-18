import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { captureError } from '@/lib/error-handling/errorTracker';
import { toast } from '@/components/ui/use-toast';

export type PaymentMethod = 'cash' | 'card' | 'mpesa_stk' | 'mpesa_c2b';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface PaymentRequest {
  amount: number;
  phoneNumber?: string; // Required for M-Pesa
  accountReference?: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  status: PaymentStatus;
  message: string;
  data?: any;
  timestamp: number;
}

export interface MpesaCredentials {
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  shortCode: string;
  initiatorName?: string;
  securityCredential?: string;
  environment: 'sandbox' | 'production';
}

class PaymentService {
  private static instance: PaymentService;
  private mpesaCredentials: MpesaCredentials | null = {
    consumerKey: process.env.MPESA_CONSUMER_KEY || '',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
    passkey: process.env.MPESA_PASSKEY || '',
    shortCode: process.env.MPESA_SHORTCODE || '174379',
    initiatorName: process.env.MPESA_INITIATOR_NAME,
    securityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
    environment: (process.env.MPESA_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox'
  };
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  private constructor() {}

  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  public initializeMpesa(credentials: MpesaCredentials): void {
    this.mpesaCredentials = credentials;
    
    // In production, you might want to pre-fetch the access token
    if (credentials.environment === 'production') {
      this.getMpesaAccessToken().catch(error => {
        console.error('Failed to initialize M-Pesa:', error);
      });
    }
  }

  private async getMpesaAccessToken(): Promise<string> {
    if (!this.mpesaCredentials) {
      throw new Error('M-Pesa credentials not configured');
    }

    // Return cached token if it's still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(
        `${this.mpesaCredentials.consumerKey}:${this.mpesaCredentials.consumerSecret}`
      ).toString('base64');

      const response = await axios.get(
        this.getMpesaApiUrl('/oauth/v1/generate?grant_type=client_credentials'),
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      const accessToken = response.data.access_token;
      if (typeof accessToken !== 'string') {
        throw new Error('Failed to retrieve access token');
      }
      
      this.accessToken = accessToken;
      // Set token expiry to 50 minutes from now (tokens typically last 1 hour)
      this.tokenExpiry = Date.now() + 50 * 60 * 1000;

      return this.accessToken;
    } catch (error) {
      captureError(error as Error, { context: 'getMpesaAccessToken' });
      throw new Error('Failed to get M-Pesa access token');
    }
  }

  private getMpesaApiUrl(path: string): string {
    if (!this.mpesaCredentials) {
      throw new Error('M-Pesa credentials not configured');
    }

    const baseUrl =
      this.mpesaCredentials.environment === 'sandbox'
        ? 'https://sandbox.safaricom.co.ke'
        : 'https://api.safaricom.co.ke';

    return `${baseUrl}${path}`;
  }

  public async processPayment(
    method: PaymentMethod,
    paymentRequest: PaymentRequest
  ): Promise<PaymentResponse> {
    const transactionId = `TXN-${Date.now()}-${uuidv4().substring(0, 8)}`;
    
    try {
      let response: PaymentResponse;
      
      switch (method) {
        case 'mpesa_stk':
          response = await this.processMpesaStkPush(paymentRequest, transactionId);
          break;
          
        case 'mpesa_c2b':
          response = await this.processMpesaC2B(paymentRequest, transactionId);
          break;
          
        case 'card':
          response = await this.processCardPayment(paymentRequest, transactionId);
          break;
          
        case 'cash':
        default:
          response = this.processCashPayment(paymentRequest, transactionId);
          break;
      }
      
      return response;
      
    } catch (error) {
      captureError(error as Error, { 
        context: 'processPayment', 
        method,
        transactionId,
        ...paymentRequest 
      });
      
      return {
        success: false,
        transactionId,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Payment processing failed',
        timestamp: Date.now(),
      };
    }
  }
  
  private async processMpesaStkPush(
    request: PaymentRequest,
    transactionId: string
  ): Promise<PaymentResponse> {
    if (!this.mpesaCredentials) {
      throw new Error('M-Pesa credentials not configured');
    }
    
    if (!request.phoneNumber) {
      throw new Error('Phone number is required for M-Pesa payment');
    }
    
    try {
      const token = await this.getMpesaAccessToken();
      const timestamp = new Date()
        .toISOString()
        .replace(/[^0-9]/g, '')
        .slice(0, -3);
      
      const password = Buffer.from(
        `${this.mpesaCredentials.shortCode}${this.mpesaCredentials.passkey}${timestamp}`
      ).toString('base64');
      
      const phone = this.formatPhoneNumber(request.phoneNumber);
      
      const response = await axios.post(
        this.getMpesaApiUrl('/mpesa/stkpush/v1/processrequest'),
        {
          BusinessShortCode: this.mpesaCredentials.shortCode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: Math.round(request.amount),
          PartyA: phone,
          PartyB: this.mpesaCredentials.shortCode,
          PhoneNumber: phone,
          CallBackURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/mpesa/callback`,
          AccountReference: request.accountReference || `INV-${Date.now()}`,
          TransactionDesc: request.description || 'POS Payment',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      return {
        success: response.data.ResponseCode === '0',
        transactionId,
        status: response.data.ResponseCode === '0' ? 'pending' : 'failed',
        message: response.data.ResponseDescription || 'STK push initiated',
        data: response.data,
        timestamp: Date.now(),
      };
      
    } catch (error) {
      console.error('M-Pesa STK Push Error:', error);
      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Failed to initiate M-Pesa payment'
      );
    }
  }
  
  private async processMpesaC2B(
    request: PaymentRequest,
    transactionId: string
  ): Promise<PaymentResponse> {
    if (!this.mpesaCredentials) {
      throw new Error('M-Pesa credentials not configured');
    }
    
    if (!request.phoneNumber) {
      throw new Error('Phone number is required for M-Pesa payment');
    }
    
    try {
      const token = await this.getMpesaAccessToken();
      const phone = this.formatPhoneNumber(request.phoneNumber);
      
      const response = await axios.post(
        this.getMpesaApiUrl('/mpesa/c2b/v1/simulate'),
        {
          ShortCode: this.mpesaCredentials.shortCode,
          CommandID: 'CustomerPayBillOnline',
          Amount: Math.round(request.amount),
          Msisdn: phone,
          BillRefNumber: request.accountReference || `INV-${Date.now()}`,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      return {
        success: response.data.ResponseCode === '0',
        transactionId,
        status: 'pending',
        message: 'M-Pesa payment initiated',
        data: response.data,
        timestamp: Date.now(),
      };
      
    } catch (error) {
      console.error('M-Pesa C2B Error:', error);
      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Failed to process M-Pesa payment'
      );
    }
  }
  
  private async processCardPayment(
    request: PaymentRequest,
    transactionId: string
  ): Promise<PaymentResponse> {
    // In a real implementation, integrate with a payment processor like Stripe
    // This is a mock implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          transactionId,
          status: 'completed',
          message: 'Card payment processed successfully',
          timestamp: Date.now(),
        });
      }, 1000);
    });
  }
  
  private processCashPayment(
    request: PaymentRequest,
    transactionId: string
  ): PaymentResponse {
    // For cash payments, we just need to record the transaction
    return {
      success: true,
      transactionId,
      status: 'completed',
      message: 'Cash payment recorded',
      timestamp: Date.now(),
    };
  }
  
  private formatPhoneNumber(phone: string): string {
    // Format phone number to 2547XXXXXXXX
    let formatted = phone.trim().replace(/\D/g, '');
    
    if (formatted.startsWith('0')) {
      formatted = `254${formatted.substring(1)}`;
    } else if (formatted.startsWith('+')) {
      formatted = formatted.substring(1);
    } else if (formatted.startsWith('7') && formatted.length === 9) {
      formatted = `254${formatted}`;
    }
    
    if (!formatted.startsWith('254') || formatted.length !== 12) {
      throw new Error('Invalid phone number format');
    }
    
    return formatted;
  }
}

export const paymentService = PaymentService.getInstance();
