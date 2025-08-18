'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/stores/useCartStore';
import { useMpesaPayment } from '@/hooks/useMpesaPayment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils/currency';
import { PaymentMethodSelector } from '@/components/payment/PaymentMethodSelector';
import { PaymentStatus } from '@/components/payment/PaymentStatus';
import { Icons } from '@/components/icons';

type PaymentStatusType = 'idle' | 'processing' | 'requires_action' | 'success' | 'error';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart, total, itemCount } = useCartStore();
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusType>('idle');
  const [orderDetails, setOrderDetails] = useState<{
    id: string;
    orderNumber: string;
    paymentMethod: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { initiatePayment, isLoading: isMpesaLoading } = useMpesaPayment({
    onSuccess: async (data) => {
      if (data.CheckoutRequestID) {
        setPaymentStatus('requires_action');
      } else {
        await completeOrder(data.method, data.CheckoutRequestID);
      }
    },
    onError: (error) => {
      setPaymentStatus('error');
      setError(error.message);
    },
  });

  const handlePayment = async (method: string, phoneNumber?: string) => {
    if (itemCount === 0) {
      setError('Your cart is empty');
      return;
    }

    setPaymentStatus('processing');
    setError(null);

    try {
      if (method === 'mpesa' && phoneNumber) {
        await initiatePayment(
          total,
          phoneNumber,
          `ORDER-${Date.now()}`,
          `Payment for ${itemCount} items`
        );
      } else if (method === 'cash') {
        await completeOrder('cash');
      } else {
        throw new Error('Unsupported payment method');
      }
    } catch (error) {
      setPaymentStatus('error');
      setError(error instanceof Error ? error.message : 'Payment failed');
    }
  };

  const completeOrder = async (paymentMethod: string, paymentReference?: string) => {
    try {
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: Object.values(items).map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            barcode: item.barcode,
          })),
          paymentMethod,
          paymentReference,
          amount: total,
          customerInfo: {
            name: customerInfo.name || 'Walk-in Customer',
            email: customerInfo.email || null,
            phone: customerInfo.phone || null,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create order');
      }

      setOrderDetails({
        id: data.orderId,
        orderNumber: data.orderNumber,
        paymentMethod,
      });
      
      setPaymentStatus('success');
      clearCart();
    } catch (error) {
      console.error('Order creation error:', error);
      setPaymentStatus('error');
      setError(error instanceof Error ? error.message : 'Failed to create order');
    }
  };

  const handleRetry = () => {
    setPaymentStatus('idle');
    setError(null);
  };

  const handleComplete = () => {
    router.push(`/orders/${orderDetails?.id}`);
  };

  if (paymentStatus !== 'idle') {
    return (
      <div className="container max-w-4xl py-12">
        <PaymentStatus
          status={paymentStatus}
          amount={total}
          method={orderDetails?.paymentMethod || 'payment'}
          error={error || undefined}
          onRetry={handleRetry}
          onComplete={handleComplete}
        />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-12">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Order Summary */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {itemCount === 0 ? (
                <div className="text-center py-8">
                  <Icons.cart className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">Your cart is empty</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add some items to your cart to proceed to checkout.
                  </p>
                  <Button className="mt-6" onClick={() => router.push('/products')}>
                    Continue Shopping
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {Object.values(items).map((item) => (
                      <div key={item.id} className="flex justify-between items-center py-2 border-b">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(item.price)} × {item.quantity}
                          </p>
                        </div>
                        <p className="font-medium">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 space-y-2 border-t pt-4">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>{formatCurrency(0)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>Total</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={customerInfo.name}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="johndoe@example.com"
                    value={customerInfo.email}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, email: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0712 345 678"
                  value={customerInfo.phone}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, phone: e.target.value })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  For order updates and receipts
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Method */}
        <div className="space-y-6">
          <PaymentMethodSelector
            amount={total}
            reference={`ORDER-${Date.now()}`}
            description={`Payment for ${itemCount} items`}
            onPaymentMethodChange={(method) => console.log('Selected method:', method)}
            onSuccess={(data) => {
              if (data.method === 'mpesa') {
                setPaymentStatus('requires_action');
              } else {
                completeOrder(data.method);
              }
            }}
            onError={(error) => {
              setPaymentStatus('error');
              setError(error.message);
            }}
          />

          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span className="text-lg">{formatCurrency(total)}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                size="lg" 
                disabled={itemCount === 0 || isMpesaLoading}
                onClick={() => {
                  // This will be handled by the PaymentMethodSelector
                }}
              >
                {isMpesaLoading ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay ${formatCurrency(total)}`
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
