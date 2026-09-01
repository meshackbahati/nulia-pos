import { useState, useEffect, useRef } from 'react';
import api from '../lib/api-client';
import ProductModal from '../components/ProductModal';
import RestockModal from '../components/RestockModal';
import InventoryAdjustModal from '../components/InventoryAdjustModal';
import BarcodeScanner from '../components/BarcodeScanner';
import { Plus, Package, AlertTriangle, PlusCircle, ArrowDownCircle, Search, FileUp, Building, Barcode } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { useCurrency } from '../hooks/useCurrency';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { useSocket } from '../hooks/useSocket';
import useScanDetection from '../hooks/useScanDetection';
import { useLock } from '../lib/useLock';

interface Product {
    id: string;
    name: string;
    description?: string;
    category: string;
    brand?: string;
    basePrice: number;
    costPrice: number | null;
    sku: string;
    barcode?: string;
    barcodes?: string[];
    imageUrl?: string;
    stockQuantity: number;
    lowStockThreshold: number;
    measurementType: 'discrete' | 'measurable';
    baseUnit: string;
    fractionalSalesAllowed: boolean;
    isActive: boolean;
}

export default function ProductsPage() {
    const { user } = useAuth();
    const { showConfirm } = useModal();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [restockingProduct, setRestockingProduct] = useState<Product | null>(null);
    const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
    const [initialBarcode, setInitialBarcode] = useState('');
    const { formatPrice } = useCurrency();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedImportBranch, setSelectedImportBranch] = useState('');

    useSocket({
        'inventory-update': () => fetchProducts(),
        'product-update': () => fetchProducts()
    });

    const handleScan = (barcode: string) => {
        setSearchTerm(barcode);
        setShowScanner(false);
        toast.success(`Scanned: ${barcode}`);
    };

    useScanDetection({
        onScan: (barcode) => {
            const product = products.find(p => p.sku === barcode || p.barcode === barcode || (p.barcodes || []).includes(barcode));
            if (product) {
                setSearchTerm(barcode);
                toast.success(`Product Found: ${product.name}`);
            } else {
                toast.success(`New Barcode: ${barcode}. Opening Registry...`);
                setEditingProduct(null);
                setShowAddModal(true);
                // We'll need a way to pass the barcode to the modal. 
                // I'll update ProductModal to accept an initialBarcode prop.
                setInitialBarcode(barcode);
            }
        }
    });

    useEffect(() => {
        fetchProducts();
        if (user?.role === 'admin') {
            fetchBranches();
        }
    }, [user]);

    const fetchBranches = async () => {
        try {
            const res = await api.getBranches();
            setBranches(res.data.branches || []);
        } catch (error) {
            console.error('Error fetching branches:', error);
        }
    };

    const [handleCSVImportSafe, _isImporting] = useLock(async (file: File) => {
        const branchId = selectedImportBranch;
        if (!branchId) {
            toast.error('Please select a target hub for import first');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);

            toast.loading('Importing products...', { id: 'csv-import' });
            const response = await api.importProducts(file, branchId);
            const { created, updated, errors } = response.data.results;

            if (errors.length > 0) {
                toast.error(`Imported with ${errors.length} errors. ${created} created, ${updated} updated.`, { id: 'csv-import', duration: 5000 });
                console.error('Import errors:', errors);
            } else {
                toast.success(`Success! ${created} created, ${updated} updated.`, { id: 'csv-import' });
            }
            fetchProducts();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to import products', { id: 'csv-import' });
        }
    });

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await api.listProducts({ limit: 200 });
            setProducts(response.data.products);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const [handleDeleteProduct, _isDeletingProduct] = useLock(async (product: Product) => {
        try {
            await api.deleteProduct(product.id);
            setProducts(products.filter((p) => p.id !== product.id));
            toast.success('Product deleted successfully');
        } catch (error) {
            console.error('Error deleting product:', error);
            toast.error('Failed to delete product');
        }
    });

    const handleDelete = (product: Product) => {
        showConfirm({
            title: 'Delete Product',
            message: `Are you sure you want to delete ${product.name}? This action will mark the product as inactive and it will no longer appear in the POS or inventory lists.`,
            type: 'error',
            confirmText: 'Yes, Delete',
            onConfirm: () => handleDeleteProduct(product),
        });
    };

    const filteredProducts = products.filter(p => {
        const searchLower = searchTerm.toLowerCase().trim();
        if (!searchLower) return true;

        // Split search into individual tokens
        const searchWords = searchLower.split(/\s+/).filter(Boolean);
        
        // Build a comprehensive search string for this product
        const searchableFields = [
            p.name || '',
            p.sku || '',
            p.barcode || '',
            ...(p.barcodes || []),
            p.category || '',
            p.brand || '',
            p.description || ''
        ].map(f => f.toLowerCase());

        // Check if EVERY search word is found in AT LEAST ONE field
        return searchWords.every(word => 
            searchableFields.some(field => field.includes(word))
        );
    });

    return (
        <div className="min-h-screen bg-background flex flex-col font-sans transition-colors duration-300 overflow-x-hidden">
            {/* Header — stacks on 320px */}
            <header className="bg-background border-b border-border px-3 sm:px-6 py-3 sm:py-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shadow-sm shrink-0">
                            <Package className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-base sm:text-lg font-bold text-foreground truncate">
                                Product <span className="text-primary">Inventory</span>
                            </h1>
                            <p className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate">Control stock levels and catalog items</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4 justify-between sm:justify-end flex-wrap">
                        <ThemeToggle />
                        {user?.role !== 'salesperson' && (
                        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
                            <div className="flex items-center gap-2 flex-1 sm:flex-none min-w-[120px]">
                                <Building className="w-4 h-4 text-muted-foreground shrink-0 hidden sm:block" />
                                <select
                                    value={selectedImportBranch}
                                    onChange={(e) => setSelectedImportBranch(e.target.value)}
                                    className="h-9 rounded-md border border-input bg-background px-2 sm:px-3 py-1 text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto min-h-[36px]"
                                >
                                    <option value="">Select Hub...</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center justify-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-3 sm:px-4 py-2 rounded-md transition-colors text-sm font-medium min-h-[36px] flex-1 sm:flex-none"
                            >
                                <FileUp className="w-4 h-4" />
                                <span className="uppercase text-xs font-bold">Import</span>
                            </button>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3 sm:px-4 py-2 rounded-md transition-colors text-sm font-medium min-h-[36px] flex-1 sm:flex-none"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="uppercase text-xs font-bold">Add</span>
                            </button>
                        </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleCSVImportSafe(file);
                            }}
                            className="hidden"
                            accept=".csv"
                        />
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-in fade-in duration-500 overflow-x-hidden">
                {/* Search & Stats — stacks on 320px */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                    <div className="relative flex-1 max-w-md flex gap-2 w-full">
                        <div className="relative flex-1 min-w-0">
                            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 sm:w-5 sm:h-5" />
                            <input
                                type="text"
                                placeholder="Search catalog..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex h-11 w-full rounded-md border border-input bg-background pl-12 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                        <button
                            onClick={() => setShowScanner(true)}
                            className="h-11 px-4 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md transition-colors flex items-center justify-center gap-2"
                            title="Scan Barcode"
                        >
                            <Barcode className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full animate-pulse">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Hardware Scanner Ready</span>
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Catalog Size:</span>
                        <div className="bg-card border border-border px-3 py-1 rounded-full text-xs font-bold text-primary shadow-sm">
                            {products.length} Units
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="h-56 sm:h-64 bg-card border border-border rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="bg-card border border-dashed border-border p-8 sm:p-16 text-center rounded-2xl">
                        <Package className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-base sm:text-lg font-bold text-foreground">No products found</h3>
                        <p className="text-muted-foreground text-sm mt-1">Start by adding your first item to the terminal inventory.</p>
                        <button onClick={() => setShowAddModal(true)} className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 rounded-md transition-colors text-sm font-medium inline-flex items-center justify-center min-h-[44px]">Add Item</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                        {filteredProducts.map((product) => (
                            <div key={product.id} className="bg-card text-card-foreground rounded-xl border border-border shadow-sm p-4 flex flex-col group hover:shadow-lg transition-all duration-300">
                                <div className="aspect-square bg-muted rounded-lg overflow-hidden relative mb-4">
                                    {product.imageUrl ? (
                                        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center">
                                            <Package className="w-8 h-8 text-muted-foreground opacity-50" />
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2">
                                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-background/90 text-primary rounded backdrop-blur-sm border border-border/50">
                                            {product.category}
                                        </span>
                                    </div>
                                    {product.stockQuantity <= product.lowStockThreshold && (
                                        <div className="absolute top-2 right-2">
                                            <div className="p-1 bg-destructive text-destructive-foreground rounded-full shadow-lg">
                                                <AlertTriangle className="w-3 h-3" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1 mb-4 flex-1">
                                    <h3 className="font-bold text-foreground text-sm line-clamp-1">{product.name}</h3>
                                    <div className="flex items-center justify-between">
                                        <span className="text-primary font-bold text-sm">{formatPrice(product.basePrice)}</span>
                                        <span className="text-[10px] text-muted-foreground font-medium">SKU: {product.sku}</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-border space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase">Stock</p>
                                            <p className={`text-xs font-bold ${product.stockQuantity <= product.lowStockThreshold ? 'text-destructive' : 'text-foreground'}`}>
                                                {product.stockQuantity} {product.baseUnit}
                                            </p>
                                        </div>
                                        {user?.role !== 'salesperson' && (
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => setRestockingProduct(product)} className="text-emerald-500 hover:text-emerald-600 transition-colors" title="Restock">
                                                <PlusCircle className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => setAdjustingProduct(product)} className="text-amber-500 hover:text-amber-600 transition-colors" title="Adjust Stock">
                                                <ArrowDownCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                        )}
                                    </div>

                                    {user?.role !== 'salesperson' && (
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditingProduct(product)} className="flex-1 h-8 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md text-[10px] font-bold uppercase transition-colors">Edit</button>
                                        <button onClick={() => handleDelete(product)} className="flex-1 h-8 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md text-[10px] font-bold uppercase transition-colors">Delete</button>
                                    </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {showScanner && (
                <BarcodeScanner
                    onScan={handleScan}
                    onClose={() => setShowScanner(false)}
                />
            )}

            {/* Modals */}
            {(showAddModal || editingProduct) && (
                <ProductModal
                    product={editingProduct || undefined}
                    initialBarcode={initialBarcode}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingProduct(null);
                        setInitialBarcode('');
                    }}
                    onSuccess={fetchProducts}
                />
            )}

            {restockingProduct && (
                <RestockModal
                    product={restockingProduct}
                    onClose={() => setRestockingProduct(null)}
                    onSuccess={fetchProducts}
                />
            )}

            {adjustingProduct && (
                <InventoryAdjustModal
                    product={adjustingProduct}
                    onClose={() => setAdjustingProduct(null)}
                    onSuccess={fetchProducts}
                />
            )}
        </div>
    );
}
