import React from 'react';
import { CheckCircle2, FileText, X } from 'lucide-react';

interface PaymentSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerateReceipt: () => void;
    amount: string;
    currency: string;
    receiptId: string;
    servedBy: string;
}

export default function PaymentSuccessModal({
    isOpen,
    onClose,
    onGenerateReceipt,
    amount,
    currency,
    receiptId,
    servedBy
}: PaymentSuccessModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-md flex items-center justify-center z-[250] p-4 animate-in fade-in duration-300">
            <div className="bg-card max-w-sm w-full p-8 rounded-3xl shadow-2xl border border-primary/20 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-full transition-colors"
                >
                    <X className="w-5 h-5 text-muted-foreground" />
                </button>

                <div className="mb-6 flex justify-center">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 animate-bounce">
                        <CheckCircle2 className="w-12 h-12" />
                    </div>
                </div>

                <h2 className="text-2xl font-black text-foreground uppercase tracking-tight mb-2">Payment Received</h2>
                <p className="text-sm text-muted-foreground font-medium mb-6">The transaction has been verified and confirmed.</p>

                <div className="bg-secondary/30 rounded-2xl p-6 mb-8 space-y-3 border border-white/5">
                    <div className="flex justify-between items-center text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        <span>Total Paid</span>
                        <span className="text-foreground text-lg">{amount} {currency}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        <span>Receipt ID</span>
                        <span className="text-foreground">{receiptId}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        <span>Served By</span>
                        <span className="text-foreground">{servedBy}</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={onGenerateReceipt}
                        className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                        <FileText className="w-5 h-5" />
                        Generate Receipt
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full h-12 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Close & New Sale
                    </button>
                </div>
            </div>
        </div>
    );
}
