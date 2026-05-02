import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api-client';

export const useCurrency = (customBranch?: any) => {
    const { user } = useAuth();
    const branch = customBranch || (user as any)?.branch;
    
    const [targetCurrency, setTargetCurrency] = useState(branch?.currency || 'KES');
    const [exchangeRates, setExchangeRates] = useState<any[]>([]);

    useEffect(() => {
        fetchRates();
    }, []);

    const fetchRates = async () => {
        try {
            const res = await api.get('/exchange-rates/current');
            setExchangeRates(res.data.rates || []);
        } catch (error) {
            console.error('Error fetching rates:', error);
        }
    };

    const branchSettings = useMemo(() => {
        if (branch) {
            const code = branch.currency || 'KES';
            const sym = branch.symbol || branch.currencySymbol;
            return {
                baseCurrency: code,
                baseSymbol: sym || code,
            };
        }

        return {
            baseCurrency: 'KES',
            baseSymbol: 'KSh',
        };
    }, [branch]);

    const getRate = (from: string, to: string) => {
        if (from === to) return 1;
        const rateObj = exchangeRates.find(r => r.fromCurrency === from && r.toCurrency === to);
        if (rateObj) return parseFloat(rateObj.rate);
        
        const inverseObj = exchangeRates.find(r => r.fromCurrency === to && r.toCurrency === from);
        if (inverseObj) return 1 / parseFloat(inverseObj.rate);
        
        return 1;
    };

    const currentRate = useMemo(() => {
        return getRate(branchSettings.baseCurrency, targetCurrency);
    }, [branchSettings.baseCurrency, targetCurrency, exchangeRates]);

    const formatPrice = (amount: number | undefined | null, forceCurrency?: string) => {
        const currencyToUse = forceCurrency || targetCurrency;
        const rate = forceCurrency ? getRate(branchSettings.baseCurrency, forceCurrency) : currentRate;
        
        const convertedAmount = (amount || 0) * rate;
        
        // Find symbol for currencyToUse
        let symbol = currencyToUse;
        if (currencyToUse === 'KES') symbol = 'KSh';
        else if (currencyToUse === 'USD') symbol = '$';
        else if (currencyToUse === 'UGX') symbol = 'USh';
        else if (currencyToUse === 'TZS') symbol = 'TSh';

        const separator = symbol.length > 1 ? ' ' : '';
        
        return `${symbol}${separator}${convertedAmount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    };

    const convertPrice = (amount: number) => {
        return amount * currentRate;
    };

    return {
        ...branchSettings,
        targetCurrency,
        setTargetCurrency,
        formatPrice,
        convertPrice,
        currentRate,
        exchangeRates
    };
};
