import { useState } from 'react';
import { X, Download, Printer, Mail, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import api from '../lib/api-client';
import toast from 'react-hot-toast';

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
            doc.text(`$${item.price.toFixed(2)}`, pageWidth - 60, y);
            doc.text(`$${(item.quantity * item.price).toFixed(2)}`, pageWidth - 30, y, {
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
        doc.text(`$${sale.subtotal.toFixed(2)}`, pageWidth - 30, y, { align: 'right' });
        y += 7;

        doc.text('Tax (16%):', pageWidth - 80, y);
        doc.text(`$${sale.tax.toFixed(2)}`, pageWidth - 30, y, { align: 'right' });
        y += 7;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Total:', pageWidth - 80, y);
        doc.text(`$${sale.total.toFixed(2)}`, pageWidth - 30, y, { align: 'right' });

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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-8 border border-slate-200 dark:border-slate-800">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/40 rounded-lg flex items-center justify-center text-blue-600">
                            <FileText className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sale Receipt</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Receipt Card */}
                <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 mb-8 max-h-[40vh] overflow-y-auto custom-scrollbar">
                    <div className="text-center mb-6">
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{companyName}</p>
                        <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-tight">Official Confirmation</p>
                    </div>

                    <div className="space-y-4">
                        {sale.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start text-xs">
                                <div className="min-w-0 pr-4">
                                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                                    <p className="text-slate-400 mt-0.5">{item.quantity} units @ ${item.price.toFixed(2)}</p>
                                </div>
                                <span className="font-bold text-slate-900 dark:text-white">${(item.quantity * item.price).toFixed(2)}</span>
                            </div>
                        ))}

                        <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Subtotal</span>
                                <span>${sale.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Tax (16%)</span>
                                <span>${sale.tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white pt-2">
                                <span>Amount Total</span>
                                <span>${sale.total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Email Section */}
                <div className="space-y-4 mb-8">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Dispatch Digitally</label>
                    <div className="flex gap-2">
                        <input
                            type="email"
                            placeholder="customer@email.com"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            className="flex-1 modern-input h-10 text-xs"
                        />
                        <button
                            onClick={handleEmailReceipt}
                            disabled={sending || !customerEmail}
                            className="bg-blue-600 text-white px-4 h-10 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            <Mail className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Primary Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={handlePrint} className="h-11 modern-button bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2 text-xs font-bold uppercase">
                        <Printer className="w-4 h-4" /> Print
                    </button>
                    <button onClick={generatePDF} className="h-11 modern-button bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center gap-2 text-xs font-bold uppercase shadow-lg shadow-blue-600/10">
                        <Download className="w-4 h-4" /> Export PDF
                    </button>
                </div>
            </div>
        </div>
    );
}
