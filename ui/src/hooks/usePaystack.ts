import { useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api-client';

interface PaystackOptions {
    amount: number;
    email: string;
    metadata?: any;
}

export default function usePaystack() {
    const payWithPaystack = useCallback(async (options: PaystackOptions): Promise<boolean> => {
        return new Promise(async (resolve) => {
            // Check if Paystack script is loaded
            if (!(window as any).PaystackPop) {
                toast.error('Paystack library not loaded. Please check your internet connection.');
                resolve(false);
                return;
            }

            try {
                // Fetch public key from backend
                const response = await api.get('/paystack/config');
                const publicKey = response.data.publicKey;

                if (!publicKey) {
                    toast.error('Paystack public key is not configured.');
                    resolve(false);
                    return;
                }

                const handler = (window as any).PaystackPop.setup({
                    key: publicKey,
                    email: options.email,
                    amount: Math.round(options.amount * 100), // Paystack expects amount in sub-units (e.g., kobo/cents)
                    currency: 'KES', // Defaulting to KES for regional compatibility
                    metadata: options.metadata,
                    callback: function (response: any) {
                        toast.success('Payment successful! Reference: ' + response.reference);
                        resolve(true);
                    },
                    onClose: function () {
                        toast.error('Payment window closed.');
                        resolve(false);
                    },
                });

                handler.openIframe();
            } catch (error) {
                console.error('Paystack initialization error:', error);
                toast.error('Failed to initialize Paystack.');
                resolve(false);
            }
        });
    }, []);

    return [payWithPaystack] as const;
}
