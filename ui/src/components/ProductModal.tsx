import { useState } from 'react';
import { X, Package, Tag, Hash, DollarSign, Info, Barcode, Check, AlertCircle } from 'lucide-react';
import api from '../lib/api-client';
import toast from 'react-hot-toast';

interface ProductModalProps {
    product?: any;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ProductModal({ product, onClose, onSuccess }: ProductModalProps) {
    const isEdit = !!product;
    const [formData, setFormData] = useState({
        name: product?.name || '',
        description: product?.description || '',
        category: product?.category || '',
        brand: product?.brand || '',
        basePrice: product?.basePrice || '',
        costPrice: product?.costPrice || '',
        sku: product?.sku || '',
        barcode: product?.barcode || '',
        stockQuantity: product?.stockQuantity || '',
        lowStockThreshold: product?.lowStockThreshold || 10,
    });
    const [variants, setVariants] = useState<{ name: string; sku: string; price: string; stock: string }[]>(
        product?.variants ? product.variants.map((v: any) => ({
            name: v.name,
            sku: v.sku,
            price: v.price.toString(),
            stock: '0'
        })) : []
    );
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const payload = {
                ...formData,
                basePrice: parseFloat(formData.basePrice),
                costPrice: parseFloat(formData.costPrice || '0'),
                stockQuantity: parseInt(formData.stockQuantity || '0'),
                lowStockThreshold: parseInt(formData.lowStockThreshold.toString()),
                variants: variants.map(v => ({
                    ...v,
                    price: parseFloat(v.price),
                    stock: parseInt(v.stock || '0')
                })),
                initialStock: parseInt(formData.stockQuantity || '0')
            };

            if (isEdit) {
                await api.updateProduct(product.id, payload);
                toast.success('Product updated');
            } else {
                await api.createProduct(payload);
                toast.success('Product created');
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to save');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="bg-card rounded-2xl shadow-xl max-w-4xl w-full p-8 border border-border max-h-[90vh] overflow-y-auto custom-scrollbar ring-1 ring-border/50">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shadow-sm ring-1 ring-inset ring-primary/20">
                            <Package className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground">
                            {isEdit ? 'Update Catalog Item' : 'New Catalog Item'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted rounded-full">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Primary Info */}
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Info className="w-4 h-4" /> Core Identity
                                </h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Product Title</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
                                            placeholder="e.g. Premium Hub Gear"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Description</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full min-h-[100px] rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all resize-none"
                                            placeholder="Item technical specs..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Category</label>
                                            <div className="relative">
                                                <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.category}
                                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                    className="w-full h-11 pl-10 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Brand</label>
                                            <input
                                                type="text"
                                                value={formData.brand}
                                                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                                className="w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Hash className="w-4 h-4" /> Identification
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase ml-1">SKU Code</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.sku}
                                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                            className="w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Barcode</label>
                                        <div className="relative">
                                            <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                            <input
                                                type="text"
                                                value={formData.barcode}
                                                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                                className="w-full h-11 pl-10 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Inventory & Variants */}
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-emerald-500" /> Pricing & Stock
                                </h3>
                                <div className="bg-muted/30 p-6 rounded-xl border border-border/50 space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase">Selling Price</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    required
                                                    value={formData.basePrice}
                                                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                                                    className="w-full h-12 pl-8 rounded-lg border border-input bg-background px-3 py-2 text-lg font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase">Cost Logic</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.costPrice}
                                                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                                                    className="w-full h-12 pl-8 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6 pt-4 border-t border-border/50">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase">Initial Units</label>
                                            <input
                                                type="number"
                                                value={formData.stockQuantity}
                                                onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                                                className="w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase">Alert Threshold</label>
                                            <input
                                                type="number"
                                                value={formData.lowStockThreshold}
                                                onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                                                className="w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-1">
                                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Variation Matrix</h3>
                                    <button type="button" onClick={() => setVariants([...variants, { name: '', sku: '', price: '', stock: '0' }])} className="text-[10px] font-bold text-primary uppercase hover:underline transition-all">+ Add Option</button>
                                </div>
                                <div className="space-y-3 max-h-[200px] overflow-y-auto px-1 custom-scrollbar">
                                    {variants.map((variant, index) => (
                                        <div key={index} className="flex gap-3 p-3 bg-card border border-border rounded-xl items-end group hover:border-primary/30 transition-colors">
                                            <div className="flex-[2]">
                                                <input
                                                    type="text"
                                                    value={variant.name}
                                                    onChange={(e) => { const n = [...variants]; n[index].name = e.target.value; setVariants(n); }}
                                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                    placeholder="Color/Size"
                                                />
                                            </div>
                                            <div className="flex-[1]">
                                                <input
                                                    type="number"
                                                    value={variant.price}
                                                    onChange={(e) => { const n = [...variants]; n[index].price = e.target.value; setVariants(n); }}
                                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                    placeholder="Price"
                                                />
                                            </div>
                                            <button type="button" onClick={() => setVariants(variants.filter((_, i) => i !== index))} className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-full hover:bg-destructive/10">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {variants.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground border border-dashed border-border rounded-xl bg-muted/20">
                                            <AlertCircle className="w-6 h-6 mb-2 opacity-50" />
                                            <p className="text-[10px] italic">Standard single-type item</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-border flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="h-12 bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground px-8 rounded-lg font-bold uppercase text-xs transition-colors">CANCEL</button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="h-12 bg-primary text-primary-foreground hover:bg-primary/90 px-10 rounded-lg font-bold shadow-lg shadow-primary/25 uppercase text-xs flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                        >
                            {submitting ? 'EXECUTING...' : isEdit ? 'UPDATE ITEM' : 'STORE ITEM'}
                            {!submitting && <Check className="w-4 h-4" />}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
