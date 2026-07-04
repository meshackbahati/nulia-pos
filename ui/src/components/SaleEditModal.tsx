import { useState } from 'react';
import { X, Save } from 'lucide-react';

interface SaleItem {
    id: string;
    productId: string;
    variantId?: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

interface SaleEditModalProps {
    sale: any;
    onSave: (saleId: string, data: any) => Promise<void>;
    onClose: () => void;
}

export default function SaleEditModal({ sale, onSave, onClose }: SaleEditModalProps) {
    const [customerPhone, setCustomerPhone] = useState(sale.customerPhone || '');
    const [customerEmail, setCustomerEmail] = useState(sale.customerEmail || '');
    const [notes, setNotes] = useState(sale.notes || '');
    const [items, setItems] = useState<SaleItem[]>(sale.items || []);
    const [saving, setSaving] = useState(false);

    const updateItemQty = (index: number, qty: number) => {
        const updated = [...items];
        updated[index] = { ...updated[index], quantity: qty, totalPrice: qty * updated[index].unitPrice };
        setItems(updated);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(sale.id, {
                customerPhone,
                customerEmail,
                notes,
                items: items.map(i => ({
                    productId: i.productId,
                    variantId: i.variantId,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                })),
            });
        } finally {
            setSaving(false);
        }
    };

    const subtotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
    const taxRate = sale.branch?.taxRate || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-5 border-b border-border">
                    <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
                        Edit Sale — {sale.receiptId}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-secondary/50 rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Customer Info */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Customer Info</h3>
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Phone</label>
                            <input
                                type="text"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                className="w-full h-10 bg-background border border-border rounded-lg px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 mt-1"
                                placeholder="Customer phone"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Email</label>
                            <input
                                type="email"
                                value={customerEmail}
                                onChange={(e) => setCustomerEmail(e.target.value)}
                                className="w-full h-10 bg-background border border-border rounded-lg px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 mt-1"
                                placeholder="Customer email"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Notes</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 mt-1"
                                rows={2}
                                placeholder="Sale notes"
                            />
                        </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Items</h3>
                        {items.map((item, idx) => (
                            <div key={item.id || idx} className="flex items-center gap-2 p-2 bg-secondary/20 rounded-lg">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-foreground truncate">{item.productName}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                        @ {item.unitPrice.toFixed(2)} each
                                    </p>
                                </div>
                                <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={item.quantity}
                                    onChange={(e) => updateItemQty(idx, Number(e.target.value))}
                                    className="w-20 h-9 bg-background border border-border rounded-lg px-2 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                                <span className="text-xs font-bold text-primary w-20 text-right">
                                    {item.totalPrice.toFixed(2)}
                                </span>
                                <button
                                    onClick={() => removeItem(idx)}
                                    className="p-1.5 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Totals */}
                    <div className="border-t border-border pt-3 space-y-1 text-right">
                        <p className="text-xs text-muted-foreground">Subtotal: {subtotal.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Tax ({taxRate}%): {taxAmount.toFixed(2)}</p>
                        <p className="text-base font-black text-primary">Total: {total.toFixed(2)}</p>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
                    <button
                        onClick={onClose}
                        className="px-5 h-10 bg-secondary/30 text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-secondary/50 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 h-10 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                    >
                        <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
