import { useState } from 'react';
import { X, Save, AlertCircle, Package, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import api from '../lib/api-client';
import toast from 'react-hot-toast';
import LoadingButton from './LoadingButton';

interface Product {
    id: string;
    name: string;
    stockQuantity: number;
    sku?: string;
    measurementType?: 'discrete' | 'measurable';
    baseUnit?: string;
}

interface InventoryAdjustModalProps {
    product: Product;
    onClose: () => void;
    onSuccess: () => void;
}

export default function InventoryAdjustModal({ product, onClose, onSuccess }: InventoryAdjustModalProps) {
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [direction, setDirection] = useState<'add' | 'remove'>('add');

    const qtyNum = parseFloat(quantity) || 0;
    const adjustedStock = direction === 'add'
        ? product.stockQuantity + qtyNum
        : product.stockQuantity - qtyNum;

    const handleSubmit = async () => {

        if (!qtyNum || qtyNum <= 0) {
            toast.error('Enter a valid quantity');
            return;
        }

        if (direction === 'remove' && adjustedStock < 0) {
            toast.error(`Cannot reduce stock below 0. Current: ${product.stockQuantity}`);
            return;
        }

        setLoading(true);
        try {
            const adjQty = direction === 'remove' ? -qtyNum : qtyNum;
            await api.adjustInventory({
                items: [{ productId: product.id, quantity: adjQty }],
                reason: reason || `Manual ${direction === 'add' ? 'addition' : 'adjustment'}`
            });

            toast.success(`Stock ${direction === 'add' ? 'increased' : 'reduced'} by ${qtyNum}`);
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to adjust inventory');
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
                        <h2 className="text-xl font-bold text-foreground">Adjust Stock</h2>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted rounded-full">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="bg-blue-500/10 p-4 rounded-xl flex items-start gap-3 border border-blue-500/20">
                        <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-foreground">{product.name}</p>
                            <p className="text-[10px] uppercase font-bold text-blue-500 mt-1">
                                Current Stock: {product.stockQuantity} {product.baseUnit || 'Units'}
                            </p>
                            {qtyNum > 0 && (
                                <p className="text-[10px] uppercase font-bold text-amber-500 mt-1">
                                    After: {adjustedStock} {product.baseUnit || 'Units'}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Direction Toggle */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setDirection('add')}
                            className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${direction === 'add'
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
                                }`}
                        >
                            <ArrowUpCircle className="w-4 h-4" /> Add Stock
                        </button>
                        <button
                            type="button"
                            onClick={() => setDirection('remove')}
                            className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${direction === 'remove'
                                ? 'bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20'
                                : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
                                }`}
                        >
                            <ArrowDownCircle className="w-4 h-4" /> Remove Stock
                        </button>
                    </div>

                    {/* Quantity Input */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                            {direction === 'add' ? 'Quantity to Add' : 'Quantity to Remove'}
                        </label>
                        <input
                            type="number"
                            step={product.measurementType === 'measurable' ? '0.01' : '1'}
                            min="0"
                            required
                            className="w-full h-20 rounded-2xl border-2 border-primary/20 bg-primary/5 px-4 text-center text-4xl font-black text-primary placeholder:text-primary/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 transition-all shadow-inner"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="0"
                            autoFocus
                        />
                    </div>

                    {/* Reason */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Reason (Optional)</label>
                        <textarea
                            className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all resize-none"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Spoilage, damage, return to supplier..."
                        />
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-border">
                        <LoadingButton onClick={onClose} variant="secondary" className="h-12 rounded-lg">CANCEL</LoadingButton>
                        <LoadingButton
                            onClick={handleSubmit}
                            loading={loading}
                            disabled={!qtyNum}
                            variant={direction === 'add' ? 'primary' : 'danger'}
                            className={`h-12 rounded-lg shadow-lg ${direction === 'add' ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/25' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-destructive/25'}`}
                        >
                            <Save className="w-4 h-4" />
                            {loading ? 'SAVING...' : direction === 'add' ? 'ADD STOCK' : 'REMOVE STOCK'}
                        </LoadingButton>
                    </div>
                </div>
            </div>
        </div>
    );
}
