import { useState, useEffect, useMemo } from 'react';
import { X, Check } from 'lucide-react';
import { useCurrency } from '../hooks/useCurrency';

interface BargainModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (nextPrice: number) => void;
    catalogPrice: number;
    productName: string;
    formatPrice: (price: number) => string;
    measurementType?: 'discrete' | 'measurable';
    baseUnit?: string;
}

export default function BargainModal({
    isOpen,
    onClose,
    onConfirm,
    catalogPrice,
    productName,
    formatPrice,
    measurementType,
    baseUnit
}: BargainModalProps) {
    const { currentRate, targetCurrency } = useCurrency();
    const [price, setPrice] = useState('');

    // Always convert from the CATALOG price (base currency) to the target display currency.
    // `currentPrice` may already be a negotiated/bargained value, so we use catalogPrice
    // as the authoritative base for conversion.
    const convertedCatalogPrice = useMemo(() => {
        return (catalogPrice * currentRate).toFixed(2);
    }, [catalogPrice, currentRate]);

    useEffect(() => {
        if (isOpen) {
            setPrice(convertedCatalogPrice);
        }
    }, [isOpen, convertedCatalogPrice]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const parsed = parseFloat(price);
        if (!isNaN(parsed) && parsed >= 0) {
            // Convert back to base currency before confirming
            const basePrice = parsed / currentRate;
            onConfirm(basePrice);
            onClose();
        }
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
                                <span className="text-sm font-black text-foreground">{formatPrice(catalogPrice)}</span>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Negotiated Price {measurementType === 'measurable' ? `per ${baseUnit}` : ''}</label>
                                <div className="relative">
                                    <input
                                        autoFocus
                                        type="number"
                                        step="0.01"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className="w-full h-16 bg-background border-2 border-primary/20 rounded-2xl px-6 text-2xl font-black text-foreground focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                        placeholder="0.00"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black">
                                        {targetCurrency}
                                    </div>
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
