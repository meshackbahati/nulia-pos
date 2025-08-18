'use client';

import { useState, useCallback, useRef } from 'react';
import { paymentService, PaymentMethod, PaymentResponse } from '@/lib/payment/payment-service';
import { useCart } from '@/contexts/CartContext';
import { toast } from '@/components/ui/use-toast';
import { captureError } from '@/lib/error-handling/errorTracker';

type PaymentStatus = 'idle' | 'processing' | 'succeeded' | 'failed';

interface UsePaymentOptions {
  /** Callback when payment is successfully processed */
  onSuccess?: (response: PaymentResponse) => void;
  /** Callback when payment fails */
  onError?: (error: Error) => void;
  /** Show toast notifications */
  showNotifications?: boolean;
}

export function usePayment(options: UsePaymentOptions = {}) {
  const {
    onSuccess,
    onError,
    showNotifications = true,
  } = options;
  
  const { clearCart, getTotal } = useCart();
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [currentTransaction, setCurrentTransaction] = useState<PaymentResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const processingRef = useRef(false);
  
  /**
   * Process a payment with the selected method
   */
  const processPayment = useCallback(async (
    method: PaymentMethod,
    paymentData: {
      phoneNumber?: string;
      accountReference?: string;
      description?: string;
      metadata?: Record<string, any>;
    } = {}
  ) => {
    if (processingRef.current) return;
    
    const amount = getTotal();
    
    if (amount <= 0) {
      const error = new Error('Invalid payment amount');
      handleError(error);
      return { success: false, error };
    }
    
    processingRef.current = true;
    setStatus('processing');
    setError(null);
    
    try {
      const response = await paymentService.processPayment(method, {
        amount,
        phoneNumber: paymentData.phoneNumber,
        accountReference: paymentData.accountReference || `INV-${Date.now()}`,
        description: paymentData.description || 'POS Payment',
        metadata: {
          ...paymentData.metadata,
          timestamp: new Date().toISOString(),
        },
      });
      
      setCurrentTransaction(response);
      
      if (response.success) {
        setStatus('succeeded');
        
        // Clear cart for successful payments
        if (response.status === 'completed') {
          clearCart();
        }
        
        // Show success notification
        if (showNotifications) {
          toast({
            title: 'Payment Successful',
            description: getSuccessMessage(method, response),
            variant: 'default',
          });
        }
        
        // Call success callback
        if (onSuccess) {
          onSuccess(response);
        }
      } else {
        setStatus('failed');
        const error = new Error(response.message || 'Payment failed');
        handleError(error);
        return { success: false, error };
      }
      
      return { success: true, data: response };
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Payment processing failed');
      handleError(err);
      return { success: false, error: err };
      
    } finally {
      processingRef.current = false;
    }
  }, [getTotal, clearCart, onSuccess, showNotifications]);
  
  /**
   * Process cash payment
   */
  const processCashPayment = useCallback((amountTendered: number) => {
    const amount = getTotal();
    const change = amountTendered - amount;
    
    if (change < 0) {
      const error = new Error('Insufficient amount tendered');
      handleError(error);
      return { success: false, error };
    }
    
    return processPayment('cash', {
      metadata: {
        amountTendered,
        change,
      },
    });
  }, [getTotal, processPayment]);
  
  /**
   * Process M-Pesa STK Push payment
   */
  const processMpesaStkPush = useCallback((phoneNumber: string) => {
    return processPayment('mpesa_stk', {
      phoneNumber,
      description: 'POS Payment via M-Pesa',
    });
  }, [processPayment]);
  
  /**
   * Process M-Pesa C2B payment
   */
  const processMpesaC2B = useCallback((phoneNumber: string, accountReference?: string) => {
    return processPayment('mpesa_c2b', {
      phoneNumber,
      accountReference,
      description: 'POS Payment via M-Pesa',
    });
  }, [processPayment]);
  
  /**
   * Process card payment
   */
  const processCardPayment = useCallback((paymentMethodId: string) => {
    // In a real implementation, you would use a payment processor like Stripe
    // This is a simplified example
    return processPayment('card', {
      metadata: {
        paymentMethodId,
      },
    });
  }, [processPayment]);
  
  /**
   * Reset the payment state
   */
  const reset = useCallback(() => {
    setStatus('idle');
    setCurrentTransaction(null);
    setError(null);
    processingRef.current = false;
  }, []);
  
  /**
   * Handle errors
   */
  const handleError = useCallback((error: Error) => {
    console.error('Payment error:', error);
    setError(error);
    setStatus('failed');
    
    // Log error
    captureError(error, { context: 'usePayment' });
    
    // Show error notification
    if (showNotifications) {
      toast({
        title: 'Payment Failed',
        description: error.message || 'An error occurred while processing your payment',
        variant: 'destructive',
      });
    }
    
    // Call error callback
    if (onError) {
      onError(error);
    }
  }, [onError, showNotifications]);
  
  /**
   * Get success message for payment method
   */
  const getSuccessMessage = (method: PaymentMethod, response: PaymentResponse): string => {
    switch (method) {
      case 'mpesa_stk':
        return 'M-Pesa payment initiated. Please check your phone to complete the transaction.';
      case 'mpesa_c2b':
        return 'M-Pesa payment initiated. Please check your phone to complete the transaction.';
      case 'card':
        return 'Card payment processed successfully.';
      case 'cash':
      default:
        return 'Cash payment processed successfully.';
    }
  };
  
  return {
    // State
    status,
    isProcessing: status === 'processing',
    isSucceeded: status === 'succeeded',
    isFailed: status === 'failed',
    error,
    currentTransaction,
    
    // Methods
    processPayment,
    processCashPayment,
    processMpesaStkPush,
    processMpesaC2B,
    processCardPayment,
    reset,
  };
}
