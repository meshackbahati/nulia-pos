import { useState } from 'react';
import { X, CreditCard, DollarSign, Smartphone } from 'lucide-react';

interface PaymentModalProps {
    total: number;
    branchConfig?: {
        currency: string;
        secondaryCurrency?: string;
        exchangeRate: number;
    };
    onClose: () => void;
    onComplete: (paymentMethod: string, paymentDetails?: any) => Promise<void>;
}

export default function PaymentModal({ total, branchConfig, onClose, onComplete }: PaymentModalProps) {
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mpesa'>('cash');
    const [processing, setProcessing] = useState(false);
    const [customerPhone, setCustomerPhone] = useState('');
    const [amountReceived, setAmountReceived] = useState('');

    const handleSubmit = async () => {
        setProcessing(true);

        try {
            const paymentDetails: any = {};

            if (paymentMethod === 'cash') {
                const received = parseFloat(amountReceived);
                if (received < total) {
                    alert('Amount received is less than total!');
                    setProcessing(false);
                    return;
                }
                paymentDetails.amountReceived = received;
                paymentDetails.change = received - total;
            } else if (paymentMethod === 'mpesa') {
                if (!customerPhone || customerPhone.length < 10) {
                    alert('Please enter a valid phone number');
                    setProcessing(false);
                    return;
                }
                paymentDetails.customerPhone = customerPhone;
            }

            await onComplete(paymentMethod, paymentDetails);
        } catch (error) {
            console.error('Payment error:', error);
            alert('Payment failed. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-8 border border-slate-200 dark:border-slate-800">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Complete Payment</h2>
                        <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-wider">Checkout Terminal</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Total Display */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 mb-8 text-center border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">Payable Total</p>
                    <p className="text-4xl font-extrabold text-blue-600">${total.toFixed(2)}</p>
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
                                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                                    : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:border-slate-200 dark:hover:border-slate-700'
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
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Cash Received</label>
                            <input
                                type="number"
                                step="0.01"
                                className="modern-input h-12 text-lg font-bold"
                                value={amountReceived}
                                onChange={(e) => setAmountReceived(e.target.value)}
                                placeholder="0.00"
                                autoFocus
                            />
                            {amountReceived && parseFloat(amountReceived) >= total && (
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex justify-between items-center animate-in">
                                    <span className="text-[10px] font-bold text-green-600 uppercase">Change Due</span>
                                    <span className="text-sm font-bold text-green-600">${(parseFloat(amountReceived) - total).toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {paymentMethod === 'mpesa' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">STK Push Destination</label>
                                <input
                                    type="tel"
                                    className="modern-input h-12"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    placeholder="07XXXXXXXX"
                                    autoFocus
                                />
                            </div>
                            {branchConfig?.secondaryCurrency === 'KES' && (
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/40">
                                    <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Exchange Logic</p>
                                    <p className="text-xs font-medium text-blue-800 dark:text-blue-300">
                                        Amount: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KES' }).format(total * branchConfig.exchangeRate)}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Confirm */}
                <div className="flex gap-4">
                    <button onClick={onClose} className="flex-1 h-12 modern-button bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">CANCEL</button>
                    <button
                        onClick={handleSubmit}
                        disabled={processing}
                        className="flex-1 h-12 modern-button bg-blue-600 text-white font-bold disabled:opacity-50 shadow-lg shadow-blue-600/20"
                    >
                        {processing ? 'EXECUTING...' : `AUTHORIZE $${total.toFixed(2)}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
