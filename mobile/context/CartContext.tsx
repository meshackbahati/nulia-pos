import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

export interface CartItem {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    variantId?: string;
    variantName?: string;
}

interface CartContextType {
    cart: CartItem[];
    addToCart: (product: any, variant?: any) => void;
    removeFromCart: (productId: string, variantId?: string) => void;
    updateQuantity: (productId: string, variantId: string | undefined, delta: number) => void;
    clearCart: () => void;
    total: number;
    itemCount: number;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

export const useCart = () => useContext(CartContext);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);

    // Load cart from storage on mount
    useEffect(() => {
        loadCart();
    }, []);

    // Save cart to storage whenever it changes
    useEffect(() => {
        saveCart();
    }, [cart]);

    const loadCart = async () => {
        try {
            const savedCart = await SecureStore.getItemAsync('cart');
            if (savedCart) {
                setCart(JSON.parse(savedCart));
            }
        } catch (error) {
            console.error('Failed to load cart', error);
        }
    };

    const saveCart = async () => {
        try {
            await SecureStore.setItemAsync('cart', JSON.stringify(cart));
        } catch (error) {
            console.error('Failed to save cart', error);
        }
    };

    const addToCart = (product: any, variant?: any) => {
        setCart(prevCart => {
            const existingItemIndex = prevCart.findIndex(
                item => item.productId === product.id && item.variantId === variant?.id
            );

            if (existingItemIndex >= 0) {
                const newCart = [...prevCart];
                newCart[existingItemIndex].quantity += 1;
                return newCart;
            } else {
                return [...prevCart, {
                    productId: product.id,
                    name: product.name,
                    price: variant ? variant.price : product.basePrice,
                    quantity: 1,
                    variantId: variant?.id,
                    variantName: variant?.name
                }];
            }
        });
        Alert.alert('Added', `${product.name} added to cart`);
    };

    const removeFromCart = (productId: string, variantId?: string) => {
        setCart(prevCart => prevCart.filter(item => !(item.productId === productId && item.variantId === variantId)));
    };

    const updateQuantity = (productId: string, variantId: string | undefined, delta: number) => {
        setCart(prevCart => {
            return prevCart.map(item => {
                if (item.productId === productId && item.variantId === variantId) {
                    const newQuantity = Math.max(1, item.quantity + delta);
                    return { ...item, quantity: newQuantity };
                }
                return item;
            });
        });
    };

    const clearCart = () => {
        setCart([]);
    };

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, total, itemCount }}>
            {children}
        </CartContext.Provider>
    );
}
