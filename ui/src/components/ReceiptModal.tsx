import { useState, useEffect } from 'react';
import { Decimal } from 'decimal.js';
import { X, Download, Printer, Mail, FileText, Share2, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import api from '../lib/api-client';
import toast from 'react-hot-toast';
import { useCurrency } from '../hooks/useCurrency';
import { useHardware } from '../contexts/HardwareContext';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

interface ReceiptModalProps {
    sale: {
        id?: string;
        receiptId: string;
        items: Array<{
            name?: string;
            productName?: string;
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
        transactionCurrency?: string;
        transactionExchangeRate?: number;
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
    const { formatPrice: defaultFormatPrice, getCurrencySymbol } = useCurrency();

    const formatPrice = (amount: number) => {
        // All stored amounts are in base currency. Convert to the checkout
        // currency using the exchange rate captured at the time of sale.
        if (sale.transactionCurrency) {
            const symbol = getCurrencySymbol(sale.transactionCurrency);
            const rate = Number(sale.transactionExchangeRate || 1);
            const convertedAmount = (amount || 0) * rate;
            const separator = symbol.length > 1 ? ' ' : '';
            return `${symbol}${separator}${convertedAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })}`;
        }
        return defaultFormatPrice(amount);
    };

    const [customerEmail, setCustomerEmail] = useState('');
    const [sending, setSending] = useState(false);
    const isMobile = Capacitor.isNativePlatform();

    const { 
        defaultPrinter, 
        bluetoothPrinter,
        networkPrinter,
        paperSize, 
        isElectron: isHardwareElectron, 
        isMobile: isHardwareMobile,
        printReceipt
    } = useHardware();


    useEffect(() => {
        if (autoPrint && isHardwareElectron !== undefined) {
            const timer = setTimeout(() => {
                handlePrint();
            }, 1000); // Small delay to ensure everything is rendered
            return () => clearTimeout(timer);
        }
    }, [autoPrint, isHardwareElectron, defaultPrinter]);

    const getReceiptPDF = () => {
        const selectedSize = localStorage.getItem('receiptPaperSize') || '80mm';
        const width = selectedSize === '58mm' ? 58 : 80;

        const doc = new jsPDF({
            unit: 'mm',
            format: [width, 297] // A4 height for continuous roll
        });

        const pageWidth = width;
        const margin = 5;
        const rightAlign = pageWidth - margin;
        let y = 10;

        // Company
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(width === 58 ? 10 : 14);
        doc.text(companyName.toUpperCase(), pageWidth / 2, y, { align: 'center' });
        
        y += 6;
        doc.setFontSize(width === 58 ? 7 : 8);
        doc.setFont('helvetica', 'normal');
        doc.text('OFFICIAL TRANSACTION RECORD', pageWidth / 2, y, { align: 'center' });
        
        y += (width === 58 ? 8 : 10);
        doc.setFontSize(width === 58 ? 6 : 7);
        if (sale?.user) {
            doc.text(`SERVED BY: ${sale.user.firstName} ${sale.user.lastName}`.toUpperCase(), margin, y);
            y += 4;
        }
        doc.text(`RECEIPT: ${sale?.receiptId || 'N/A'}`, margin, y);
        y += 4;
        doc.text(`DATE: ${new Date(sale?.createdAt || Date.now()).toLocaleString()}`, margin, y);
        y += 4;
        doc.text(`METHOD: ${(sale?.paymentMethod || 'Mixed').toUpperCase()}`, margin, y);

        y += 4;
        doc.setDrawColor(200);
        doc.line(margin, y, rightAlign, y);
        y += 6;

        // Items Header
        doc.setFont('helvetica', 'bold');
        doc.text('DESCRIPTION', margin, y);
        doc.text('TOTAL', rightAlign, y, { align: 'right' });
        y += 4;
        doc.setFont('helvetica', 'normal');

        // Items
        sale.items.forEach(item => {
            const displayName = item.productName || item.name || 'Unknown Item';
            const nameLimit = width === 58 ? 18 : 25;
            const name = displayName.length > nameLimit ? displayName.substring(0, nameLimit - 3) + '...' : displayName;
            const itemPrice = item.price || item.unitPrice || 0;
            doc.text(`${item.quantity}${item.baseUnit || ''}x ${name}`, margin, y);
            doc.text(formatPrice(new Decimal(itemPrice).times(item.quantity).toNumber()), rightAlign, y, { align: 'right' });
            y += 3;

            // Show unit price and potential bargain
            let detailStr = `@ ${formatPrice(itemPrice)}`;
            if (item.catalogPrice && Number(item.catalogPrice) !== Number(itemPrice)) {
                detailStr += ` (Was ${formatPrice(item.catalogPrice)})`;
            }
            doc.setFontSize(width === 58 ? 5 : 6);
            doc.text(detailStr, margin, y);
            doc.setFontSize(width === 58 ? 6 : 7);
            y += 4;
        });

        y += 2;
        doc.line(margin, y, rightAlign, y);
        y += 6;

        // Totals
        doc.line(margin, y, rightAlign, y);
        y += 6;
        doc.text('SUBTOTAL:', margin, y);
        doc.text(formatPrice(sale?.subtotal || 0), rightAlign, y, { align: 'right' });
        y += 4;
        
        if ((sale?.tax || 0) > 0) {
            doc.text('TAX:', margin, y);
            doc.text(formatPrice(sale?.tax || 0), rightAlign, y, { align: 'right' });
            y += 4;
        }

        y += 2;
        doc.setLineWidth(0.5);
        doc.line(margin, y, rightAlign, y);
        y += 6;
        doc.setFontSize(width === 58 ? 8 : 10);
        doc.setFont('helvetica', 'bold');
        doc.text('NET TOTAL:', margin, y);
        doc.text(formatPrice(sale?.total || sale?.totalAmount || 0), rightAlign, y, { align: 'right' });

        y += 8;
        doc.setLineWidth(0.1);
        doc.setDrawColor(200);
        doc.line(margin, y, rightAlign, y);
        y += 6;

        if (sale.payments && sale.payments.length > 0) {
            doc.setFontSize(width === 58 ? 5 : 6);
            doc.setFont('helvetica', 'bold');
            doc.text('PAYMENT DETAILS:', margin, y);
            y += 3;
            doc.setFont('helvetica', 'normal');
            const transSym = sale.transactionCurrency ? getCurrencySymbol(sale.transactionCurrency) : '';
            const paSep = transSym.length > 1 ? ' ' : '';
            sale.payments.forEach(p => {
                doc.text(`${p.method.toUpperCase()}:`, margin, y);
                doc.text(`${transSym}${paSep}${p.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, rightAlign, y, { align: 'right' });
                y += 3;
            });
        }

        y += 10;
        doc.line(margin, y, rightAlign, y);
        y += 6;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('THANK YOU FOR VISITING', pageWidth / 2, y, { align: 'center' });
        y += 4;
        doc.text(companyName.toUpperCase(), pageWidth / 2, y, { align: 'center' });
        y += 6;
        doc.setFontSize(5);
        doc.setFont('helvetica', 'normal');
        doc.text('GOODS ONCE SOLD CANNOT BE RETURNED', pageWidth / 2, y, { align: 'center' });
        y += 3;
        doc.text('POWERED BY RETAILPRO POS', pageWidth / 2, y, { align: 'center' });
        
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


    const getReceiptHTML = () => {
        const itemsHtml = sale.items.map(item => {
            const itemPrice = item.price || item.unitPrice || 0;
            const displayName = item.productName || item.name || 'Unknown Item';
            return `
                <div style="margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold;">
                        <span style="text-transform: uppercase;">${displayName}</span>
                        <span>${formatPrice(new Decimal(item.quantity).times(itemPrice).toNumber())}</span>
                    </div>
                    <div style="font-size: 9px; color: #444; margin-top: 1px;">
                        ${item.quantity}${item.baseUnit || ''} x ${formatPrice(itemPrice)}
                        ${item.catalogPrice && Number(item.catalogPrice) !== Number(itemPrice) ? `<span style="text-decoration: line-through; opacity: 0.5; margin-left: 4px;">(${formatPrice(item.catalogPrice)})</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        const payTransSym = sale.transactionCurrency ? getCurrencySymbol(sale.transactionCurrency) : '';
        const paySep = payTransSym.length > 1 ? ' ' : '';
        const paymentsHtml = (sale.payments || []).map(p => `
            <div style="display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 2px;">
                <span style="text-transform: uppercase;">${p.method}</span>
                <span style="font-weight: bold;">${payTransSym}${paySep}${p.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
        `).join('');

        return `
            <div style="padding: 15px; font-family: 'Courier New', Courier, monospace; color: #000; background: #fff;">
                <div style="text-align: center; margin-bottom: 15px;">
                    <div style="font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">${companyName}</div>
                    <div style="font-size: 10px; font-weight: bold; border: 1px solid #000; display: inline-block; padding: 2px 8px; margin: 5px 0;">OFFICIAL RECEIPT</div>
                    <div style="font-size: 8px; color: #444; text-transform: uppercase; margin-top: 8px;">
                        ${new Date(sale?.createdAt || Date.now()).toLocaleString()}<br/>
                        Receipt: ${sale.receiptId}<br/>
                        Served By: ${sale.user?.firstName || ''} ${sale.user?.lastName || ''}
                    </div>
                </div>
                
                <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
                
                <div style="text-align: left; margin: 10px 0;">
                    ${itemsHtml}
                </div>
                
                <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
                
                <div style="margin: 10px 0;">
                    <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px;">
                        <span>SUBTOTAL</span>
                        <span>${formatPrice(sale.subtotal || 0)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px;">
                        <span>TAX (VAT)</span>
                        <span>${formatPrice(sale.tax || 0)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; margin-top: 8px; padding-top: 8px; border-top: 1px double #000;">
                        <span>NET TOTAL</span>
                        <span>${formatPrice(sale.total || sale.totalAmount || 0)}</span>
                    </div>
                </div>
                
                <div style="border-top: 1px dashed #000; margin: 15px 0;"></div>
                
                <div style="text-align: left; margin: 10px 0;">
                    <div style="font-size: 9px; font-weight: 900; text-transform: uppercase; margin-bottom: 6px; text-decoration: underline;">Payment Breakdown</div>
                    ${paymentsHtml}
                </div>
                
                <div style="border-top: 1px dashed #000; margin: 15px 0;"></div>
                
                <div style="text-align: center; margin-top: 15px;">
                    <div style="font-size: 10px; font-weight: 900; text-transform: uppercase;">Thank you for your business</div>
                    <div style="font-size: 12px; font-weight: 900; text-transform: uppercase; color: #000; margin: 4px 0;">${companyName}</div>
                    <div style="font-size: 7px; font-weight: bold; text-transform: uppercase; margin-top: 10px; opacity: 0.8;">Goods once sold cannot be returned</div>
                    <div style="font-size: 6px; font-weight: bold; text-transform: uppercase; margin-top: 15px; letter-spacing: 2px; opacity: 0.5;">POWERED BY RETAILPRO POS</div>
                </div>
            </div>
        `;
    };

    const handlePrint = async () => {
        const receiptData = {
            companyName,
            receiptId: sale?.receiptId || 'N/A',
            items: (sale?.items || []).map(item => ({
                name: item.productName || item.name || '',
                quantity: item.quantity,
                price: item.unitPrice || item.price || 0,
                total: (item.unitPrice || item.price || 0) * item.quantity
            })),
            subtotal: sale?.subtotal || 0,
            tax: sale?.tax || 0,
            total: sale?.total || sale?.totalAmount || 0,
            paymentMethod: sale?.paymentMethod || 'cash',
            date: sale?.createdAt ? new Date(sale.createdAt).toLocaleString() : new Date().toLocaleString(),
            cashierName: sale?.user ? `${sale.user.firstName} ${sale.user.lastName}` : undefined
        };

        if (networkPrinter || bluetoothPrinter || defaultPrinter) {
            toast.loading('Printing receipt...', { id: 'print-toast' });
            const result = await printReceipt(receiptData);
            if (result.success) {
                toast.success('Printed successfully!', { id: 'print-toast' });
                return;
            }
            toast.error(result.error || 'Print failed', { id: 'print-toast' });
        }

        if (isHardwareElectron && (window as any).electronAPI) {
            try {
                const r = await (window as any).electronAPI.printReceiptHTML(getReceiptHTML(), {
                    printerName: defaultPrinter || undefined,
                    paperSize
                });
                if (r.success) { toast.success('Printed via system!'); return; }
            } catch {}
        }

        if (isHardwareMobile) {
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
        const toastId = 'email-receipt';
        toast.loading('Sending receipt email...', { id: toastId });
        setSending(true);
        try {
            await api.emailReceipt(sale.id, customerEmail);
            toast.success(`Receipt emailed to ${customerEmail}`, { id: toastId });
            setCustomerEmail('');
        } catch (error) {
            toast.error('Failed to send email', { id: toastId });
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
                            const displayName = item.productName || item.name || 'Unknown Item';
                            return (
                                <div key={idx} className="flex justify-between items-start text-[10px]">
                                    <div className="min-w-0 pr-4">
                                        <p className="font-bold text-foreground uppercase">{displayName.substring(0, 20)}</p>
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
                                {sale.payments.map((p, idx) => {
                                    const transSymbol = sale.transactionCurrency ? getCurrencySymbol(sale.transactionCurrency) : '';
                                    const sep = transSymbol.length > 1 ? ' ' : '';
                                    return (
                                        <div key={idx} className="flex justify-between text-[9px]">
                                            <span className="uppercase">{p.method}</span>
                                            <span className="font-bold">{transSymbol}{sep}{p.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="mt-8 pt-4 border-t border-double border-black/20 dark:border-white/20 text-center space-y-1">
                            <p className="text-[8px] font-bold text-foreground uppercase tracking-widest">Thank you for visiting</p>
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">{companyName}</p>
                            <p className="text-[6px] font-bold text-muted-foreground uppercase pt-2">Goods once sold cannot be returned</p>
                            <div className="pt-4 opacity-30">
                                <p className="text-[5px] font-black text-muted-foreground uppercase tracking-[0.3em]">RetailPro POS System</p>
                            </div>
                        </div>
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
                            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={handlePrint} 
                        className="h-14 bg-secondary/50 text-foreground hover:bg-primary/20 hover:text-primary rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        {isMobile ? <Share2 className="w-5 h-5" /> : <Printer className="w-5 h-5" />}
                        {isHardwareElectron ? 'Direct Print' : (isMobile ? 'Share/Print' : 'System Print')}
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
