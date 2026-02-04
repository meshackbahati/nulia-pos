import { useState } from 'react';
import { X, Package, Tag, Hash, DollarSign, Info, Barcode } from 'lucide-react';
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-4xl w-full p-8 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                            <Package className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            {isEdit ? 'Update Catalog Item' : 'New Catalog Item'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Primary Info */}
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Info className="w-4 h-4" /> Core Identity
                                </h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Product Title</label>
                                        <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="modern-input h-11" placeholder="e.g. Premium Hub Gear" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Description</label>
                                        <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="modern-input h-24 py-3 resize-none" placeholder="Item technical specs..." />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Category</label>
                                            <div className="relative">
                                                <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input type="text" required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="modern-input h-11 pl-10" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Brand</label>
                                            <input type="text" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="modern-input h-11" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Hash className="w-4 h-4" /> Identification
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">SKU Code</label>
                                        <input type="text" required value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="modern-input h-11" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Barcode</label>
                                        <div className="relative">
                                            <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="text" value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} className="modern-input h-11 pl-10" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Inventory & Variants */}
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-green-600" /> Pricing & Stock
                                </h3>
                                <div className="modern-card p-6 bg-slate-50/50 dark:bg-slate-800/20 space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Selling Price</label>
                                            <input type="number" step="0.01" required value={formData.basePrice} onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })} className="modern-input text-lg font-bold h-12 text-blue-600" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Cost Logic</label>
                                            <input type="number" step="0.01" value={formData.costPrice} onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })} className="modern-input h-12" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Initial Units</label>
                                            <input type="number" value={formData.stockQuantity} onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })} className="modern-input h-11" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Alert Threshold</label>
                                            <input type="number" value={formData.lowStockThreshold} onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })} className="modern-input h-11" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-1">
                                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Variation Matrix</h3>
                                    <button type="button" onClick={() => setVariants([...variants, { name: '', sku: '', price: '', stock: '0' }])} className="text-[10px] font-bold text-blue-600 uppercase hover:underline">+ Add Option</button>
                                </div>
                                <div className="space-y-3">
                                    {variants.map((variant, index) => (
                                        <div key={index} className="flex gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl items-end group">
                                            <div className="flex-[2]">
                                                <input type="text" value={variant.name} onChange={(e) => { const n = [...variants]; n[index].name = e.target.value; setVariants(n); }} className="modern-input h-9 text-xs" placeholder="Color/Size" />
                                            </div>
                                            <div className="flex-[1]">
                                                <input type="number" value={variant.price} onChange={(e) => { const n = [...variants]; n[index].price = e.target.value; setVariants(n); }} className="modern-input h-9 text-xs" placeholder="Price" />
                                            </div>
                                            <button type="button" onClick={() => setVariants(variants.filter((_, i) => i !== index))} className="p-2 text-slate-300 hover:text-red-500"><X className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                    {variants.length === 0 && <p className="text-[10px] text-center text-slate-400 italic py-4">Standard single-type item</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="h-12 modern-button bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-8 font-bold">CANCEL</button>
                        <button type="submit" disabled={submitting} className="h-12 modern-button bg-blue-600 text-white px-10 font-bold shadow-lg shadow-blue-600/20">
                            {submitting ? 'EXECUTING...' : isEdit ? 'UPDATE ITEM' : 'STORE ITEM'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
