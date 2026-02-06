import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const useCurrency = (customBranch?: any) => {
    const { user } = useAuth();
    const branch = customBranch || user?.branch;

    const branchSettings = useMemo(() => {
        if (branch) {
            const code = branch.currency || 'KES';
            const sym = branch.symbol || branch.currencySymbol;
            return {
                currency: code,
                symbol: sym || code, // Fallback to code if symbol is missing
                exchangeRate: branch.exchangeRate || 1.0
            };
        }
        return {
            currency: 'KES',
            symbol: 'KES', // Default to KES
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
