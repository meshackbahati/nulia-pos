import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const useCurrency = (customBranch?: any) => {
    const { user } = useAuth();
    const branch = customBranch || user?.branch;

    const branchSettings = useMemo(() => {
        if (branch) {
            return {
                currency: branch.currency || 'USD',
                symbol: branch.symbol || branch.currencySymbol || '$',
                exchangeRate: branch.exchangeRate || 1.0
            };
        }
        return {
            currency: 'USD',
            symbol: '$',
            exchangeRate: 1.0
        };
    }, [branch]);

    const formatPrice = (amount: number) => {
        return `${branchSettings.symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return {
        ...branchSettings,
        formatPrice
    };
};
