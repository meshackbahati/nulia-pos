import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const useCurrency = (customBranch?: any) => {
    const { user } = useAuth();
    // Use custom branch if provided, otherwise user's branch
    const branch = customBranch || (user as any)?.branch;

    const branchSettings = useMemo(() => {
        if (branch) {
            const code = branch.currency || 'KES';
            const sym = branch.symbol || branch.currencySymbol;
            return {
                currency: code,
                symbol: sym || code,
                exchangeRate: branch.exchangeRate || 1.0
            };
        }

        // Fallback to Global Settings from localStorage (cached by SettingsPage or App)
        // We will try to read 'globalSettings' if available, otherwise default.
        try {
            const stored = localStorage.getItem('globalSettings');
            if (stored) {
                const s = JSON.parse(stored);
                if (s.currency) {
                    return {
                        currency: s.currency.base || 'KES',
                        symbol: s.currency.symbol || 'KSh',
                        exchangeRate: parseFloat(s.currency.defaultRate) || 1.0
                    };
                }
            }
        } catch (e) {
            // ignore
        }

        return {
            currency: 'KES',
            symbol: 'KSh', // Default to KSh as requested
            exchangeRate: 1.0
        };
    }, [branch]);

    const formatPrice = (amount: number | undefined | null) => {
        const s = branchSettings.symbol;
        if (amount === undefined || amount === null || isNaN(amount)) {
            return `${s} 0.00`;
        }
        const separator = s.length > 2 ? ' ' : ''; // Add space for codes like KES, none for $
        return `${s}${separator}${amount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    };

    return {
        ...branchSettings,
        formatPrice
    };
};
