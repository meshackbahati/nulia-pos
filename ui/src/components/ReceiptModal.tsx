import { useState } from 'react';
import { X, Download, Printer, Mail, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import api from '../lib/api-client';
import toast from 'react-hot-toast';
import { useCurrency } from '../hooks/useCurrency';

interface ReceiptModalProps {
    sale: {
        id?: string;
        receiptId: string;
        items: Array<{
            name: string;
            quantity: number;
            price: number;
        }>;
        subtotal: number;
        tax: number;
        total: number;
        paymentMethod: string;
    };
    companyName: string;
    onClose: () => void;
}

export default function ReceiptModal({ sale, companyName, onClose }: ReceiptModalProps) {
    const { formatPrice, symbol } = useCurrency();
    const [customerEmail, setCustomerEmail] = useState('');
    const [sending, setSending] = useState(false);

    const generatePDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header
        doc.setFontSize(20);
        doc.text(companyName, pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.text('Sales Receipt', pageWidth / 2, 30, { align: 'center' });

        // Receipt Info
        doc.setFontSize(10);
        doc.text(`Receipt #: ${sale.receiptId}`, 20, 45);
        doc.text(`Date: ${new Date().toLocaleString()}`, 20, 52);
        doc.text(`Payment: ${sale.paymentMethod.toUpperCase()}`, 20, 59);

        // Line
        doc.line(20, 65, pageWidth - 20, 65);

        // Items Header
        let y = 75;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Item', 20, y);
        doc.text('Qty', pageWidth - 80, y);
        doc.text('Price', pageWidth - 60, y);
        doc.text('Total', pageWidth - 30, y, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        y += 7;

        // Items
        sale.items.forEach((item) => {
            doc.text(item.name, 20, y);
            doc.text(item.quantity.toString(), pageWidth - 80, y);
            doc.text(`${symbol}${item.price.toFixed(2)}`, pageWidth - 60, y);
            doc.text(`${symbol}${(item.quantity * item.price).toFixed(2)}`, pageWidth - 30, y, {
                align: 'right',
            });
            y += 7;
        });

        // Line
        y += 5;
        doc.line(20, y, pageWidth - 20, y);
        y += 10;

        // Totals
        doc.text('Subtotal:', pageWidth - 80, y);
        doc.text(`${symbol}${sale.subtotal.toFixed(2)}`, pageWidth - 30, y, { align: 'right' });
        y += 7;

        doc.text('Tax (16%):', pageWidth - 80, y);
        doc.text(`${symbol}${sale.tax.toFixed(2)}`, pageWidth - 30, y, { align: 'right' });
        y += 7;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Total:', pageWidth - 80, y);
        doc.text(`${symbol}${sale.total.toFixed(2)}`, pageWidth - 30, y, { align: 'right' });

        // Footer
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('Thank you for your business!', pageWidth / 2, y + 20, {
            align: 'center',
        });

        // Save
        doc.save(`receipt-${sale.receiptId}.pdf`);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleEmailReceipt = async () => {
        if (!customerEmail) {
            toast.error('Please enter an email address');
            return;
        }

        if (!sale.id) {
            toast.error('Cannot email receipt - sale ID not found');
            return;
        }

        setSending(true);
        try {
            await api.emailReceipt(sale.id, customerEmail);
            toast.success(`Receipt emailed to ${customerEmail}`);
            setCustomerEmail('');
        } catch (error) {
            console.error('Email error:', error);
            toast.error('Failed to send email');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="bg-card rounded-2xl shadow-xl max-w-md w-full p-8 border border-border ring-1 ring-border/50">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shadow-sm ring-1 ring-inset ring-primary/20">
                            <FileText className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground">Sale Receipt</h2>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted rounded-full">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Receipt Card */}
                <div className="bg-muted/30 p-6 rounded-xl border border-border/50 mb-8 max-h-[40vh] overflow-y-auto custom-scrollbar">
                    <div className="text-center mb-6">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{companyName}</p>
                        <p className="text-xs text-muted-foreground mt-1 uppercase font-bold tracking-tight">Official Confirmation</p>
                    </div>

                    <div className="space-y-4">
                        {sale.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start text-xs border-b border-border/10 pb-2 last:border-0 last:pb-0">
                                <div className="min-w-0 pr-4">
                                    <p className="font-bold text-foreground truncate">{item.name}</p>
                                    <p className="text-muted-foreground mt-0.5">{item.quantity} units @ {formatPrice(item.price)}</p>
                                </div>
                                <span className="font-bold text-foreground">{formatPrice(item.quantity * item.price)}</span>
                            </div>
                        ))}

                        <div className="pt-4 border-t border-border space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Subtotal</span>
                                <span>{formatPrice(sale.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Tax (16%)</span>
                                <span>{formatPrice(sale.tax)}</span>
                            </div>
                            <div className="flex justify-between text-base font-bold text-foreground pt-2 border-t border-border border-dashed">
                                <span>Amount Total</span>
                                <span>{formatPrice(sale.total)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Email Section */}
                <div className="space-y-4 mb-8">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Dispatch Digitally</label>
                    <div className="flex gap-2">
                        <input
                            type="email"
                            placeholder="customer@email.com"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            className="flex-1 w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
                        />
                        <button
                            onClick={handleEmailReceipt}
                            disabled={sending || !customerEmail}
                            className="bg-primary text-primary-foreground px-4 h-10 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center shadow-sm"
                        >
                            <Mail className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Primary Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={handlePrint} className="h-11 bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground rounded-lg flex items-center justify-center gap-2 text-xs font-bold uppercase transition-colors">
                        <Printer className="w-4 h-4" /> Print
                    </button>
                    <button onClick={generatePDF} className="h-11 bg-foreground text-background hover:bg-foreground/90 flex items-center justify-center gap-2 text-xs font-bold uppercase shadow-md transition-colors">
                        <Download className="w-4 h-4" /> Export PDF
                    </button>
                </div>
            </div>
        </div>
    );
}
