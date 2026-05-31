import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api-client';

export const useCurrency = (customBranch?: any) => {
    const { user } = useAuth();
    const branch = customBranch || (user as any)?.branch;
    
    const [targetCurrency, setTargetCurrency] = useState(branch?.currency || 'KES');
    const [exchangeRates, setExchangeRates] = useState<any[]>([]);
    const [baseCurrency, setBaseCurrency] = useState('KES');

    useEffect(() => {
        fetchRates();
    }, []);
    
    useEffect(() => {
        // Update base currency from settings when available
        if (branch?.currency) {
            setBaseCurrency(branch.currency);
        }
    }, [branch]);

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
            const sym = branch.symbol || branch.currencySymbol || code;
            return {
                baseSymbol: sym,
            };
        }

        return {
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
        return getRate(baseCurrency, targetCurrency);
    }, [baseCurrency, targetCurrency, exchangeRates]);

    const getCurrencySymbol = (currencyCode: string) => {
        // First check branch settings for symbol
        if (branch && (branch.symbol || branch.currencySymbol)) {
            if (branch.currency === currencyCode) {
                return branch.symbol || branch.currencySymbol;
            }
        }
        // Fallback to currency code itself
        return currencyCode;
    };

    const formatPrice = (amount: number | undefined | null, forceCurrency?: string) => {
        const currencyToUse = forceCurrency || targetCurrency;
        const rate = forceCurrency ? getRate(baseCurrency, forceCurrency) : currentRate;
        
        const convertedAmount = (amount || 0) * rate;
        
        // Find symbol for currencyToUse
        let symbol = getCurrencySymbol(currencyToUse);

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
        baseCurrency,
        baseSymbol: branchSettings.baseSymbol,
        targetCurrency,
        setTargetCurrency,
        formatPrice,
        convertPrice,
        currentRate,
        exchangeRates,
        getCurrencySymbol,
        getRate
    };
};
