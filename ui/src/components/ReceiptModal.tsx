import { useState, useEffect } from 'react';
import { Decimal } from 'decimal.js';
import { X, Download, Printer, Mail, FileText, Share2 } from 'lucide-react';
import jsPDF from 'jspdf';
import api from '../lib/api-client';
import toast from 'react-hot-toast';
import { useCurrency } from '../hooks/useCurrency';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

interface ReceiptModalProps {
    sale: {
        id?: string;
        receiptId: string;
        items: Array<{
            name: string;
            quantity: number;
            price?: number;
            unitPrice?: number;
            catalogPrice?: number;
            baseUnit?: string;
        }>;
        payments?: Array<{
            paidAmount: number;
            paidCurrency: string;
            method: string;
        }>;
        subtotal?: number;
        tax?: number;
        total?: number;
        totalAmount?: number;
        paymentMethod?: string;
        createdAt?: string;
        user?: {
            firstName: string;
            lastName: string;
        };
    };
    companyName: string;
    onClose: () => void;
    autoPrint?: boolean;
}

export default function ReceiptModal({ sale, companyName, onClose, autoPrint = false }: ReceiptModalProps) {
    const { formatPrice } = useCurrency();
    const [customerEmail, setCustomerEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [isElectron, setIsElectron] = useState(false);
    const isMobile = Capacitor.isNativePlatform();

    useEffect(() => {
        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.indexOf(' electron/') > -1) {
            setIsElectron(true);
        }
    }, []);

    useEffect(() => {
        if (autoPrint) {
            const checkPrinters = async () => {
                if (isElectron && (window as any).electronAPI) {
                    try {
                        const printers = await (window as any).electronAPI.getPrinters();
                        const hasThermal = printers.some((p: any) =>
                            p.name.toLowerCase().includes('thermal') ||
                            p.name.toLowerCase().includes('pos') ||
                            p.name.toLowerCase().includes('58mm') ||
                            p.name.toLowerCase().includes('80mm')
                        );
                        if (hasThermal) {
                            toast.success('Thermal printer detected, auto-generating receipt...', { icon: '🖨️' });
                        }
                    } catch (err) {
                        console.error('Failed to check printers:', err);
                    }
                }
                handlePrint();
            };
            checkPrinters();
        }
    }, [autoPrint, isElectron]);

    const getReceiptPDF = () => {
        const doc = new jsPDF({
            unit: 'mm',
            format: [80, 200]
        });

        const pageWidth = 80;
        let y = 10;

        // Company
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(companyName.toUpperCase(), pageWidth / 2, y, { align: 'center' });
        
        y += 6;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('OFFICIAL TRANSACTION RECORD', pageWidth / 2, y, { align: 'center' });
        
        y += 10;
        doc.setFontSize(7);
        if (sale?.user) {
            doc.text(`SERVED BY: ${sale.user.firstName} ${sale.user.lastName}`.toUpperCase(), 5, y);
            y += 4;
        }
        doc.text(`RECEIPT: ${sale?.receiptId || 'N/A'}`, 5, y);
        y += 4;
        doc.text(`DATE: ${new Date(sale?.createdAt || Date.now()).toLocaleString()}`, 5, y);
        y += 4;
        doc.text(`METHOD: ${(sale?.paymentMethod || 'Mixed').toUpperCase()}`, 5, y);

        y += 4;
        doc.setDrawColor(200);
        doc.line(5, y, 75, y);
        y += 6;

        // Items Header
        doc.setFont('helvetica', 'bold');
        doc.text('DESCRIPTION', 5, y);
        doc.text('TOTAL', 75, y, { align: 'right' });
        y += 4;
        doc.setFont('helvetica', 'normal');

        // Items
        sale.items.forEach(item => {
            const name = item.name.length > 25 ? item.name.substring(0, 22) + '...' : item.name;
            const itemPrice = item.price || item.unitPrice || 0;
            doc.text(`${item.quantity}${item.baseUnit || ''}x ${name}`, 5, y);
            doc.text(formatPrice(new Decimal(itemPrice).times(item.quantity).toNumber()), 75, y, { align: 'right' });
            y += 3;

            // Show unit price and potential bargain
            let detailStr = `@ ${formatPrice(itemPrice)}`;
            if (item.catalogPrice && Number(item.catalogPrice) !== Number(itemPrice)) {
                detailStr += ` (Was ${formatPrice(item.catalogPrice)})`;
            }
            doc.setFontSize(6);
            doc.text(detailStr, 5, y);
            doc.setFontSize(7);
            y += 4;
        });

        y += 2;
        doc.line(5, y, 75, y);
        y += 6;

        // Totals
        doc.text('SUBTOTAL:', 5, y);
        doc.text(formatPrice(sale?.subtotal || 0), 75, y, { align: 'right' });
        y += 4;
        
        if ((sale?.tax || 0) > 0) {
            doc.text('TAX:', 5, y);
            doc.text(formatPrice(sale?.tax || 0), 75, y, { align: 'right' });
            y += 4;
        }

        y += 2;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('NET TOTAL:', 5, y);
        doc.text(formatPrice(sale?.total || sale?.totalAmount || 0), 75, y, { align: 'right' });

        y += 6;
        if (sale.payments && sale.payments.length > 0) {
            doc.setFontSize(6);
            doc.setFont('helvetica', 'bold');
            doc.text('PAYMENT DETAILS:', 5, y);
            y += 3;
            doc.setFont('helvetica', 'normal');
            sale.payments.forEach(p => {
                doc.text(`${p.method.toUpperCase()}:`, 5, y);
                doc.text(`${p.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${p.paidCurrency}`, 75, y, { align: 'right' });
                y += 3;
            });
        }

        y += 10;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text('THANK YOU FOR VISITING', pageWidth / 2, y, { align: 'center' });
        y += 4;
        doc.text('RETAILPRO NODE v2.0', pageWidth / 2, y, { align: 'center' });
        
        return doc;
    };

    const handleDownload = () => {
        const doc = getReceiptPDF();
        doc.save(`receipt-${sale.receiptId}.pdf`);
        toast.success('Receipt Saved');
    };

    const handleShare = async () => {
        if (!isMobile) return;
        
        try {
            const doc = getReceiptPDF();
            const pdfBase64 = doc.output('datauristring').split(',')[1];
            const fileName = `receipt-${sale.receiptId}.pdf`;
            
            const result = await Filesystem.writeFile({
                path: fileName,
                data: pdfBase64,
                directory: Directory.Cache
            });
            
            await Share.share({
                title: 'RetailPro Receipt',
                text: `Receipt for ${sale.receiptId}`,
                url: result.uri,
                dialogTitle: 'Share Receipt (Send to Thermal Printer)',
            });
        } catch (err) {
            console.error('Share failed:', err);
            toast.error('Sharing not supported');
        }
    };

    const handlePrint = async () => {
        if (isElectron && (window as any).electronAPI) {
            toast.loading('Sending to printer...', { id: 'print-toast' });
            try {
                const result = await (window as any).electronAPI.printReceipt({
                    printerName: localStorage.getItem('defaultPrinter') || undefined
                });
                if (result.success) toast.success('Printing...', { id: 'print-toast' });
                else throw new Error(result.error);
            } catch (err: any) {
                toast.error('Printer link failed, using system print', { id: 'print-toast' });
                window.print();
            }
        } else if (isMobile) {
            handleShare();
        } else {
            window.print();
        }
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
            toast.error('Failed to send email');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-xl flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
            <div className="glass-card max-w-md w-full p-8 shadow-2xl border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                
                <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-widest text-foreground">Sale Record</h2>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Transaction Verified</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-secondary/50 rounded-2xl transition-all"><X className="w-5 h-5" /></button>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-inner border border-black/5 dark:border-white/5 mb-8 font-mono">
                    <div className="text-center mb-6 space-y-1">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground">{companyName}</p>
                        {sale?.user && (
                            <p className="text-[8px] text-muted-foreground uppercase font-bold">Served By: {sale.user.firstName} {sale.user.lastName}</p>
                        )}
                        <p className="text-[8px] text-muted-foreground uppercase font-bold">Node Identity: {sale?.receiptId || 'OFFLINE'}</p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between text-[10px] text-muted-foreground border-b border-dashed pb-2 mb-2">
                            <span>Description</span>
                            <span>Value</span>
                        </div>
                        {sale.items.map((item, idx) => {
                            const itemPrice = item.price || item.unitPrice || 0;
                            return (
                                <div key={idx} className="flex justify-between items-start text-[10px]">
                                    <div className="min-w-0 pr-4">
                                        <p className="font-bold text-foreground uppercase">{item.name.substring(0, 20)}</p>
                                        <div className="flex items-center gap-1">
                                            <p className="text-[8px] text-muted-foreground">{item.quantity}{item.baseUnit || ''} @ {formatPrice(itemPrice)}</p>
                                            {item.catalogPrice && Number(item.catalogPrice) !== Number(itemPrice) && (
                                                <p className="text-[7px] text-muted-foreground/50 line-through italic">({formatPrice(item.catalogPrice)})</p>
                                            )}
                                        </div>
                                    </div>
                                    <span className="font-bold text-foreground">{formatPrice(new Decimal(item.quantity).times(itemPrice).toNumber())}</span>
                                </div>
                            );
                        })}

                        <div className="pt-4 border-t border-dashed border-black/10 dark:border-white/10 space-y-1">
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>Subtotal</span>
                                <span>{formatPrice(sale?.subtotal || 0)}</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>Tax Load</span>
                                <span>{formatPrice(sale?.tax || 0)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-black text-primary pt-2 mt-2 border-t border-black/5 dark:border-white/5">
                                <span className="uppercase">Net Total</span>
                                <span>{formatPrice(sale?.total || sale?.totalAmount || 0)}</span>
                            </div>
                        </div>

                        {sale.payments && sale.payments.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-dashed border-black/10 dark:border-white/10 space-y-1">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Payment Breakdown</p>
                                {sale.payments.map((p, idx) => (
                                    <div key={idx} className="flex justify-between text-[9px]">
                                        <span className="uppercase">{p.method}</span>
                                        <span className="font-bold">{p.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {p.paidCurrency}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4 mb-8">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Dispatch Digitally</label>
                    <div className="flex gap-3">
                        <input
                            type="email"
                            placeholder="RECIPIENT@RETAILPRO.IO"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            className="glass-input flex-1 h-12 px-4 text-[10px] font-bold uppercase tracking-widest focus:ring-primary/30 outline-none"
                        />
                        <button
                            onClick={handleEmailReceipt}
                            disabled={sending || !customerEmail}
                            className="bg-primary text-primary-foreground w-12 h-12 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center shadow-lg shadow-primary/20"
                        >
                            <Mail className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={handlePrint} 
                        className="h-14 bg-secondary/50 text-foreground hover:bg-primary/20 hover:text-primary rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        {isMobile ? <Share2 className="w-5 h-5" /> : <Printer className="w-5 h-5" />}
                        {isElectron ? 'Direct Print' : (isMobile ? 'Share/Print' : 'System Print')}
                    </button>
                    <button 
                        onClick={handleDownload} 
                        className="h-14 bg-foreground text-background hover:bg-foreground/90 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        <Download className="w-5 h-5" /> Generate PDF Receipt
                    </button>
                </div>
            </div>
        </div>
    );
}
