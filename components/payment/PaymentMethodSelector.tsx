'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Smartphone, CreditCard, Wallet } from 'lucide-react';
import { useMpesaPayment } from '@/hooks/useMpesaPayment';

type PaymentMethod = 'mpesa' | 'card' | 'cash';

interface PaymentMethodSelectorProps {
  amount: number;
  reference: string;
  description?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  onPaymentMethodChange?: (method: PaymentMethod) => void;
}

export function PaymentMethodSelector({
  amount,
  reference,
  description,
  onSuccess,
  onError,
  onPaymentMethodChange,
}: PaymentMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('mpesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { initiatePayment, isLoading: isMpesaLoading } = useMpesaPayment({
    onSuccess: (data) => {
      setIsSubmitting(false);
      if (onSuccess) onSuccess({ ...data, method: 'mpesa' });
    },
    onError: (error) => {
      setIsSubmitting(false);
      if (onError) onError(error);
    },
  });

  const handleMethodChange = (method: PaymentMethod) => {
    setSelectedMethod(method);
    if (onPaymentMethodChange) onPaymentMethodChange(method);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (selectedMethod === 'mpesa') {
        await initiatePayment(amount, phoneNumber, reference, description);
      } else if (selectedMethod === 'card') {
        // Handle card payment
        // This would be implemented with your card payment provider
        throw new Error('Card payments are not yet implemented');
      } else if (selectedMethod === 'cash') {
        // Handle cash payment
        if (onSuccess) onSuccess({ method: 'cash', amount, reference });
      }
    } catch (error) {
      console.error('Payment error:', error);
      if (onError) onError(error instanceof Error ? error : new Error('Payment failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');
    
    // Format as 07... or 254...
    if (cleaned.startsWith('0')) {
      return cleaned.substring(0, 10); // Limit to 10 digits for 07... format
    } else if (cleaned.startsWith('254')) {
      return cleaned.substring(0, 12); // Limit to 12 digits for 254... format
    } else if (cleaned) {
      return `254${cleaned.substring(0, 9)}`; // Auto-prefix with 254 if not provided
    }
    return '';
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const isMpesaValid = selectedMethod !== 'mpesa' || (phoneNumber && (phoneNumber.startsWith('07') || phoneNumber.startsWith('254')));
  const isSubmitDisabled = isSubmitting || (selectedMethod === 'mpesa' && !isMpesaValid);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Select Payment Method</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <RadioGroup
            value={selectedMethod}
            onValueChange={(value) => handleMethodChange(value as PaymentMethod)}
            className="space-y-4"
          >
            {/* M-Pesa Option */}
            <div className="flex items-center space-x-3 p-4 border rounded-md hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="mpesa" id="mpesa" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <Smartphone className="h-5 w-5" />
                  <Label htmlFor="mpesa" className="text-base font-medium">
                    M-Pesa
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground ml-7">
                  Pay via M-Pesa STK Push
                </p>
                {selectedMethod === 'mpesa' && (
                  <div className="mt-3 ml-7 space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <span className="text-muted-foreground">+254</span>
                        </div>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="712 345 678"
                          className="pl-14"
                          value={phoneNumber}
                          onChange={handlePhoneNumberChange}
                          disabled={isSubmitting}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Enter your M-Pesa registered phone number
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Card Option (Placeholder) */}
            <div className="flex items-center space-x-3 p-4 border rounded-md opacity-50 cursor-not-allowed">
              <RadioGroupItem 
                value="card" 
                id="card" 
                className="mt-1" 
                disabled 
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <Label htmlFor="card" className="text-base font-medium">
                    Credit/Debit Card
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground ml-7">
                  Pay with card (Coming Soon)
                </p>
              </div>
            </div>

            {/* Cash Option */}
            <div className="flex items-center space-x-3 p-4 border rounded-md hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="cash" id="cash" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <Wallet className="h-5 w-5" />
                  <Label htmlFor="cash" className="text-base font-medium">
                    Cash
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground ml-7">
                  Pay with cash on delivery
                </p>
              </div>
            </div>
          </RadioGroup>

          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={isSubmitDisabled}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
