import { useState, useRef, useEffect } from 'react';
import { X, Package, Tag, DollarSign, Info, Barcode, Check, AlertCircle, Image as ImageIcon, Upload, Loader2, Plus as PlusIcon, ScanLine } from 'lucide-react';
import api from '../lib/api-client';
import toast from 'react-hot-toast';
import useScanDetection from '../hooks/useScanDetection';
import { useCurrency } from '../hooks/useCurrency';
import { useHardware } from '../contexts/HardwareContext';
import BarcodeScanner from './BarcodeScanner';
import { Capacitor } from '@capacitor/core';

import { useAuth } from '../contexts/AuthContext';

interface ProductModalProps {
    product?: any;
    initialBarcode?: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ProductModal({ product, initialBarcode, onClose, onSuccess }: ProductModalProps) {
    const isEdit = !!product;
    const { user } = useAuth();
    const { baseSymbol: symbol } = useCurrency();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [branches, setBranches] = useState<any[]>([]);
    const [showScanner, setShowScanner] = useState(false);
    const [formData, setFormData] = useState({
        branchId: product?.branchId || (user?.role === 'admin' ? '' : user?.branchId) || '',
        name: product?.name || '',
        description: product?.description || '',
        category: product?.category || '',
        brand: product?.brand || '',
        basePrice: product?.basePrice || '',
        costPrice: product?.costPrice ?? '',
        sku: product?.sku || '',
        barcode: product?.barcode || '',
        barcodes: product?.barcodes || [],
        stockQuantity: product?.stockQuantity || '',
        lowStockThreshold: product?.lowStockThreshold || 10,
        imageUrl: product?.imageUrl || '',
        measurementType: product?.measurementType || 'discrete',
        baseUnit: product?.baseUnit || 'pcs',
        fractionalSalesAllowed: product?.fractionalSalesAllowed ?? false,
        minimumSaleQuantity: product?.minimumSaleQuantity || 1,
        purchaseUnit: product?.purchaseUnit || '',
        conversionFactor: product?.conversionFactor || 1,
    });
    const [variants, setVariants] = useState<{ name: string; sku: string; price: string; stock: string }[]>(
        product?.variants ? product.variants.map((v: any) => ({
            name: v.name,
            sku: v.sku,
            price: v.price.toString(),
            stock: '0',
            imageUrl: v.imageUrl || product.imageUrl
        })) : []
    );
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [categories, setCategories] = useState<string[]>([]);

    useEffect(() => {
        if (initialBarcode) {
            handleAddBarcode(initialBarcode);
        }
    }, [initialBarcode]);

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchBranches();
        }
        fetchCategories();
    }, [user]);

    const fetchCategories = async () => {
        try {
            const res = await api.getCategories();
            setCategories(res.data.categories || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await api.getBranches();
            setBranches(res.data.branches || []);
        } catch (error) {
            console.error('Error fetching branches:', error);
        }
    };

    const handleAddBarcode = (newBarcode: string) => {
        if (!newBarcode || formData.barcodes.includes(newBarcode)) return;
        setFormData(prev => ({
            ...prev,
            barcodes: [...prev.barcodes, newBarcode],
            barcode: prev.barcode || newBarcode // Set as primary if empty
        }));
    };

    const handleRemoveBarcode = (index: number) => {
        setFormData(prev => ({
            ...prev,
            barcodes: prev.barcodes.filter((_: any, i: number) => i !== index)
        }));
    };

    // Utility to compress image before upload to avoid proxy 413 errors
    const compressImage = (file: File): Promise<File> => {
        return new Promise((resolve) => {
            const maxSize = 0.8 * 1024 * 1024; // 800KB limit for absolute proxy safety
            if (file.size <= maxSize) {
                return resolve(file);
            }

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Standardize resolution if very large
                    const MAX_RES = 1200;
                    if (width > MAX_RES || height > MAX_RES) {
                        if (width > height) {
                            height *= MAX_RES / width;
                            width = MAX_RES;
                        } else {
                            width *= MAX_RES / height;
                            height = MAX_RES;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                // Return as a new File object
                                resolve(new File([blob], file.name, {
                                    type: 'image/jpeg',
                                    lastModified: Date.now(),
                                }));
                            } else {
                                resolve(file);
                            }
                        },
                        'image/jpeg',
                        0.8 // 80% quality
                    );
                };
            };
        });
    };

    // Handle hardware scan
    useScanDetection({
        onScan: (barcode) => {
            handleAddBarcode(barcode);
            toast.success('Barcode scanned!');
        }
    });

    const { isMobile } = useHardware();

    const handleCapturePhoto = async () => {
        try {
            const { Camera } = await import('@capacitor/camera');
            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: 'file' as any
            });

            if (image.path) {
                const response = await fetch(Capacitor.convertFileSrc(image.path));
                const blob = await response.blob();
                const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                
                setUploading(true);
                const uploadRes = await api.uploadImage(file);
                setFormData({ ...formData, imageUrl: uploadRes.data.url });
                toast.success('Image captured and uploaded');
            }
        } catch (error: any) {
            if (error.message !== 'User cancelled photos app') {
                toast.error('Failed to capture photo');
            }
        } finally {
            setUploading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);

            // Compress image if it's too large to bypass proxy 413 errors
            console.log(`[Upload] Original size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
            const compressedFile = await compressImage(file);
            console.log(`[Upload] Final size: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);

            const response = await api.uploadImage(compressedFile);
            setFormData({ ...formData, imageUrl: response.data.url });
            toast.success('Image uploaded successfully');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.imageUrl) {
            toast.error('Product image is required');
            return;
        }

        setSubmitting(true);

        try {
            const payload = {
                ...formData,
                branchId: formData.branchId,
                basePrice: parseFloat(formData.basePrice),
                costPrice: formData.costPrice === '' ? null : parseFloat(formData.costPrice),
                stockQuantity: formData.measurementType === 'measurable' ? parseFloat(formData.stockQuantity || '0') : parseInt(formData.stockQuantity || '0'),
                lowStockThreshold: formData.measurementType === 'measurable' ? parseFloat(formData.lowStockThreshold.toString()) : parseInt(formData.lowStockThreshold.toString()),
                measurementType: formData.measurementType,
                baseUnit: formData.baseUnit,
                fractionalSalesAllowed: formData.fractionalSalesAllowed,
                minimumSaleQuantity: parseFloat(formData.minimumSaleQuantity.toString()),
                purchaseUnit: formData.purchaseUnit || null,
                conversionFactor: parseFloat(formData.conversionFactor.toString()),
                variants: variants.map(v => ({
                    ...v,
                    price: parseFloat(v.price),
                    stock: formData.measurementType === 'measurable' ? parseFloat(v.stock || '0') : parseInt(v.stock || '0')
                })),
                initialStock: formData.measurementType === 'measurable' ? parseFloat(formData.stockQuantity || '0') : parseInt(formData.stockQuantity || '0')
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
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[100] sm:p-4 animate-in fade-in duration-200">
            <div className="bg-card sm:rounded-2xl shadow-xl max-w-5xl w-full border border-border h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-border/50">
                {/* Modal Header - Sticky */}
                <div className="flex items-center justify-between p-4 sm:p-8 border-b border-border bg-card shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shadow-sm ring-1 ring-inset ring-primary/20">
                                <Package className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg sm:text-xl font-bold text-foreground truncate">
                                {isEdit ? 'Update Catalog Item' : 'New Catalog Item'}
                            </h2>
                            <div className="hidden sm:flex items-center gap-2 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full ml-2">
                                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div>
                                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Scanner Active</span>
                            </div>
                        </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted rounded-full">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-4 sm:p-8 space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10">
                            {/* Image Upload Area */}
                            <div className="lg:col-span-1 space-y-4">
                                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4" /> Product Visual
                                </h3>
                                <div
                                    onClick={() => isMobile ? handleCapturePhoto() : fileInputRef.current?.click()}
                                    className="aspect-square rounded-2xl border-2 border-dashed border-border hover:border-primary/50 transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center bg-muted/20 relative group"
                                >
                                    {formData.imageUrl ? (
                                        <>
                                            <img src={formData.imageUrl} alt="Product" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <Upload className="w-8 h-8 text-white" />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            {uploading ? <Loader2 className="w-10 h-10 animate-spin text-primary" /> : <Upload className="w-10 h-10" />}
                                            <div className="text-center">
                                                <p className="text-xs font-bold uppercase tracking-wider">Click to upload</p>
                                                <p className="text-[10px] font-medium opacity-60">JPG, PNG or WEBP (Max 15MB)</p>
                                            </div>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                </div>
                                {uploading && (
                                    <p className="text-[10px] font-bold text-primary animate-pulse text-center">UPLOADING ASSET...</p>
                                )}
                                {!formData.imageUrl && !uploading && (
                                    <p className="text-[10px] font-bold text-destructive text-center uppercase tracking-tighter">* Required for system update</p>
                                )}
                            </div>

                            {/* Core Identity */}
                            <div className="lg:col-span-1 space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <Info className="w-4 h-4" /> Core Identity
                                    </h3>
                                    <div className="space-y-4 text-left">
                                        {user?.role === 'admin' && (
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Target Branch</label>
                                                <select
                                                    required
                                                    value={formData.branchId}
                                                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                                                    className="w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
                                                >
                                                    <option value="">Select a branch...</option>
                                                    {branches.map((b: any) => (
                                                        <option key={b.id} value={b.id}>{b.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
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
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Category</label>
                                                <div className="relative">
                                                    <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                                    <select
                                                        value={categories.includes(formData.category) ? formData.category : 'custom'}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val !== 'custom') {
                                                                setFormData({ ...formData, category: val });
                                                            } else {
                                                                setFormData({ ...formData, category: '' });
                                                            }
                                                        }}
                                                        className="w-full h-11 pl-10 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all appearance-none"
                                                    >
                                                        <option value="">Select Category...</option>
                                                        {categories.map((cat, idx) => (
                                                            <option key={idx} value={cat}>{cat}</option>
                                                        ))}
                                                        <option value="custom">+ New Category...</option>
                                                    </select>
                                                    {!categories.includes(formData.category) && (
                                                        <div className="mt-2 animate-in slide-in-from-top-1">
                                                            <input
                                                                type="text"
                                                                autoFocus
                                                                value={formData.category}
                                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                                className="w-full h-11 rounded-lg border border-primary/50 bg-background px-3 py-2 text-sm text-foreground placeholder-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all shadow-sm"
                                                                placeholder="Type new category name..."
                                                            />
                                                        </div>
                                                    )}
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
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">SKU Code</label>
                                            <input
                                                type="text"
                                                value={formData.sku}
                                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                                className="w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
                                                placeholder="Optional internal SKU"
                                            />
                                        </div>
                                        <div className="flex justify-between items-center ml-1">
                                            <label className="text-xs font-bold text-muted-foreground uppercase">Barcodes</label>
                                            <button
                                                type="button"
                                                onClick={() => setShowScanner(true)}
                                                className="flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-1 rounded-md transition-all bg-primary/10 text-primary hover:bg-primary/20"
                                            >
                                                <ScanLine className="w-3 h-3" /> Use Terminal Scanner
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-medium text-muted-foreground ml-1">Dedicated scanner input is preferred here. Camera fallback remains inside the scanner dialog when native hardware is unavailable.</p>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                                    <input
                                                        type="text"
                                                        value={formData.barcode}
                                                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleAddBarcode(formData.barcode);
                                                                setFormData(prev => ({ ...prev, barcode: '' }));
                                                            }
                                                        }}
                                                        placeholder="Enter or scan barcode..."
                                                        className="w-full h-11 pl-10 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleAddBarcode(formData.barcode);
                                                        setFormData(prev => ({ ...prev, barcode: '' }));
                                                    }}
                                                    className="h-11 px-4 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                                                >
                                                    <PlusIcon className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Barcode List */}
                                            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 rounded-lg border border-dashed border-border/50 bg-muted/20">
                                                {formData.barcodes.length === 0 ? (
                                                    <span className="text-[10px] text-muted-foreground italic px-2 py-1">No barcodes added yet</span>
                                                ) : (
                                                    formData.barcodes.map((bc: string, idx: number) => (
                                                        <div key={idx} className="flex items-center gap-1.5 bg-background border rounded-full pl-3 pr-1.5 py-1 text-xs font-medium group">
                                                            {bc}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveBarcode(idx)}
                                                                className="p-0.5 text-muted-foreground hover:text-destructive rounded-full hover:bg-destructive/10 transition-colors"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Measurement & Logic Configuration */}
                                <div className="space-y-4 pt-6 border-t border-border/50">
                                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <Info className="w-4 h-4" /> Measurement Logic
                                    </h3>
                                    <div className="bg-muted/30 p-4 rounded-xl space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Inventory Type</label>
                                            <div className="flex gap-2 p-1 bg-card border rounded-lg">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, measurementType: 'discrete', fractionalSalesAllowed: false, baseUnit: 'pcs' })}
                                                    className={`flex-1 py-2 text-[10px] font-black uppercase rounded-md transition-all ${formData.measurementType === 'discrete' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                                                >
                                                    Discrete (Items)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, measurementType: 'measurable' })}
                                                    className={`flex-1 py-2 text-[10px] font-black uppercase rounded-md transition-all ${formData.measurementType === 'measurable' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                                                >
                                                    Measurable (m/kg/l)
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Base Unit</label>
                                                <input
                                                    type="text"
                                                    value={formData.baseUnit}
                                                    onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })}
                                                    className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                                                    placeholder="pcs, m, kg, l..."
                                                />
                                            </div>
                                            <div className="flex flex-col justify-end">
                                                <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-card rounded-lg transition-all">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.fractionalSalesAllowed}
                                                        onChange={(e) => setFormData({ ...formData, fractionalSalesAllowed: e.target.checked })}
                                                        className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                                                    />
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Allow Fractions</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Min Sale Qty ({formData.baseUnit})</label>
                                            <input
                                                type="number"
                                                step="any"
                                                value={formData.minimumSaleQuantity}
                                                onChange={(e) => setFormData({ ...formData, minimumSaleQuantity: e.target.value })}
                                                className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Purchase Unit</label>
                                                <input
                                                    type="text"
                                                    value={formData.purchaseUnit}
                                                    onChange={(e) => setFormData({ ...formData, purchaseUnit: e.target.value })}
                                                    className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                                                    placeholder="Roll, Box..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Conversion (to {formData.baseUnit})</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={formData.conversionFactor}
                                                    onChange={(e) => setFormData({ ...formData, conversionFactor: e.target.value })}
                                                    className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Pricing & Stock */}
                            <div className="lg:col-span-1 space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-emerald-500" /> Pricing & Stock
                                    </h3>
                                    <div className="bg-muted/30 p-6 rounded-xl border border-border/50 space-y-6 text-left">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase">Selling Price</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">{symbol}</span>
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
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">{symbol}</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={formData.costPrice}
                                                        onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                                                        placeholder="Optional"
                                                        className="w-full h-12 pl-8 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
                                                    />
                                                </div>
                                                <p className="text-[10px] font-medium text-muted-foreground">Leave blank if landed cost is not known yet.</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-border/50">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase">Initial Units</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={formData.stockQuantity}
                                                    onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                                                    className="w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase">Alert Threshold</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={formData.lowStockThreshold}
                                                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                                                    className="w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Variation Matrix */}
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
                                                            placeholder={formData.measurementType === 'measurable' ? "Qty" : "Stock"}
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
                        </div>
                    </div>

                    {/* Modal Footer - Sticky */}
                    <div className="p-4 sm:p-8 border-t border-border bg-card/80 backdrop-blur-md flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 shrink-0">
                        <button type="button" onClick={onClose} className="h-12 bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground px-8 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-colors w-full sm:w-auto order-2 sm:order-1">CANCEL</button>
                        <button
                            type="submit"
                            disabled={submitting || uploading}
                            className="h-12 bg-primary text-primary-foreground hover:bg-primary/90 px-10 rounded-xl font-bold shadow-lg shadow-primary/25 uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:shadow-none w-full sm:w-auto order-1 sm:order-2"
                        >
                            {submitting ? 'EXECUTING...' : isEdit ? 'UPDATE ITEM' : 'STORE ITEM'}
                            {!submitting && <Check className="w-4 h-4" />}
                        </button>
                    </div>
                </form>
            </div>
            {showScanner && (
                <BarcodeScanner
                    onScan={(barcode) => {
                        handleAddBarcode(barcode);
                        toast.success('Barcode scanned!');
                        setShowScanner(false);
                    }}
                    onClose={() => setShowScanner(false)}
                    autoStartNative
                />
            )}
        </div>
    );
}
