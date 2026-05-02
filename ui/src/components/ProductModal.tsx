import { useState, useRef, useEffect } from 'react';
import { X, Package, Tag, DollarSign, Info, Barcode, Check, AlertCircle, Image as ImageIcon, Upload, Loader2, Plus as PlusIcon, Camera, CameraOff } from 'lucide-react';
import api from '../lib/api-client';
import toast from 'react-hot-toast';
import useScanDetection from '../hooks/useScanDetection';
import { useCurrency } from '../hooks/useCurrency';
import { BrowserMultiFormatReader } from '@zxing/library';

import { useAuth } from '../contexts/AuthContext';

interface ProductModalProps {
    product?: any;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ProductModal({ product, onClose, onSuccess }: ProductModalProps) {
    const isEdit = !!product;
    const { user } = useAuth();
    const { baseSymbol: symbol } = useCurrency();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [branches, setBranches] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        branchId: product?.branchId || (user?.role === 'admin' ? '' : user?.branchId) || '',
        name: product?.name || '',
        description: product?.description || '',
        category: product?.category || '',
        brand: product?.brand || '',
        basePrice: product?.basePrice || '',
        costPrice: product?.costPrice || '',
        sku: product?.sku || '',
        barcode: product?.barcode || '',
        barcodes: product?.barcodes || [],
        stockQuantity: product?.stockQuantity || '',
        lowStockThreshold: product?.lowStockThreshold || 10,
        imageUrl: product?.imageUrl || '',
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
    const [isScanning, setIsScanning] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const codeReader = useRef<BrowserMultiFormatReader | null>(null);

    const [categories, setCategories] = useState<string[]>([]);

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

    useEffect(() => {
        const handleNativeScan = (event: any) => {
            const barcode = event.detail.data;
            if (barcode) {
                handleAddBarcode(barcode);
                toast.success('Barcode scanned!');
                setIsScanning(false);
            }
        };

        window.addEventListener('nativeBarcodeScanned', handleNativeScan);
        return () => window.removeEventListener('nativeBarcodeScanned', handleNativeScan);
    }, []);

    useEffect(() => {
        let activeReader: BrowserMultiFormatReader | null = null;

        const startScanning = async () => {
            if (isScanning) {
                // Check for native scanner first
                const device = (window as any).RetailProDevice;
                if (device?.hasNativeScanner && (window as any).startNativeScan) {
                    (window as any).startNativeScan();
                    return;
                }

                if (videoRef.current) {
                    try {
                        activeReader = new BrowserMultiFormatReader();
                        codeReader.current = activeReader;

                        const videoDevices = await activeReader.listVideoInputDevices();
                        if (videoDevices.length === 0) {
                            toast.error('No camera found');
                            setIsScanning(false);
                            return;
                        }

                        // Prefer back camera if available
                        const backCamera = videoDevices.find(device =>
                            device.label.toLowerCase().includes('back') ||
                            device.label.toLowerCase().includes('rear')
                        );
                        const selectedDeviceId = backCamera ? backCamera.deviceId : videoDevices[0].deviceId;

                        try {
                            await activeReader.decodeFromVideoDevice(selectedDeviceId, videoRef.current, (result, _err) => {
                                if (result) {
                                    handleAddBarcode(result.getText());
                                    toast.success('Barcode scanned!');
                                    setIsScanning(false);
                                }
                            });
                        } catch (err: any) {
                            if (err.name === 'NotReadableError' || (err instanceof Error && err.message?.includes('already playing'))) {
                                console.log('Video already playing or busy, ignoring.');
                            } else {
                                throw err; // Re-throw other errors to be caught by the outer catch block
                            }
                        }
                    } catch (err) {
                        console.error('Camera access error:', err);
                        toast.error('Could not access camera. Please check permissions.');
                        setIsScanning(false);
                    }
                }
            }
        };

        if (isScanning) {
            startScanning();
        }

        return () => {
            if (activeReader) {
                activeReader.reset();
            }
        };
    }, [isScanning]);

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
            <div className="bg-card rounded-2xl shadow-xl max-w-5xl w-full p-8 border border-border max-h-[90vh] overflow-y-auto custom-scrollbar ring-1 ring-border/50">
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
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {/* Image Upload Area */}
                        <div className="lg:col-span-1 space-y-4">
                            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <ImageIcon className="w-4 h-4" /> Product Visual
                            </h3>
                            <div
                                onClick={() => fileInputRef.current?.click()}
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
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Category</label>
                                            <div className="relative">
                                                <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                                <input
                                                    type="text"
                                                    required
                                                    list="category-options"
                                                    value={formData.category}
                                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                    className="w-full h-11 pl-10 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
                                                    placeholder="Select or type new..."
                                                />
                                                <datalist id="category-options">
                                                    {categories.map((cat, idx) => (
                                                        <option key={idx} value={cat} />
                                                    ))}
                                                </datalist>
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
                                            onClick={() => setIsScanning(!isScanning)}
                                            className={`flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-1 rounded-md transition-all ${isScanning ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary hover:bg-primary/20'
                                                }`}
                                        >
                                            {isScanning ? <><CameraOff className="w-3 h-3" /> Stop Camera</> : <><Camera className="w-3 h-3" /> Use Camera</>}
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {isScanning && (
                                            <div className="relative aspect-video bg-black rounded-lg overflow-hidden border-2 border-primary/50 shadow-inner mb-2 animate-in fade-in zoom-in duration-300">
                                                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                                                <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-primary/40 animate-pulse shadow-[0_0_15px_rgba(var(--primary),0.5)]"></div>
                                                <div className="absolute top-2 left-2 text-[8px] font-bold text-white bg-black/40 px-1.5 py-0.5 rounded backdrop-blur">
                                                    LIVE FEED • SCAN BARCODE
                                                </div>
                                            </div>
                                        )}
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
                            disabled={submitting || uploading}
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
