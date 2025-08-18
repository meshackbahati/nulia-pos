'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icons } from '@/components/icons';
import { Cart } from './components/Cart';
import { ProductGrid } from './components/ProductGrid';
import { CartItem, Product } from './types';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

export default function PointOfSalePage() {
  const router = useRouter();
  const supabase = createClient();
  
  // State for cart and products
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  
  // Fetch products and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch products with inventory > 0
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .gt('quantity', 0)
          .eq('is_active', true);
          
        if (productsError) throw productsError;
        
        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('product_categories')
          .select('id, name')
          .order('name');
          
        if (categoriesError) throw categoriesError;
        
        setProducts(productsData || []);
        setCategories([{ id: 'all', name: 'All Products' }, ...(categoriesData || [])]);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load products. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        product.barcode_data?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = activeCategory === 'all' || product.category_id === activeCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  // Add item to cart
  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      
      if (existingItem) {
        // If item already in cart, increase quantity if stock allows
        if (existingItem.quantity < product.quantity) {
          return prevCart.map(item =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        } else {
          toast({
            title: 'Stock limit reached',
            description: `Only ${product.quantity} items available in stock.`,
            variant: 'destructive',
          });
          return prevCart;
        }
      } else {
        // Add new item to cart
        if (product.quantity > 0) {
          return [...prevCart, { product, quantity: 1 }];
        } else {
          toast({
            title: 'Out of stock',
            description: 'This product is currently out of stock.',
            variant: 'destructive',
          });
          return prevCart;
        }
      }
    });
  };
  
  // Update cart item quantity
  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    if (newQuantity > product.quantity) {
      toast({
        title: 'Stock limit reached',
        description: `Only ${product.quantity} items available in stock.`,
        variant: 'destructive',
      });
      return;
    }
    
    setCart(prevCart =>
      prevCart.map(item =>
        item.product.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };
  
  // Remove item from cart
  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };
  
  // Calculate cart totals
  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const taxRate = 0.18; // 18% tax rate (adjust as needed)
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  
  // Handle checkout
  const handleCheckout = async (paymentMethod: 'cash' | 'card' | 'mobile_money') => {
    if (cart.length === 0) {
      toast({
        title: 'Empty cart',
        description: 'Please add items to the cart before checkout.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Create sale record
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([{
          subtotal,
          tax_amount: tax,
          total,
          payment_method: paymentMethod,
          payment_status: 'completed',
          status: 'completed',
          items: cart.map(item => ({
            product_id: item.product.id,
            quantity: item.quantity,
            unit_price: item.product.price,
            total_price: item.product.price * item.quantity,
          })),
        }])
        .select()
        .single();
        
      if (saleError) throw saleError;
      
      // Update inventory for each item in the cart
      for (const item of cart) {
        const { error: inventoryError } = await supabase.rpc('update_inventory', {
          p_product_id: item.product.id,
          p_quantity: -item.quantity, // Negative because we're reducing stock
          p_transaction_type: 'sale',
          p_reference: `Sale #${sale.invoice_number || sale.id}`,
          p_notes: `Sold ${item.quantity} units`,
        });
        
        if (inventoryError) throw inventoryError;
      }
      
      // Show success message and clear cart
      toast({
        title: 'Sale completed',
        description: `Sale #${sale.invoice_number || sale.id} has been processed.`,
      });
      
      // Clear cart
      setCart([]);
      
      // Open receipt in new tab
      window.open(`/dashboard/sales/receipts/${sale.id}`, '_blank');
      
    } catch (error) {
      console.error('Error processing sale:', error);
      toast({
        title: 'Error',
        description: 'Failed to process sale. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  // Handle barcode scan
  const handleBarcodeScan = useCallback((barcode: string) => {
    const product = products.find(p => 
      p.barcode_data === barcode || p.sku === barcode
    );
    
    if (product) {
      addToCart(product);
      // Play a sound or show visual feedback
      const audio = new Audio('/sounds/beep.mp3');
      audio.play().catch(() => {});
    } else {
      toast({
        title: 'Product not found',
        description: 'No product found with this barcode.',
        variant: 'destructive',
      });
    }
  }, [products]);
  
  // Set up barcode scanner listener
  useEffect(() => {
    let barcode = '';
    let lastKeyTime = 0;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if input is focused to avoid interfering with text input
      if (document.activeElement?.tagName === 'INPUT') return;
      
      const currentTime = new Date().getTime();
      
      // If time between keypresses is too long, reset barcode
      if (currentTime - lastKeyTime > 100) {
        barcode = '';
      }
      
      lastKeyTime = currentTime;
      
      // Only process alphanumeric keys
      if (e.key.length === 1 || e.key === 'Enter') {
        if (e.key === 'Enter') {
          // Process the barcode when Enter is pressed
          if (barcode.length >= 3) { // Minimum barcode length
            handleBarcodeScan(barcode);
          }
          barcode = '';
        } else {
          // Add the key to the barcode
          barcode += e.key;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleBarcodeScan]);
  
  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Point of Sale</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
              <Icons.arrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/sales')}>
              <Icons.list className="mr-2 h-4 w-4" />
              Sales History
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Products Panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search and Categories */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
              <div className="max-w-7xl mx-auto">
                <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icons.search className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        type="text"
                        placeholder="Search products by name, SKU, or barcode..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <div className="flex space-x-2 overflow-x-auto pb-1">
                      {categories.map((category) => (
                        <Button
                          key={category.id}
                          variant={activeCategory === category.id ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setActiveCategory(category.id)}
                          className="whitespace-nowrap"
                        >
                          {category.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Products Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Icons.spinner className="h-8 w-8 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Loading products...</span>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Icons.packageSearch className="h-12 w-12 text-gray-400 mb-2" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">No products found</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchQuery 
                      ? 'No products match your search. Try a different term.'
                      : 'No products available in this category.'}
                  </p>
                </div>
              ) : (
                <ProductGrid 
                  products={filteredProducts} 
                  onAddToCart={addToCart} 
                />
              )}
            </div>
          </div>
          
          {/* Cart Panel */}
          <div className="w-96 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
            <Cart 
              items={cart}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeFromCart}
              subtotal={subtotal}
              tax={tax}
              total={total}
              onCheckout={handleCheckout}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
