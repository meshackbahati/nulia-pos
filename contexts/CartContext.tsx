'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { useScanner } from '@/hooks/useScanner';
import { toast } from '@/components/ui/use-toast';
import { BarcodeScanResult } from '@/lib/barcode-utils';
import { captureError } from '@/lib/error-handling/errorTracker';
import { findProductByBarcode } from '@/lib/services/sales-service';

// Types
type Product = {
  id: string;
  barcode: string;
  name: string;
  price: number;
  image?: string;
  category?: string;
};

type CartItem = {
  product: Product;
  quantity: number;
  addedAt: number;
};

type CartState = {
  items: CartItem[];
  total: number;
  itemCount: number;
  discount: number;
  taxRate: number;
  isOpen: boolean;
  lastScannedItem: CartItem | null;
};

type CartAction =
  | { type: 'ADD_ITEM'; payload: { product: Product; quantity?: number } }
  | { type: 'REMOVE_ITEM'; payload: { productId: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { productId: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_CART' }
  | { type: 'APPLY_DISCOUNT'; payload: { amount: number } }
  | { type: 'SET_TAX_RATE'; payload: { rate: number } };

type CartContextType = {
  state: CartState;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  applyDiscount: (amount: number) => void;
  setTaxRate: (rate: number) => void;
  getSubtotal: () => number;
  getTax: () => number;
  getTotal: () => number;
  getItemCount: () => number;
};

// Initial state
const initialState: CartState = {
  items: [],
  total: 0,
  itemCount: 0,
  discount: 0,
  taxRate: 0.0, // 0% tax rate as default
  isOpen: false,
  lastScannedItem: null,
};

// Create context
const CartContext = createContext<CartContextType | undefined>(undefined);

// Reducer function
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { product, quantity = 1 } = action.payload;
      const existingItemIndex = state.items.findIndex(item => item.product.id === product.id);
      
      let newItems;
      
      if (existingItemIndex >= 0) {
        // Update quantity if item exists
        newItems = [...state.items];
        newItems[existingItemIndex] = {
          ...newItems[existingItemIndex],
          quantity: newItems[existingItemIndex].quantity + quantity,
        };
      } else {
        // Add new item
        const newItem: CartItem = {
          product,
          quantity,
          addedAt: Date.now(),
        };
        newItems = [...state.items, newItem];
      }
      
      return {
        ...state,
        items: newItems,
        lastScannedItem: newItems[existingItemIndex >= 0 ? existingItemIndex : newItems.length - 1],
      };
    }
    
    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.product.id !== action.payload.productId);
      return {
        ...state,
        items: newItems,
        lastScannedItem: null,
      };
    }
    
    case 'UPDATE_QUANTITY': {
      const { productId, quantity } = action.payload;
      if (quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(item => item.product.id !== productId),
          lastScannedItem: null,
        };
      }
      
      return {
        ...state,
        items: state.items.map(item =>
          item.product.id === productId ? { ...item, quantity } : item
        ),
      };
    }
    
    case 'CLEAR_CART':
      return { ...initialState };
      
    case 'TOGGLE_CART':
      return { ...state, isOpen: !state.isOpen };
      
    case 'APPLY_DISCOUNT':
      return { ...state, discount: Math.max(0, action.payload.amount) };
      
    case 'SET_TAX_RATE':
      return { ...state, taxRate: Math.max(0, action.payload.rate) };
      
    default:
      return state;
  }
}

// Provider component
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  
  // Calculate derived state
  const getSubtotal = useCallback(() => {
    return state.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
  }, [state.items]);
  
  const getTax = useCallback(() => {
    return getSubtotal() * state.taxRate;
  }, [getSubtotal, state.taxRate]);
  
  const getTotal = useCallback(() => {
    return getSubtotal() + getTax() - state.discount;
  }, [getSubtotal, getTax, state.discount]);
  
  const getItemCount = useCallback(() => {
    return state.items.reduce((count, item) => count + item.quantity, 0);
  }, [state.items]);
  
  // Action creators
  const addItem = useCallback((product: Product, quantity: number = 1) => {
    dispatch({ type: 'ADD_ITEM', payload: { product, quantity } });
    
    // Show toast notification
    toast({
      title: 'Added to Cart',
      description: `${quantity}x ${product.name} added to cart`,
      variant: 'default',
    });
  }, []);
  
  const removeItem = useCallback((productId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { productId } });
  }, []);
  
  const updateQuantity = useCallback((productId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { productId, quantity } });
  }, []);
  
  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
  }, []);
  
  const toggleCart = useCallback(() => {
    dispatch({ type: 'TOGGLE_CART' });
  }, []);
  
  const applyDiscount = useCallback((amount: number) => {
    dispatch({ type: 'APPLY_DISCOUNT', payload: { amount } });
  }, []);
  
  const setTaxRate = useCallback((rate: number) => {
    dispatch({ type: 'SET_TAX_RATE', payload: { rate } });
  }, []);
  
  // Set up barcode scanner integration
  const handleBarcodeScan = useCallback(async (result: BarcodeScanResult) => {
    try {
      const product = await findProductByBarcode(result.code);
      
      if (product) {
        addItem(product, 1);
      } else {
        toast({
          title: 'Product Not Found',
          description: `No product found with barcode: ${result.code}`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      captureError(error as Error, { context: 'handleBarcodeScan' });
      toast({
        title: 'Error',
        description: 'Failed to add product to cart',
        variant: 'destructive',
      });
    }
  }, [addItem]);
  
  // Initialize scanner
  useScanner({
    onScan: handleBarcodeScan,
    showNotifications: false, // We handle our own notifications
  });
  
  // Context value
  const contextValue: CartContextType = {
    state: {
      ...state,
      total: getTotal(),
      itemCount: getItemCount(),
    },
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    toggleCart,
    applyDiscount,
    setTaxRate,
    getSubtotal,
    getTax,
    getTotal,
    getItemCount,
  };
  
  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

// Custom hook for using the cart
export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

// Helper hook for cart summary
export function useCartSummary() {
  const { state, getSubtotal, getTax, getTotal, getItemCount } = useCart();
  
  return {
    subtotal: getSubtotal(),
    tax: getTax(),
    total: getTotal(),
    discount: state.discount,
    taxRate: state.taxRate,
    itemCount: getItemCount(),
    isEmpty: state.items.length === 0,
  };
}
