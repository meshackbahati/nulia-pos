import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Product } from '@/types';

interface CartItem extends Product {
  quantity: number;
  addedAt: string;
}

interface CartState {
  items: Record<string, CartItem>;
  isOffline: boolean;
  pendingSync: boolean;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setOfflineStatus: (status: boolean) => void;
  setPendingSync: (status: boolean) => void;
  processQueue: () => Promise<void>;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: {},
      isOffline: !navigator.onLine,
      pendingSync: false,
      
      addItem: (product, quantity = 1) => {
        set((state) => {
          const existingItem = state.items[product.id];
          
          if (existingItem) {
            return {
              items: {
                ...state.items,
                [product.id]: {
                  ...existingItem,
                  quantity: existingItem.quantity + quantity,
                },
              },
              pendingSync: true,
            };
          }
          
          return {
            items: {
              ...state.items,
              [product.id]: {
                ...product,
                quantity,
                addedAt: new Date().toISOString(),
              },
            },
            pendingSync: true,
          };
        });
      },
      
      removeItem: (productId) => {
        set((state) => {
          const { [productId]: _, ...remainingItems } = state.items;
          return { 
            items: remainingItems,
            pendingSync: true 
          };
        });
      },
      
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        
        set((state) => ({
          items: {
            ...state.items,
            [productId]: {
              ...state.items[productId],
              quantity,
            },
          },
          pendingSync: true,
        }));
      },
      
      clearCart: () => {
        set({ items: {}, pendingSync: true });
      },
      
      setOfflineStatus: (status) => {
        set({ isOffline: status });
      },
      
      setPendingSync: (status) => {
        set({ pendingSync: status });
      },
      
      processQueue: async () => {
        const { pendingSync, isOffline } = get();
        
        if (!pendingSync || isOffline) return;
        
        try {
          // Here you would typically sync the cart with your backend
          // For example:
          // await syncCartWithBackend(get().items);
          
          // After successful sync, update the state
          set({ pendingSync: false });
        } catch (error) {
          console.error('Failed to process offline queue:', error);
          // You might want to retry later or show an error to the user
        }
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        isOffline: state.isOffline,
      }),
    }
  )
);

// Listen to online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useCartStore.getState().setOfflineStatus(false);
  });
  
  window.addEventListener('offline', () => {
    useCartStore.getState().setOfflineStatus(true);
  });
}
