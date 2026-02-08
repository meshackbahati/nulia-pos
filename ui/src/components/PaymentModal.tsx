import { useState } from 'react';
import { X, CreditCard, DollarSign, Smartphone, ShieldCheck, Percent } from 'lucide-react';
import usePaystack from '../hooks/usePaystack'; // New hook for card payments
import { useCurrency } from '../hooks/useCurrency';
import { useModal } from '../contexts/ModalContext';

interface PaymentModalProps {
    total: number;
    branchConfig?: {
        currency: string;
        secondaryCurrency?: string;
        exchangeRate: number;
        taxRate: number;
    };
    onClose: () => void;
    onComplete: (paymentMethod: string, paymentDetails?: any) => Promise<void>;
}

export default function PaymentModal({ total, branchConfig, onClose, onComplete }: PaymentModalProps) {
    const { formatPrice, symbol } = useCurrency(branchConfig);
    const { showAlert } = useModal();
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mpesa'>('cash');
    const [processing, setProcessing] = useState(false);
    const [customerPhone, setCustomerPhone] = useState('');
    const [amountReceived, setAmountReceived] = useState('');
    const [payWithPaystack] = usePaystack();

    const taxRate = branchConfig?.taxRate || 0;
    const taxAmount = total * (taxRate / 100);
    const finalTotal = total + taxAmount;

    const handleSubmit = async () => {
        setProcessing(true);

        try {
            const paymentDetails: any = {};

            if (paymentMethod === 'cash') {
                const received = parseFloat(amountReceived);
                if (received < finalTotal) {
                    showAlert('Insufficient Amount', 'The amount received is less than the total amount due. Please collect the full amount from the customer.', 'warning');
                    setProcessing(false);
                    return;
                }
                paymentDetails.amountReceived = received;
                paymentDetails.change = received - finalTotal;
            } else if (paymentMethod === 'card') {
                // Initialize Paystack
                const success = await payWithPaystack({
                    amount: finalTotal,
                    email: 'pos-customer@retailpro.com', // Placeholder if not provided
                    metadata: {
                        custom_fields: [
                            {
                                display_name: "POS Transaction",
                                variable_name: "pos_tx",
                                value: "POS"
                            }
                        ]
                    }
                });

                if (!success) {
                    setProcessing(false);
                    return;
                }
                paymentDetails.cardProcessed = true;
            } else if (paymentMethod === 'mpesa') {
                if (!customerPhone || customerPhone.length < 10) {
                    showAlert('Invalid Phone', 'Please enter a valid M-Pesa phone number (at least 10 digits).', 'warning');
                    setProcessing(false);
                    return;
                }
                paymentDetails.customerPhone = customerPhone;
            }

            await onComplete(paymentMethod, paymentDetails);
        } catch (error) {
            console.error('Payment error:', error);
            showAlert('Payment Error', 'There was an error processing the payment. Please verify the details and try again.', 'error');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="bg-card rounded-2xl shadow-xl max-w-md w-full p-8 border border-border ring-1 ring-border/50">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shadow-sm ring-1 ring-inset ring-primary/20">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">Complete Payment</h2>
                            <p className="text-xs text-muted-foreground font-medium">Secure Transaction</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted rounded-full">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Summary Display */}
                <div className="bg-muted/30 rounded-xl p-6 mb-8 text-center border border-border/50 divide-y divide-border/20">
                    <div className="pb-4">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-1">Subtotal</p>
                        <p className="text-2xl font-bold text-foreground">{formatPrice(total)}</p>
                    </div>
                    {taxRate > 0 && (
                        <div className="py-4 flex justify-between items-center bg-primary/5 px-4 rounded-lg my-2">
                            <div className="flex items-center gap-2">
                                <Percent className="w-3 h-3 text-primary" />
                                <span className="text-[10px] font-bold text-primary uppercase">Tax ({taxRate}%)</span>
                            </div>
                            <span className="text-sm font-bold text-primary">{formatPrice(taxAmount)}</span>
                        </div>
                    )}
                    <div className="pt-4">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-1">Final Amount</p>
                        <p className="text-4xl font-extrabold text-primary">{formatPrice(finalTotal)}</p>
                    </div>
                </div>

                {/* Payment Options */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                    {[
                        { id: 'cash' as const, icon: DollarSign, label: 'Cash' },
                        { id: 'card' as const, icon: CreditCard, label: 'Card' },
                        { id: 'mpesa' as const, icon: Smartphone, label: 'M-Pesa' }
                    ].map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => setPaymentMethod(opt.id)}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${paymentMethod === opt.id
                                ? 'border-primary bg-primary/10 text-primary shadow-sm'
                                : 'border-muted bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted/50'
                                }`}
                        >
                            <opt.icon className="w-6 h-6" />
                            <span className="text-[10px] font-bold uppercase">{opt.label}</span>
                        </button>
                    ))}
                </div>

                {/* Extra Intel */}
                <div className="space-y-6 mb-8">
                    {paymentMethod === 'cash' && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Cash Received</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">{symbol}</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="w-full h-14 rounded-xl border border-input bg-background pl-8 pr-4 text-xl font-bold text-foreground placeholder-muted-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
                                    value={amountReceived}
                                    onChange={(e) => setAmountReceived(e.target.value)}
                                    placeholder="0.00"
                                    autoFocus
                                />
                            </div>
                            {amountReceived && parseFloat(amountReceived) >= total && (
                                <div className="p-3 bg-emerald-500/10 rounded-lg flex justify-between items-center animate-in fade-in slide-in-from-top-2 border border-emerald-500/20">
                                    <span className="text-[10px] font-bold text-emerald-500 uppercase">Change Due</span>
                                    <span className="text-sm font-bold text-emerald-500">{formatPrice(parseFloat(amountReceived) - finalTotal)}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {paymentMethod === 'mpesa' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">STK Push Destination</label>
                                <input
                                    type="tel"
                                    className="w-full h-12 rounded-lg border border-input bg-background px-4 text-base text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    placeholder="07XXXXXXXX"
                                    autoFocus
                                />
                            </div>
                            {branchConfig?.secondaryCurrency && (
                                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                                    <p className="text-[10px] font-bold text-primary uppercase mb-1">Exchange Logic</p>
                                    <p className="text-xs font-bold text-foreground">
                                        Equivalent: {new Intl.NumberFormat(undefined, { style: 'currency', currency: branchConfig.secondaryCurrency }).format(finalTotal * branchConfig.exchangeRate)}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Confirm */}
                <div className="flex gap-4">
                    <button onClick={onClose} className="flex-1 h-12 bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground rounded-lg font-bold uppercase text-xs transition-colors">CANCEL</button>
                    <button
                        onClick={handleSubmit}
                        disabled={processing}
                        className="flex-1 h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-bold uppercase text-xs shadow-lg shadow-primary/25 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                    >
                        {processing ? 'EXECUTING...' : `AUTHORIZE ${formatPrice(finalTotal)}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
