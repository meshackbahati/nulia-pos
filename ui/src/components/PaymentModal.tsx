import { useState, useEffect } from 'react';
import { X, CreditCard, DollarSign, Smartphone, ShieldCheck, Plus, Trash2, Calculator } from 'lucide-react';
import usePaystack from '../hooks/usePaystack';
import { useCurrency } from '../hooks/useCurrency';
import { useModal } from '../contexts/ModalContext';
import api from '../lib/api-client';

interface PaymentEntry {
    id: string;
    method: 'cash' | 'card' | 'mpesa';
    currency: string;
    amount: number;
    amountInBase: number;
    exchangeRate: number;
    details?: any;
}

interface ExchangeRate {
    fromCurrency: string;
    toCurrency: string;
    rate: number;
}

interface PaymentModalProps {
    total: number; // Base currency total
    branchConfig?: any;
    onClose: () => void;
    onComplete: (payments: PaymentEntry[]) => Promise<void>;
}

export default function PaymentModal({ total, branchConfig, onClose, onComplete }: PaymentModalProps) {
    const { formatPrice } = useCurrency(branchConfig);
    const { showAlert } = useModal();
    const [entries, setEntries] = useState<PaymentEntry[]>([]);
    const [availableRates, setAvailableRates] = useState<ExchangeRate[]>([]);
    const [currentMethod, setCurrentMethod] = useState<'cash' | 'card' | 'mpesa'>('cash');
    const [currentCurrency, setCurrentCurrency] = useState(branchConfig?.currency || 'KES');
    const [inputAmount, setInputAmount] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [processing, setProcessing] = useState(false);
    const [payWithPaystack] = usePaystack();

    const taxRate = branchConfig?.taxRate || 0;
    const taxAmount = total * (taxRate / 100);
    const finalTotalBase = total + taxAmount;

    useEffect(() => {
        fetchRates();
    }, []);

    const fetchRates = async () => {
        try {
            const res = await api.get('/exchange-rates/current');
            setAvailableRates(res.data.rates.map((r: any) => ({
                fromCurrency: r.fromCurrency,
                toCurrency: r.toCurrency,
                rate: parseFloat(r.rate)
            })));
        } catch (error) {
            console.error('Error fetching rates:', error);
        }
    };

    const getRate = (from: string, to: string) => {
        if (from === to) return 1;
        const rateObj = availableRates.find(r => r.fromCurrency === from && r.toCurrency === to);
        if (rateObj) return rateObj.rate;
        // Try inverse
        const inverseObj = availableRates.find(r => r.fromCurrency === to && r.toCurrency === from);
        if (inverseObj) return 1 / inverseObj.rate;
        return 1;
    };

    const totalPaidBase = entries.reduce((acc, curr) => acc + curr.amountInBase, 0);
    const remainingBase = Math.max(0, finalTotalBase - totalPaidBase);

    const handleAddPayment = async () => {
        const amt = parseFloat(inputAmount);
        if (isNaN(amt) || amt <= 0) {
            showAlert('Invalid Amount', 'Please enter a valid amount.', 'warning');
            return;
        }

        const rate = getRate(currentCurrency, branchConfig?.currency || 'KES');
        const amountInBase = amt / rate;

        const newEntry: PaymentEntry = {
            id: Math.random().toString(36).substr(2, 9),
            method: currentMethod,
            currency: currentCurrency,
            amount: amt,
            amountInBase: amountInBase,
            exchangeRate: rate,
            details: currentMethod === 'mpesa' ? { customerPhone } : {}
        };

        if (currentMethod === 'card') {
            setProcessing(true);
            const success = await payWithPaystack({
                amount: amt,
                email: 'customer@retailpro.io',
            });
            setProcessing(false);
            if (!success) return;
        }

        setEntries([...entries, newEntry]);
        setInputAmount('');
        setCustomerPhone('');
    };

    const removeEntry = (id: string) => {
        setEntries(entries.filter(e => e.id !== id));
    };

    const finalize = async () => {
        if (totalPaidBase < finalTotalBase - 0.01) { // Small epsilon for float
            showAlert('Incomplete Payment', `Remaining balance: ${formatPrice(remainingBase)}`, 'warning');
            return;
        }
        setProcessing(true);
        try {
            await onComplete(entries);
        } catch (error) {
            console.error('Finalize payment error:', error);
        } finally {
            setProcessing(false);
        }
    };

    const suggestedAmount = (remainingBase * getRate(branchConfig?.currency || 'KES', currentCurrency)).toFixed(2);

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="bg-card rounded-2xl shadow-2xl max-w-4xl w-full p-8 border border-border flex flex-col md:flex-row gap-8 overflow-y-auto max-h-[95vh] custom-scrollbar">
                
                {/* Left Side: Summary & Entries */}
                <div className="flex-1 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-sm ring-1 ring-inset ring-primary/20">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-foreground">Split Payment</h2>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-muted rounded-full text-muted-foreground"><X /></button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-muted/30 rounded-2xl border border-border/50">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Due</p>
                            <p className="text-2xl font-black text-foreground">{formatPrice(finalTotalBase)}</p>
                        </div>
                        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20">
                            <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Remaining</p>
                            <p className="text-2xl font-black text-primary">{formatPrice(remainingBase)}</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase px-1">Payment Stack</h3>
                        {entries.length === 0 ? (
                            <div className="py-12 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-muted-foreground opacity-50">
                                <Calculator className="w-8 h-8 mb-2" />
                                <p className="text-xs font-medium">No payments added yet</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {entries.map(entry => (
                                    <div key={entry.id} className="flex items-center gap-4 p-3 bg-secondary/30 rounded-xl border border-border/50 group animate-in slide-in-from-left-2">
                                        <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-foreground shadow-sm">
                                            {entry.method === 'cash' ? <DollarSign className="w-4 h-4" /> : entry.method === 'card' ? <CreditCard className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-foreground uppercase">{entry.method} - {entry.currency}</p>
                                            <p className="text-[10px] text-muted-foreground">Rate: 1 {branchConfig?.currency} = {entry.exchangeRate} {entry.currency}</p>
                                        </div>
                                        <div className="text-right mr-2">
                                            <p className="text-sm font-bold text-foreground">{entry.amount.toLocaleString()} {entry.currency}</p>
                                            <p className="text-[10px] text-primary font-bold">≈ {formatPrice(entry.amountInBase)}</p>
                                        </div>
                                        <button onClick={() => removeEntry(entry.id)} className="p-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Add Payment */}
                <div className="w-full md:w-80 space-y-6 bg-muted/20 p-6 rounded-2xl border border-border">
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-foreground uppercase">Add Entry</h3>
                        
                        {/* Method Toggle */}
                        <div className="grid grid-cols-3 gap-2">
                            {['cash', 'card', 'mpesa'].map(m => (
                                <button
                                    key={m}
                                    onClick={() => setCurrentMethod(m as any)}
                                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${currentMethod === m ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-background border-border text-muted-foreground hover:border-primary/50'}`}
                                >
                                    {m === 'cash' ? <DollarSign className="w-4 h-4" /> : m === 'card' ? <CreditCard className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                                    <span className="text-[8px] font-black uppercase">{m}</span>
                                </button>
                            ))}
                        </div>

                        {/* Currency Select */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Currency</label>
                            <select 
                                value={currentCurrency} 
                                onChange={(e) => setCurrentCurrency(e.target.value)}
                                className="w-full h-11 bg-background border border-border rounded-xl px-3 text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
                            >
                                <option value="KES">KES (Kenya Shilling)</option>
                                <option value="USD">USD (US Dollar)</option>
                                <option value="UGX">UGX (Uganda Shilling)</option>
                                <option value="TZS">TZS (Tanzania Shilling)</option>
                            </select>
                        </div>

                        {/* Amount Input */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Amount ({currentCurrency})</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={inputAmount}
                                    onChange={(e) => setInputAmount(e.target.value)}
                                    placeholder={suggestedAmount}
                                    className="w-full h-12 bg-background border border-border rounded-xl pl-4 pr-12 text-lg font-bold focus:ring-2 focus:ring-primary outline-none"
                                />
                                <button 
                                    onClick={() => setInputAmount(suggestedAmount)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary hover:bg-primary/10 rounded-lg"
                                    title="Set remaining"
                                >
                                    <Calculator className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {currentMethod === 'mpesa' && (
                            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">M-Pesa Phone</label>
                                <input
                                    type="tel"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    placeholder="07XXXXXXXX"
                                    className="w-full h-11 bg-background border border-border rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>
                        )}

                        <button
                            onClick={handleAddPayment}
                            disabled={!inputAmount || processing}
                            className="w-full h-12 bg-foreground text-background rounded-xl font-bold uppercase text-xs hover:opacity-90 transition-all flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Add Payment
                        </button>
                    </div>

                    <div className="pt-6 border-t border-border">
                        <button
                            onClick={finalize}
                            disabled={totalPaidBase < finalTotalBase - 0.01 || processing}
                            className="w-full h-14 bg-primary text-primary-foreground rounded-xl font-black uppercase text-sm shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                        >
                            {processing ? 'EXECUTING...' : 'COMPLETE SALE'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
