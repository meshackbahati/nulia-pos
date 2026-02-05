import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const useCurrency = () => {
    const { user } = useAuth();

    const branchSettings = useMemo(() => {
        if (user?.branch) {
            return {
                currency: user.branch.currency || 'USD',
                symbol: user.branch.currencySymbol || '$',
                exchangeRate: user.branch.exchangeRate || 1.0
            };
        }
        return {
            currency: 'USD',
            symbol: '$',
            exchangeRate: 1.0
        };
    }, [user?.branch]);

    const formatPrice = (amount: number) => {
        return `${branchSettings.symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return {
        ...branchSettings,
        formatPrice
    };
};
