import { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import api from '../lib/api-client';
import toast from 'react-hot-toast';

interface Product {
    id: string;
    name: string;
    stockQuantity: number;
}

interface RestockModalProps {
    product: Product;
    onClose: () => void;
    onSuccess: () => void;
}

export default function RestockModal({ product, onClose, onSuccess }: RestockModalProps) {
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) {
            toast.error('Enter valid quantity');
            return;
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-8 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Restock Inventory</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-start gap-3 border border-blue-100 dark:border-blue-900/40">
                        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-blue-900 dark:text-blue-300">{product.name}</p>
                            <p className="text-[10px] uppercase font-bold text-blue-600 mt-1">Current Stock: {product.stockQuantity}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Addition Quantity</label>
                        <input
                            type="number"
                            min="1"
                            required
                            className="modern-input h-12 text-lg font-bold"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="0"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Logistic Note (Optional)</label>
                        <textarea
                            className="modern-input h-24 py-3 resize-none"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Shipment from central hub..."
                        />
                    </div>

                    <div className="flex gap-4 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 h-12 modern-button bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">CANCEL</button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 h-12 modern-button bg-blue-600 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10"
                        >
                            <Save className="w-4 h-4" />
                            {loading ? 'STORING...' : 'RESTOCK'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
