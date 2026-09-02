import { useState, useEffect, useMemo } from 'react';
import { Decimal } from 'decimal.js';
import { X, Check, ArrowLeftRight } from 'lucide-react';
import { useCurrency } from '../hooks/useCurrency';
import { useAuth } from '../contexts/AuthContext';

interface BargainModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (nextPrice: number) => void;
    catalogPrice: number;
    productName: string;
    formatPrice: (price: number) => string;
    measurementType?: 'discrete' | 'measurable';
    baseUnit?: string;
    currentCurrency?: string;
    getRate?: (from: string, to: string) => number;
    baseCurrency?: string;
}

export default function BargainModal({
    isOpen,
    onClose,
    onConfirm,
    catalogPrice,
    productName,
    formatPrice: _formatPrice,
    measurementType,
    baseUnit,
    currentCurrency,
    getRate: propGetRate,
    baseCurrency: propBaseCurrency
}: BargainModalProps) {
    const { user } = useAuth();
    const hookCurrency = useCurrency();

    // Use props if provided (from POS terminal), fallback to hook
    const targetCurrency = currentCurrency || hookCurrency.targetCurrency;
    const getRate = propGetRate || hookCurrency.getRate;
    const baseCurrency = propBaseCurrency || hookCurrency.baseCurrency;

    const [price, setPrice] = useState('');
    const [displayCurrency, setDisplayCurrency] = useState(targetCurrency);

    // Get available currencies from branch data
    const availableCurrencies = useMemo(() => {
        const branch = (user as any)?.branch;
        const currencies = new Set<string>();
        if (branch?.currency) currencies.add(branch.currency);
        if (branch?.secondaryCurrency) currencies.add(branch.secondaryCurrency);
        // Add common regional currencies
        ['KES', 'UGX', 'TZS', 'USD'].forEach(c => currencies.add(c));
        return Array.from(currencies);
    }, [user]);

    // Convert catalog price (base currency) to display currency — stable, not tied to displayCurrency state to avoid loop
    const getConvertedCatalogPrice = (curr: string) => {
        const rate = getRate(baseCurrency, curr);
        return (catalogPrice * rate).toFixed(2);
    };

    // Only initialize on open — do not react to displayCurrency changes or rate churn
    useEffect(() => {
        if (isOpen) {
            const initCurr = targetCurrency;
            setDisplayCurrency(initCurr);
            setPrice(getConvertedCatalogPrice(initCurr));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const parsed = new Decimal(price || '0');
        if (!parsed.isNaN() && parsed.gte(0)) {
            const rate = new Decimal(getRate(baseCurrency, displayCurrency));
            const basePrice = parsed.div(rate).toDecimalPlaces(4).toNumber();
            onConfirm(basePrice);
            onClose();
        }
    };

    const handleCurrencySwitch = (newCurrency: string) => {
        if (newCurrency === displayCurrency) return;
        const curRate = new Decimal(getRate(baseCurrency, displayCurrency));
        const newRate = new Decimal(getRate(baseCurrency, newCurrency));
        const currentBasePrice = new Decimal(price || '0').div(curRate);
        const newPrice = currentBasePrice.times(newRate).toDecimalPlaces(2).toFixed(2);
        setDisplayCurrency(newCurrency);
        setPrice(newPrice);
    };

    const formatDisplayPrice = (amount: number) => {
        const rate = new Decimal(getRate(baseCurrency, displayCurrency));
        const converted = new Decimal(amount).times(rate).toDecimalPlaces(2).toNumber();
        const sym = hookCurrency.getCurrencySymbol(displayCurrency);
        const sep = sym.length > 1 ? ' ' : '';
        return `${sym}${sep}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-black text-foreground uppercase tracking-tight italic">Price<span className="text-primary not-italic">Negotiation</span></h3>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{productName}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted rounded-xl"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-secondary/30 rounded-2xl border border-border/50">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Catalog Price {measurementType === 'measurable' ? `per ${baseUnit}` : ''}</span>
                                <span className="text-sm font-black text-foreground">{formatDisplayPrice(catalogPrice)} <span className="text-[9px] text-muted-foreground">({displayCurrency})</span></span>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Negotiated Price {measurementType === 'measurable' ? `per ${baseUnit}` : ''}</label>
                                </div>
                                <div className="relative">
                                    <input
                                        autoFocus
                                        type="number"
                                        step="0.01"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className="w-full h-16 bg-background border-2 border-primary/20 rounded-2xl px-6 pr-24 text-2xl font-black text-foreground focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                        placeholder="0.00"
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                        <select
                                            value={displayCurrency}
                                            onChange={(e) => handleCurrencySwitch(e.target.value)}
                                            className="h-10 bg-secondary/50 border border-border/50 rounded-xl px-2 text-xs font-black uppercase tracking-tighter focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer hover:bg-secondary transition-colors"
                                        >
                                            {availableCurrencies.map(code => (
                                                <option key={code} value={code}>{code}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <ArrowLeftRight className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-[8px] font-bold text-muted-foreground uppercase">Switch currency converts price automatically</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted transition-all border border-border"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-[2] h-14 bg-primary text-primary-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <Check className="w-4 h-4" />
                                Apply Price
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
