import { useState, useEffect } from 'react';
import { X, CreditCard, DollarSign, Smartphone, ShieldCheck, Plus, Trash2, Calculator } from 'lucide-react';
import usePaystack from '../hooks/usePaystack';
import { useCurrency } from '../hooks/useCurrency';
import { useModal } from '../contexts/ModalContext';
import api from '../lib/api-client';

interface PaymentEntry {
    id: string;
    method: 'cash' | 'card' | 'mpesa' | 'mobile_money' | 'airtel' | 'mtn';
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
    cart: any[];
    branchConfig?: any;
    onClose: () => void;
    onComplete: (payments: PaymentEntry[]) => Promise<void>;
}

export default function PaymentModal({ total, cart, branchConfig, onClose, onComplete }: PaymentModalProps) {
    const { formatPrice, setTargetCurrency } = useCurrency(branchConfig);
    const { showAlert } = useModal();
    const [entries, setEntries] = useState<PaymentEntry[]>([]);
    const [availableRates, setAvailableRates] = useState<ExchangeRate[]>([]);
    const [currentMethod, setCurrentMethod] = useState<'cash' | 'card' | 'mpesa' | 'mobile_money' | 'airtel' | 'mtn'>('cash');
    const [currentCurrency, setCurrentCurrency] = useState(branchConfig?.currency || 'KES');

    useEffect(() => {
        setTargetCurrency(currentCurrency);
    }, [currentCurrency, setTargetCurrency]);
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
            details: (['mpesa', 'airtel', 'mtn', 'mobile_money'].includes(currentMethod)) ? { customerPhone } : {}
        };

        if (['card', 'airtel', 'mtn', 'mobile_money'].includes(currentMethod)) {
            setProcessing(true);
            const result = await payWithPaystack({
                amount: amt,
                email: 'customer@retailpro.io',
                currency: currentCurrency,
            });
            setProcessing(false);
            if (!result.success) return;
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
        <div className="fixed inset-0 bg-background/95 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
            <div className="bg-card rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.3)] max-w-5xl w-full p-8 border border-white/10 flex flex-col md:flex-row gap-8 overflow-y-auto max-h-[95vh] custom-scrollbar relative">

                {/* Floating Close Button - Highly Visible */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-3 bg-secondary/50 hover:bg-destructive/10 hover:text-destructive rounded-2xl transition-all z-[210] border border-white/5 shadow-xl"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Left Side: Summary & Entries */}
                <div className="flex-1 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-sm ring-1 ring-inset ring-primary/20">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-foreground">Checkout Hub</h2>
                        </div>
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

                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Order Summary</h3>
                            <span className="text-[10px] font-bold text-primary">{cart.length} Items</span>
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {cart.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-secondary/20 rounded-xl border border-white/5">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-bold text-foreground uppercase truncate">{item.name}</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-[9px] text-muted-foreground">{item.quantity}{item.baseUnit} × {formatPrice(item.price)}</p>
                                            {item.price !== item.catalogPrice && (
                                                <span className="text-[8px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Bargained</span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs font-black text-foreground ml-4">{formatPrice(item.price * item.quantity)}</p>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 border-t border-dashed border-white/10">
                            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-3">Payment Stack</h3>
                            {entries.length === 0 ? (
                                <div className="py-8 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-muted-foreground opacity-50">
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
                </div>

                {/* Right Side: Add Payment */}
                <div className="w-full md:w-80 space-y-6 bg-muted/20 p-6 rounded-2xl border border-border">
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-foreground uppercase">Add Entry</h3>

                        {/* Method Toggle */}
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'cash', icon: <DollarSign className="w-4 h-4" /> },
                                { id: 'card', icon: <CreditCard className="w-4 h-4" /> },
                                { id: 'mpesa', icon: <Smartphone className="w-4 h-4" /> },
                                { id: 'airtel', icon: <Smartphone className="w-4 h-4 text-red-500" /> },
                                { id: 'mtn', icon: <Smartphone className="w-4 h-4 text-yellow-500" /> },
                                { id: 'mobile_money', icon: <Smartphone className="w-4 h-4" /> }
                            ].map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setCurrentMethod(m.id as any)}
                                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${currentMethod === m.id ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-background border-border text-muted-foreground hover:border-primary/50'}`}
                                >
                                    {m.icon}
                                    <span className="text-[7px] font-black uppercase">{m.id.replace('_', ' ')}</span>
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

                        {['mpesa', 'airtel', 'mtn', 'mobile_money'].includes(currentMethod) && (
                            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Phone Number</label>
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
