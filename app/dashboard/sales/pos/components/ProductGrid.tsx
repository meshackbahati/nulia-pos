import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { formatCurrency } from '@/lib/utils';
import { Product } from './types';

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

export function ProductGrid({ products, onAddToCart }: ProductGridProps) {
  // Handle keyboard navigation for accessibility
  const handleKeyDown = (e: React.KeyboardEvent, product: Product) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onAddToCart(product);
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {products.map((product) => (
        <div 
          key={product.id}
          onClick={() => onAddToCart(product)}
          onKeyDown={(e) => handleKeyDown(e, product)}
          className="group relative flex flex-col rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          tabIndex={0}
          aria-label={`Add ${product.name} to cart`}
        >
          {/* Product Image */}
          <div className="aspect-square w-full bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden mb-2">
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.name}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-400">
                <Icons.package className="h-10 w-10" />
              </div>
            )}
            
            {/* Out of stock overlay */}
            {product.quantity <= 0 && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md">
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                  Out of Stock
                </span>
              </div>
            )}
          </div>
          
          {/* Product Info */}
          <div className="flex-1 flex flex-col">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 h-10">
              {product.name}
            </h3>
            
            <div className="mt-1 flex items-center justify-between">
              <span className="text-sm font-medium text-primary">
                {formatCurrency(product.price, 'UGX')}
              </span>
              
              {product.quantity > 0 && (
                <span className="text-xs text-muted-foreground">
                  {product.quantity} in stock
                </span>
              )}
            </div>
            
            {/* Barcode/SKU */}
            {(product.barcode_data || product.sku) && (
              <div className="mt-1">
                <span className="text-xs text-muted-foreground truncate block">
                  {product.barcode_data || product.sku}
                </span>
              </div>
            )}
          </div>
          
          {/* Add to cart button */}
          <Button 
            type="button"
            size="sm" 
            className="mt-2 w-full bg-primary/90 hover:bg-primary text-white transition-colors"
            disabled={product.quantity <= 0}
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
          >
            <Icons.plus className="h-4 w-4 mr-1" />
            Add
          </Button>
          
          {/* Quick quantity controls (shown on hover) */}
          {product.quantity > 0 && (
            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex space-x-1">
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart(product);
                  }}
                  className="h-6 w-6 flex items-center justify-center bg-primary text-white rounded-full shadow-md hover:bg-primary/90 transition-colors"
                  aria-label={`Add ${product.name} to cart`}
                >
                  <Icons.plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
