import { useState, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';

interface MpesaPaymentOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useMpesaPayment(options: MpesaPaymentOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const initiatePayment = useCallback(
    async (amount: number, phoneNumber: string, reference: string, description?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/mpesa/stk-push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phoneNumber,
            amount,
            reference,
            description,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to initiate M-Pesa payment');
        }

        toast({
          title: 'Payment Request Sent',
          description: 'Please check your phone to complete the M-Pesa payment',
          variant: 'default',
        });

        if (options.onSuccess) {
          options.onSuccess(data);
        }

        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Payment failed');
        setError(error);
        
        toast({
          title: 'Payment Error',
          description: error.message,
          variant: 'destructive',
        });

        if (options.onError) {
          options.onError(error);
        }
        
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  return {
    initiatePayment,
    isLoading,
    error,
  };
}

export default useMpesaPayment;
