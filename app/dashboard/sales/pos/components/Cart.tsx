import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { formatCurrency } from '@/lib/utils';
import { CartItem } from './types';

interface CartProps {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: (paymentMethod: 'cash' | 'card' | 'mobile_money') => void;
}

export function Cart({ 
  items, 
  subtotal, 
  tax, 
  total, 
  onUpdateQuantity, 
  onRemoveItem,
  onCheckout
}: CartProps) {
  // Handle quantity change with validation
  const handleQuantityChange = (productId: string, value: string) => {
    const quantity = parseInt(value, 10);
    if (!isNaN(quantity) && quantity > 0) {
      onUpdateQuantity(productId, quantity);
    }
  };
  
  // Handle increment quantity
  const handleIncrement = (item: CartItem) => {
    onUpdateQuantity(item.product.id, item.quantity + 1);
  };
  
  // Handle decrement quantity
  const handleDecrement = (item: CartItem) => {
    if (item.quantity > 1) {
      onUpdateQuantity(item.product.id, item.quantity - 1);
    } else {
      onRemoveItem(item.product.id);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Cart Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-800">
        <h2 className="text-lg font-semibold flex items-center">
          <Icons.shoppingCart className="h-5 w-5 mr-2" />
          Cart
          {items.length > 0 && (
            <span className="ml-2 bg-primary text-white text-xs font-medium rounded-full h-5 w-5 flex items-center justify-center">
              {items.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          )}
        </h2>
      </div>
      
      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Icons.shoppingBag className="h-12 w-12 text-gray-400 mb-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Your cart is empty</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Add products to get started
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li 
                key={item.product.id}
                className="flex items-start p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              >
                <div className="flex-shrink-0 h-16 w-16 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden">
                  {item.product.image_url ? (
                    <img 
                      src={item.product.image_url} 
                      alt={item.product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                      <Icons.package className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>
                
                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex justify-between">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {item.product.name}
                    </h4>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.product.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Icons.x className="h-4 w-4" />
                      <span className="sr-only">Remove</span>
                    </button>
                  </div>
                  
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatCurrency(item.product.price, 'UGX')} each
                  </p>
                  
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleDecrement(item)}
                        className="h-8 w-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        <Icons.minus className="h-3 w-3" />
                      </button>
                      
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(item.product.id, e.target.value)}
                        className="w-12 h-8 p-0 text-center border-0 rounded-none focus-visible:ring-0"
                      />
                      
                      <button
                        type="button"
                        onClick={() => handleIncrement(item)}
                        className="h-8 w-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        <Icons.plus className="h-3 w-3" />
                      </button>
                    </div>
                    
                    <div className="font-medium">
                      {formatCurrency(item.product.price * item.quantity, 'UGX')}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Cart Summary */}
      {items.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
              <span>{formatCurrency(subtotal, 'UGX')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Tax (18%)</span>
              <span>{formatCurrency(tax, 'UGX')}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg pt-2 border-t border-gray-200 dark:border-gray-700">
              <span>Total</span>
              <span>{formatCurrency(total, 'UGX')}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Button 
              variant="default" 
              size="lg" 
              className="w-full"
              onClick={() => onCheckout('cash')}
            >
              <Icons.dollarSign className="mr-2 h-4 w-4" />
              Pay with Cash
            </Button>
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="lg"
                className="w-full"
                onClick={() => onCheckout('card')}
              >
                <Icons.creditCard className="mr-2 h-4 w-4" />
                Card
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="w-full"
                onClick={() => onCheckout('mobile_money')}
              >
                <Icons.smartphone className="mr-2 h-4 w-4" />
                Mobile Money
              </Button>
            </div>
          </div>
          
          <div className="text-center text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 text-xs border rounded bg-muted">Enter</kbd> to process barcode scans
          </div>
        </div>
      )}
    </div>
  );
}
