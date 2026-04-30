import { useState, useEffect } from 'react';
import api from '../lib/api-client';
import PaymentModal from '../components/PaymentModal';
import ReceiptModal from '../components/ReceiptModal';
import BarcodeScanner from '../components/BarcodeScanner';
import ThemeToggle from '../components/ThemeToggle';
import TransactionHistoryModal from '../components/TransactionHistoryModal';
import {
    Plus,
    ShoppingCart,
    Search,
    Store,
    LogOut,
    Maximize,
    Package,
    Trash2,
    Minus,
    CreditCard,
    History,
    X,
    WifiOff,
    RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../hooks/useCurrency';
import { Link } from 'react-router-dom';
import useScanDetection from '../hooks/useScanDetection';
import toast from 'react-hot-toast';
import { db } from '../lib/db';

interface Product {
    id: string;
    variantId?: string;
    name: string;
    imageUrl?: string;
    price: number;
    stockQty: number;
    category: string;
    sku: string;
    barcode?: string;
    barcodes: string[];
    lowStockAlert: number;
    variantName?: string;
}

interface CartItem {
    product_id: string;
    variant_id?: string | null;
    name: string;
    imageUrl?: string;
    price: number;
    quantity: number;
    stockQty: number;
    variantName?: string;
}

interface CartContentProps {
    cart: CartItem[];
    setCart: (cart: CartItem[]) => void;
    updateQuantity: (productId: string, variant_id: string | null, delta: number) => void;
    formatPrice: (price: number) => string;
    subtotal: number;
    total: number;
    setShowPaymentModal: (show: boolean) => void;
}

function CartContent({ cart, setCart, updateQuantity, formatPrice, subtotal, total, setShowPaymentModal }: CartContentProps) {
    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-inner">
                        <ShoppingCart className="w-5 h-5" />
                    </div>
                    <h2 className="font-black text-xs uppercase tracking-[0.2em] text-foreground">Active Order</h2>
                </div>
                <button
                    onClick={() => setCart([])}
                    disabled={cart.length === 0}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all disabled:opacity-50"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-20">
                        <ShoppingCart className="w-20 h-20 mb-4 text-muted-foreground" />
                        <p className="text-xs font-black uppercase tracking-widest text-foreground">Terminal Empty</p>
                        <p className="text-[10px] font-bold text-muted-foreground mt-2 uppercase tracking-tighter italic">Awaiting HID / Manual Input</p>
                    </div>
                ) : (
                    cart.map(item => (
                        <div key={item.product_id + (item.variant_id || '')} className="flex gap-4 p-4 glass-card group animate-in slide-in-from-right-2">
                            <div className="w-16 h-16 rounded-2xl bg-white overflow-hidden shadow-inner flex-shrink-0 border border-border/50">
                                {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-secondary/50">
                                        <Package className="w-6 h-6 text-muted-foreground/30" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div>
                                    <h4 className="text-xs font-black text-foreground line-clamp-1 uppercase tracking-tight">{item.name}</h4>
                                    <p className="text-[10px] font-bold text-primary mt-1">{formatPrice(item.price)}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => updateQuantity(item.product_id, item.variant_id || null, -1)}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-background border shadow-sm hover:bg-primary hover:text-white transition-all"
                                    >
                                        <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="text-xs font-black w-4 text-center text-foreground">{item.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(item.product_id, item.variant_id || null, 1)}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-background border shadow-sm hover:bg-primary hover:text-white transition-all"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                            <div className="text-right flex flex-col justify-end">
                                <p className="text-sm font-black text-foreground tracking-tighter">{formatPrice(item.price * item.quantity)}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-8 border-t glass space-y-6">
                <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        <span>Ledger Subtotal</span>
                        <span className="text-foreground">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-end pt-4 border-t border-dashed border-border/50">
                        <span className="text-sm font-black text-foreground uppercase tracking-widest">Total Due</span>
                        <span className="text-3xl font-black text-primary font-display tracking-tighter">{formatPrice(total)}</span>
                    </div>
                </div>
                <button
                    onClick={() => setShowPaymentModal(true)}
                    disabled={cart.length === 0}
                    className="w-full h-16 bg-foreground text-background rounded-2xl font-black uppercase text-sm tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100 shadow-foreground/20"
                >
                    <CreditCard className="w-6 h-6" />
                    AUTHORIZE SALE
                </button>
            </div>
        </div>
    );
}

export default function POSPage() {
    const [branchData, setBranchData] = useState<any>(null);
    const { user } = useAuth();
    const { formatPrice } = useCurrency(branchData);
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [loading, setLoading] = useState(true);
    const [showScanner, setShowScanner] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showCart, setShowCart] = useState(false);
    const [currentSale, setCurrentSale] = useState<any>(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingSync, setPendingSync] = useState(0);

    useEffect(() => {
        fetchProducts();
        fetchBranchData();
        checkPendingSync();

        // Global focus on search
        const timer = setTimeout(() => {
            const input = document.getElementById('pos-search-input');
            if (input) input.focus();
        }, 500);

        const handleOnline = () => {
            setIsOnline(true);
            syncOfflineSales();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const checkPendingSync = async () => {
        const count = await db.offlineSales.where('status').equals('pending').count();
        setPendingSync(count);
    };

    const fetchBranchData = async () => {
        try {
            const response = await api.get('/branches/me');
            setBranchData(response.data.branch);
        } catch (error) {
            console.error('Error fetching branch data:', error);
        }
    };

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await api.listProducts();
            const mappedProducts = (response.data.products || []).map((p: any) => ({
                id: p.id,
                name: p.name,
                imageUrl: p.imageUrl,
                price: p.basePrice || 0,
                stockQty: p.stockQuantity || 0,
                category: p.category || 'Uncategorized',
                sku: p.sku || '',
                barcode: p.barcode || '',
                barcodes: p.barcodes || [],
                lowStockAlert: p.lowStockAlert || 5,
                updatedAt: Date.now()
            }));
            
            setProducts(mappedProducts);

            // Sync to IndexedDB
            await db.products.bulkPut(mappedProducts as any);
        } catch (error) {
            console.error('Error fetching products, falling back to local DB:', error);
            const localProducts = await db.products.toArray();
            if (localProducts.length > 0) {
                setProducts(localProducts as any);
                toast('Using offline product catalog', { icon: '📡' });
            }
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (product: Product) => {
        const existingItem = cart.find(item =>
            item.product_id === product.id && item.variant_id === (product.variantId || null)
        );

        if (existingItem) {
            if (existingItem.quantity >= product.stockQty) {
                toast.error('Insufficient Stock');
                return;
            }
            setCart(cart.map(item =>
                (item.product_id === product.id && item.variant_id === (product.variantId || null))
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setCart([...cart, {
                product_id: product.id,
                variant_id: product.variantId || null,
                name: product.name,
                imageUrl: product.imageUrl,
                price: product.price,
                quantity: 1,
                stockQty: product.stockQty,
                variantName: product.variantName
            }]);
        }
    };

    const updateQuantity = (productId: string, variantId: string | null = null, delta: number) => {
        setCart(cart.map(item => {
            if (item.product_id === productId && item.variant_id === variantId) {
                const newQty = Math.max(0, item.quantity + delta);
                if (newQty > item.stockQty) return item;
                return { ...item, quantity: newQty };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const total = subtotal;

    const onPaymentComplete = async (payments: any[]) => {
        const saleData = {
            items: cart.map(item => ({
                productId: item.product_id,
                variantId: item.variant_id,
                quantity: item.quantity,
                price: item.price,
                name: item.name
            })),
            payments,
            totalAmount: total,
            branchId: user?.branchId,
            offlineId: crypto.randomUUID()
        };

        try {
            setLoading(true);
            const response = await api.createSale(saleData);
            const completedSale = response.data.sale;

            setCurrentSale(completedSale);
            setShowPaymentModal(false);
            setShowReceipt(true);
            setCart([]);
            fetchProducts();
            toast.success('Sale completed successfully!');
        } catch (error) {
            console.error('Error processing sale, queueing offline:', error);
            
            // Queue for offline
            await db.offlineSales.add({
                saleData,
                createdAt: Date.now(),
                status: 'pending',
                retryCount: 0
            });
            
            checkPendingSync();
            
            // Mock a successful UI state for the cashier
            const mockSale = {
                ...saleData,
                receiptId: 'OFFLINE-' + Date.now().toString().slice(-6),
                createdAt: new Date().toISOString()
            };
            
            setCurrentSale(mockSale);
            setShowPaymentModal(false);
            setShowReceipt(true);
            setCart([]);
            toast('Sale queued (Offline)', { icon: '📦' });
        } finally {
            setLoading(false);
        }
    };

    const syncOfflineSales = async () => {
        const pending = await db.offlineSales.where('status').equals('pending').toArray();
        if (pending.length === 0) return;

        toast.loading(`Syncing ${pending.length} offline sales...`, { id: 'sync-toast' });
        
        for (const sale of pending) {
            try {
                await api.createSale(sale.saleData);
                await db.offlineSales.delete(sale.id!);
            } catch (err) {
                console.error('Failed to sync sale:', sale.id, err);
                await db.offlineSales.update(sale.id!, { retryCount: sale.retryCount + 1 });
            }
        }
        
        checkPendingSync();
        toast.success('Sync complete', { id: 'sync-toast' });
        fetchProducts(); // Refresh stock after sync
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.barcodes.some(b => b.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const categories = ['All', ...new Set(products.map(p => p.category))];

    useScanDetection({
        onScan: (barcode) => {
            handleScan(barcode);
        },
        minLength: 3,
        timeLimit: 50
    });

    const handleScan = async (barcode: string) => {
        if (!barcode) return;

        // 1. Memory Check
        let product = products.find(p =>
            p.sku === barcode ||
            p.barcode === barcode ||
            p.barcodes.includes(barcode) ||
            p.id === barcode
        );

        // 2. DB Check (Optimized)
        if (!product) {
            const dbProduct = await db.products
                .where('sku').equals(barcode)
                .or('barcode').equals(barcode)
                .or('barcodes').equals(barcode)
                .first();
            
            if (dbProduct) {
                product = dbProduct as any;
                setProducts(prev => [...prev, product!]);
            }
        }

        if (product) {
            addToCart(product);
            toast.success(`Added ${product.name}`);
            setShowScanner(false);
            return;
        }

        // 3. Network Fallback
        if (isOnline) {
            try {
                const response = await api.searchProduct(barcode, branchData?.id);
                if (response.data.product) {
                    const p = response.data.product;
                    setProducts(prev => [...prev, p]);
                    await db.products.put(p);
                    addToCart(p);
                    toast.success(`Added ${p.name}`);
                }
            } catch (error) {
                console.error('Scan lookup failed:', error);
                setSearchTerm(barcode);
                toast.error('Product not found');
            }
        } else {
            setSearchTerm(barcode);
            toast.error('Offline: Product not in local catalog');
        }
        setShowScanner(false);
    };

    return (
        <div className="h-full bg-background flex flex-col overflow-hidden font-body transition-colors duration-500">
            {/* Header - Glassmorphism */}
            <header className="flex-none h-20 glass border-b px-4 lg:px-8 flex items-center justify-between z-30 sticky top-0">
                <div className="flex items-center gap-4 lg:gap-6">
                    <Link to="/dashboard" className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground shadow-xl shadow-primary/20 hover:scale-105 transition-all group">
                        <Store className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2 uppercase">
                            RE <span className="text-primary hidden sm:inline">TERMINAL</span>
                        </h1>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-destructive'}`}></span>
                            <span className="truncate">{user?.firstName} @ {branchData?.name || 'Loading...'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 lg:gap-5">
                    {pendingSync > 0 && (
                        <button onClick={syncOfflineSales} className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase animate-pulse">
                            <RefreshCw className="w-3 h-3" /> {pendingSync} Pending
                        </button>
                    )}
                    {!isOnline && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 text-destructive rounded-xl text-[10px] font-black uppercase">
                            <WifiOff className="w-3 h-3" /> Offline
                        </div>
                    )}
                    <button
                        onClick={() => setShowHistory(true)}
                        className="p-3 bg-secondary/50 text-foreground hover:bg-primary/20 hover:text-primary rounded-2xl transition-all flex items-center gap-2 group"
                    >
                        <History className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-wider hidden lg:inline">Records</span>
                    </button>
                    <div className="hidden sm:flex">
                        <ThemeToggle />
                    </div>
                    <button
                        onClick={() => window.location.href = '/dashboard'}
                        className="p-3 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white rounded-2xl transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col min-w-0 bg-secondary/10">
                    <div className="flex-none p-4 lg:p-8 space-y-6">
                        <div className="relative group max-w-3xl mx-auto w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                id="pos-search-input"
                                type="text"
                                placeholder="Universal Search (Barcode, SKU, Name)..."
                                className="glass-input w-full h-14 pl-12 pr-12 text-sm font-bold shadow-2xl focus:ring-4 focus:ring-primary/20 outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <button
                                onClick={() => setShowScanner(true)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-primary/10 rounded-xl text-primary transition-all"
                            >
                                <Maximize className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat
                                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105'
                                        : 'glass text-muted-foreground hover:bg-secondary'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 lg:px-8 pb-32 lg:pb-8">
                        {loading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
                                {[...Array(10)].map((_, i) => (
                                    <div key={i} className="aspect-[3/4] glass-card animate-pulse rounded-3xl" />
                                ))}
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                                <Package className="w-32 h-32 mb-4" />
                                <p className="font-black uppercase tracking-widest text-sm">No Results Found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
                                {filteredProducts.map(product => (
                                    <button
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        className="glass-card p-3 flex flex-col group text-left"
                                    >
                                        <div className="aspect-square rounded-2xl bg-white overflow-hidden mb-4 relative shadow-inner border border-border/50">
                                            {product.imageUrl ? (
                                                <img src={product.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-secondary/30 text-muted-foreground">
                                                    <Package className="w-12 h-12 opacity-20" />
                                                </div>
                                            )}
                                            <div className="absolute bottom-2 right-2 flex flex-col gap-1 items-end">
                                                <span className={`text-[8px] font-black px-2 py-1 rounded-lg shadow-lg uppercase tracking-widest ${product.stockQty <= product.lowStockAlert ? 'bg-destructive text-white' : 'bg-primary text-primary-foreground'}`}>
                                                    {product.stockQty} Units
                                                </span>
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-xs line-clamp-2 min-h-[2.5rem] px-1 uppercase tracking-tight">{product.name}</h3>
                                        <div className="mt-4 flex items-center justify-between px-1">
                                            <span className="text-sm font-black text-primary tracking-tighter">{formatPrice(product.price)}</span>
                                            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                                                <Plus className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Cart - Desktop */}
                <div className="hidden lg:flex w-[400px] bg-card/30 backdrop-blur-3xl border-l flex-col shadow-2xl z-20">
                    <CartContent
                        cart={cart}
                        setCart={setCart}
                        updateQuantity={updateQuantity}
                        formatPrice={formatPrice}
                        subtotal={subtotal}
                        total={total}
                        setShowPaymentModal={setShowPaymentModal}
                    />
                </div>
            </div>

            {/* Mobile Float Navigation */}
            <div className="lg:hidden fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-40">
                <button
                    onClick={() => setShowCart(true)}
                    className="w-20 h-20 bg-foreground text-background rounded-3xl shadow-2xl flex items-center justify-center relative active:scale-95 transition-all shadow-foreground/30"
                >
                    <ShoppingCart className="w-8 h-8" />
                    {cart.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-black w-7 h-7 rounded-full flex items-center justify-center ring-4 ring-background">
                            {cart.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Full Screen Mobile Cart Drawer */}
            {showCart && (
                <div className="fixed inset-0 z-[100] lg:hidden animate-in fade-in slide-in-from-bottom-10 duration-500">
                    <div className="h-full w-full bg-background flex flex-col">
                        <div className="flex-none h-20 glass border-b flex items-center justify-between px-8">
                            <div className="flex items-center gap-3">
                                <ShoppingCart className="text-primary w-5 h-5" />
                                <h2 className="font-black uppercase tracking-widest text-xs">Ledger Overview</h2>
                            </div>
                            <button onClick={() => setShowCart(false)} className="w-12 h-12 bg-secondary/50 rounded-2xl flex items-center justify-center"><X /></button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <CartContent
                                cart={cart}
                                setCart={setCart}
                                updateQuantity={updateQuantity}
                                formatPrice={formatPrice}
                                subtotal={subtotal}
                                total={total}
                                setShowPaymentModal={setShowPaymentModal}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            {showScanner && (
                <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
            )}

            {showReceipt && currentSale && (
                <ReceiptModal
                    sale={currentSale}
                    companyName="RetailPro"
                    onClose={() => {
                        setShowReceipt(false);
                        setCurrentSale(null);
                        setCart([]);
                    }}
                />
            )}

            {showPaymentModal && (
                <PaymentModal
                    total={total}
                    branchConfig={branchData}
                    onComplete={onPaymentComplete}
                    onClose={() => setShowPaymentModal(false)}
                />
            )}

            {showHistory && (
                <TransactionHistoryModal
                    onClose={() => setShowHistory(false)}
                />
            )}
        </div>
    );
}
