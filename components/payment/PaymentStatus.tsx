'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Smartphone } from 'lucide-react';

type PaymentStatus = 'idle' | 'processing' | 'success' | 'error' | 'requires_action';

interface PaymentStatusProps {
  status: PaymentStatus;
  amount: number;
  method: string;
  error?: string;
  onRetry?: () => void;
  onComplete?: () => void;
  className?: string;
}

export function PaymentStatus({
  status,
  amount,
  method,
  error,
  onRetry,
  onComplete,
  className = '',
}: PaymentStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'processing':
        return {
          icon: <Loader2 className="h-6 w-6 animate-spin" />,
          title: 'Processing Payment',
          description: `Processing your ${method} payment of KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}. Please wait...`,
          action: null,
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="h-6 w-6 text-green-500" />,
          title: 'Payment Successful',
          description: `Your payment of KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })} via ${method} was successful.`,
          action: onComplete && (
            <Button onClick={onComplete} className="mt-4">
              Continue
            </Button>
          ),
        };
      case 'error':
        return {
          icon: <XCircle className="h-6 w-6 text-red-500" />,
          title: 'Payment Failed',
          description: error || `There was an error processing your ${method} payment.`,
          action: onRetry && (
            <Button variant="outline" onClick={onRetry} className="mt-4">
              Try Again
            </Button>
          ),
        };
      case 'requires_action':
        return {
          icon: <Smartphone className="h-6 w-6 text-blue-500" />,
          title: 'Complete Payment',
          description: `Please check your phone to complete the M-Pesa payment of KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}.`,
          action: (
            <div className="space-y-2 mt-4">
              <p className="text-sm text-muted-foreground">
                Haven't received the prompt?
              </p>
              {onRetry && (
                <Button variant="outline" onClick={onRetry} size="sm">
                  Resend Payment Request
                </Button>
              )}
            </div>
          ),
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <div className={`space-y-4 text-center ${className}`}>
      <div className="flex justify-center">
        <div className="bg-accent/20 p-4 rounded-full">
          {config.icon}
        </div>
      </div>
      <h3 className="text-lg font-medium">{config.title}</h3>
      <p className="text-muted-foreground">{config.description}</p>
      {config.action}
    </div>
  );
}

// Helper component for payment status alerts
export function PaymentAlert({
  status,
  title,
  message,
  className = '',
}: {
  status: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  className?: string;
}) {
  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'info':
      default:
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <Alert className={className}>
      <div className="flex items-start space-x-3">
        <div className="mt-0.5">
          {getStatusIcon()}
        </div>
        <div className="flex-1">
          <AlertTitle className="text-sm font-medium">{title}</AlertTitle>
          <AlertDescription className="text-sm">
            {message}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
