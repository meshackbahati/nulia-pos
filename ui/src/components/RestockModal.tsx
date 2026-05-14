import { useState } from 'react';
import { X, Save, AlertCircle, Package, Maximize } from 'lucide-react';
import api from '../lib/api-client';
import toast from 'react-hot-toast';
import BarcodeScanner from './BarcodeScanner';
import useScanDetection from '../hooks/useScanDetection';

interface Product {
    id: string;
    name: string;
    stockQuantity: number;
    sku?: string;
    barcode?: string;
    barcodes?: string[];
    measurementType?: 'discrete' | 'measurable';
    baseUnit?: string;
    purchaseUnit?: string;
    conversionFactor?: number;
}

interface RestockModalProps {
    product: Product;
    onClose: () => void;
    onSuccess: () => void;
}

export default function RestockModal({ product, onClose, onSuccess }: RestockModalProps) {
    const [quantity, setQuantity] = useState('');
    const [isPurchaseUnit, setIsPurchaseUnit] = useState(false);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    const handleScan = async (scannedBarcode: string) => {
        // Check if scanned product matches current product
        const isMatch = product.sku === scannedBarcode || 
                        product.barcode === scannedBarcode || 
                        (product.barcodes || []).includes(scannedBarcode);
        
        if (isMatch) {
            setQuantity(prev => {
                const current = parseFloat(prev) || 0;
                const delta = product.measurementType === 'measurable' ? 0.1 : 1;
                return (current + delta).toFixed(product.measurementType === 'measurable' ? 2 : 0);
            });
            toast.success(`Incremented ${product.name}`);
        } else {
            // If it doesn't match, maybe they want to bind this barcode to the product?
            if (window.confirm(`Scanned barcode (${scannedBarcode}) is not linked to ${product.name}. Link it now?`)) {
                try {
                    await api.post(`/products/${product.id}/barcodes`, { barcode: scannedBarcode });
                    toast.success('Barcode linked to product');
                    // Update local state if needed (or just let parent refresh)
                    product.barcodes = [...(product.barcodes || []), scannedBarcode];
                    setQuantity(prev => (parseInt(prev) || 0 + 1).toString());
                } catch (error) {
                    toast.error('Failed to link barcode');
                }
            }
        }
        setShowScanner(false);
    };

    useScanDetection({
        onScan: handleScan,
        minLength: 3,
        timeLimit: 50
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let qty = parseFloat(quantity);
        if (isNaN(qty) || qty <= 0) {
            toast.error('Enter valid quantity');
            return;
        }

        if (isPurchaseUnit && product.conversionFactor) {
            qty = qty * product.conversionFactor;
        }

        setLoading(true);
        try {
            await api.restockInventory({
                items: [{
                    productId: product.id,
                    quantity: qty
                }],
                reason: reason || 'Manual Restock'
            });

            toast.success('Inventory restocked');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to restock');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="bg-card rounded-2xl shadow-xl max-w-md w-full p-8 border border-border ring-1 ring-border/50">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shadow-sm ring-1 ring-inset ring-primary/20">
                            <Package className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground">Restock Inventory</h2>
                        <div className="flex items-center gap-2 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full ml-2">
                            <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div>
                            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Scanner Ready</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted rounded-full">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-blue-500/10 p-4 rounded-xl flex items-start gap-3 border border-blue-500/20">
                        <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-foreground">{product.name}</p>
                            <p className="text-[10px] uppercase font-bold text-blue-500 mt-1">Current Stock: {product.stockQuantity}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                                Inventory Input ({isPurchaseUnit ? product.purchaseUnit : (product.baseUnit || 'Units')})
                            </label>
                            <div className="flex gap-2">
                                {product.purchaseUnit && product.conversionFactor && product.conversionFactor > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setIsPurchaseUnit(!isPurchaseUnit)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-600 rounded-lg text-[10px] font-black uppercase hover:bg-amber-500/20 transition-all shadow-sm ring-1 ring-inset ring-amber-500/20"
                                    >
                                        Switch to {isPurchaseUnit ? (product.baseUnit || 'Base') : product.purchaseUnit}
                                    </button>
                                )}
                                <button 
                                    type="button"
                                    onClick={() => setShowScanner(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-[10px] font-black uppercase hover:bg-primary/20 transition-all shadow-sm ring-1 ring-inset ring-primary/20"
                                >
                                    <Maximize className="w-3 h-3" /> External HID
                                </button>
                                {!product.barcode && (
                                    <button 
                                        type="button"
                                        onClick={() => setShowScanner(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg text-[10px] font-black uppercase hover:bg-emerald-500/20 transition-all shadow-sm ring-1 ring-inset ring-emerald-500/20"
                                    >
                                        <Maximize className="w-3 h-3" /> Capture Barcode
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="relative">
                            <input
                                type="number"
                                step={isPurchaseUnit ? "1" : (product.measurementType === 'measurable' ? "0.01" : "1")}
                                min="0"
                                required
                                className="w-full h-20 rounded-2xl border-2 border-primary/20 bg-primary/5 px-4 text-center text-4xl font-black text-primary placeholder:text-primary/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 transition-all shadow-inner"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder="0"
                                autoFocus
                            />
                            {isPurchaseUnit && product.conversionFactor && quantity && (
                                <div className="absolute -bottom-6 left-0 right-0 text-center">
                                    <p className="text-[10px] font-black text-amber-600 uppercase">
                                        = {(parseFloat(quantity) * product.conversionFactor).toFixed(2)} {product.baseUnit}
                                    </p>
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] text-center text-muted-foreground font-bold uppercase italic opacity-60">Scanning with HID will automatically increment count</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Logistic Note (Optional)</label>
                        <textarea
                            className="w-full min-h-[100px] rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all resize-none"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Shipment from central hub..."
                        />
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-border">
                        <button type="button" onClick={onClose} className="flex-1 h-12 bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground rounded-lg font-bold uppercase text-xs transition-colors">CANCEL</button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-bold uppercase text-xs flex items-center justify-center gap-2 shadow-lg shadow-primary/25 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                        >
                            <Save className="w-4 h-4" />
                            {loading ? 'STORING...' : 'RESTOCK'}
                        </button>
                    </div>
                </form>
            </div>

            {showScanner && (
                <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
            )}
        </div>
    );
}
