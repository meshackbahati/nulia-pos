import { useState, useEffect } from 'react';
import { Decimal } from 'decimal.js';
import api from '../lib/api-client';
import PaymentModal from '../components/PaymentModal';
import ReceiptModal from '../components/ReceiptModal';
import PaymentSuccessModal from '../components/PaymentSuccessModal';
import PrinterSetupModal from '../components/PrinterSetupModal';
import BargainModal from '../components/BargainModal';
import BarcodeScanner from '../components/BarcodeScanner';
import TransactionHistoryModal from '../components/TransactionHistoryModal';
import {
    Plus,
    ShoppingCart,
    Search,
    Maximize,
    Package,
    Trash2,
    Minus,
    CreditCard,
    History,
    X,
    RefreshCw,
    ShoppingBag
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../hooks/useCurrency';
import useScanDetection from '../hooks/useScanDetection';
import toast from 'react-hot-toast';
import { db } from '../lib/db';
import { useSocket } from '../hooks/useSocket';

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
    brand?: string;
    description?: string;
    lowStockAlert: number;
    variantName?: string;
    measurementType?: 'discrete' | 'measurable';
    baseUnit?: string;
    fractionalSalesAllowed?: boolean;
    minimumSaleQuantity?: number;
}

interface CartItem {
    product_id: string;
    variant_id?: string | null;
    name: string;
    imageUrl?: string;
    price: number;
    catalogPrice: number;
    quantity: number;
    stockQty: number;
    variantName?: string;
    measurementType?: 'discrete' | 'measurable';
    baseUnit?: string;
    fractionalSalesAllowed?: boolean;
    minimumSaleQuantity?: number;
}

interface CartContentProps {
    cart: CartItem[];
    setCart: (cart: CartItem[]) => void;
    updateQuantity: (productId: string, variant_id: string | null, delta: number) => void;
    resetPrice: (productId: string, variantId: string | null) => void;
    formatPrice: (price: number) => string;
    subtotal: number;
    total: number;
    setShowPaymentModal: (show: boolean) => void;
    onBargain: (item: CartItem) => void;
}

function CartContent({ cart, setCart, updateQuantity, resetPrice, formatPrice, subtotal, total, setShowPaymentModal, onBargain }: CartContentProps) {
    return (
        <div className="flex flex-col h-full overflow-hidden bg-card/30 backdrop-blur-md">
            <div className="p-6 border-b border-border/50 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
                        <ShoppingCart className="w-5 h-5" />
                    </div>
                    <h2 className="font-black text-[10px] uppercase tracking-[0.3em] text-foreground">Active Order</h2>
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
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <p className="text-[10px] font-bold text-primary">{formatPrice(item.price)}</p>
                                        {item.price !== item.catalogPrice && (
                                            <>
                                                <p className="text-[10px] font-bold text-muted-foreground line-through">{formatPrice(item.catalogPrice)}</p>
                                                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 text-[9px] font-black uppercase tracking-wider">Negotiated</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => updateQuantity(item.product_id, item.variant_id || null, item.measurementType === 'measurable' ? -0.1 : -1)}
                                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-background border shadow-sm hover:bg-primary hover:text-white transition-all"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <input
                                            type="number"
                                            step={item.measurementType === 'measurable' ? "0.01" : "1"}
                                            value={item.quantity}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                if (!isNaN(val)) {
                                                    updateQuantity(item.product_id, item.variant_id || null, val - item.quantity);
                                                }
                                            }}
                                            className="text-xs font-black w-16 text-center text-foreground bg-transparent border-none outline-none focus:ring-0"
                                        />
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.baseUnit}</span>
                                        <button
                                            onClick={() => updateQuantity(item.product_id, item.variant_id || null, item.measurementType === 'measurable' ? 0.1 : 1)}
                                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-background border shadow-sm hover:bg-primary hover:text-white transition-all"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                            onClick={() => onBargain(item)}
                                            className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[9px] font-black uppercase tracking-wider hover:bg-primary/20 transition-all"
                                        >
                                            Bargain
                                        </button>
                                        {item.price !== item.catalogPrice && (
                                            <button
                                                onClick={() => resetPrice(item.product_id, item.variant_id || null)}
                                                className="px-2.5 py-1 rounded-lg bg-secondary text-muted-foreground text-[9px] font-black uppercase tracking-wider hover:text-foreground transition-all"
                                            >
                                                Reset Price
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right flex flex-col justify-end">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">{item.quantity} {item.baseUnit}</p>
                                <p className="text-sm font-black text-foreground tracking-tighter">{formatPrice(item.price * item.quantity)}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-8 border-t border-border/50 bg-card/50 backdrop-blur-xl space-y-6">
                <div className="space-y-3">
                    <div className="flex justify-between text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                        <span>Ledger Subtotal</span>
                        <span className="text-foreground">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-end pt-4 border-t border-dashed border-border/50">
                        <span className="text-xs font-black text-foreground uppercase tracking-[0.3em]">Total Due</span>
                        <span className="text-4xl font-black text-primary font-display tracking-tight">{formatPrice(total)}</span>
                    </div>
                </div>
                <button
                    onClick={() => setShowPaymentModal(true)}
                    disabled={cart.length === 0}
                    className="w-full h-16 bg-primary text-primary-foreground rounded-2xl font-black uppercase text-xs tracking-[0.3em] shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100"
                >
                    <CreditCard className="w-5 h-5" />
                    AUTHORIZE SALE
                </button>
            </div>
        </div>
    );
}

export default function POSPage() {
    const [branchData, setBranchData] = useState<any>(null);
    const { user } = useAuth();
    const { targetCurrency, setTargetCurrency, formatPrice } = useCurrency(branchData);
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [loading, setLoading] = useState(true);
    const [showScanner, setShowScanner] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showBargainModal, setShowBargainModal] = useState(false);
    const [bargainItem, setBargainItem] = useState<CartItem | null>(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showPrinterSetup, setShowPrinterSetup] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [pendingSync, setPendingSync] = useState(0);
    const [showCartMobile, setShowCartMobile] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [currentSale, setCurrentSale] = useState<any>(null);

    const [tillBalance, setTillBalance] = useState(0);

    useSocket({
        'inventory-update': () => {
            console.log('🔄 Inventory update received via Socket');
            fetchProducts();
            fetchDashboardStats();
        },
        'new-sale': (data) => {
            console.log('💰 New sale recorded:', data);
            fetchDashboardStats();
        }
    });

    useEffect(() => {
        fetchProducts();
        fetchBranchData();
        fetchDashboardStats();
        checkPendingSync();

        // Check for printer setup on launch
        const printer = localStorage.getItem('defaultPrinter');
        if (!printer && (window as any).electronAPI) {
            setShowPrinterSetup(true);
        }

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

    const fetchDashboardStats = async () => {
        try {
            const response = await api.get('/analytics/dashboard');
            if (response.data.success) {
                setTillBalance(response.data.stats.todayRevenue || 0);
            }
        } catch (error) {
            console.error('Error fetching till balance:', error);
        }
    };

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setTargetCurrency(e.target.value);
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
                brand: p.brand || '',
                description: p.description || '',
                lowStockAlert: p.lowStockAlert || 5,
                measurementType: p.measurementType,
                baseUnit: p.baseUnit,
                fractionalSalesAllowed: p.fractionalSalesAllowed,
                minimumSaleQuantity: p.minimumSaleQuantity,
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

        const increment = (product.measurementType === 'measurable' && product.minimumSaleQuantity)
            ? product.minimumSaleQuantity
            : 1;

        if (existingItem) {
            if (existingItem.quantity + increment > product.stockQty) {
                toast.error('Insufficient Stock');
                return;
            }
            setCart(cart.map(item =>
                (item.product_id === product.id && item.variant_id === (product.variantId || null))
                    ? { ...item, quantity: Math.round((item.quantity + increment) * 10000) / 10000 }
                    : item
            ));
        } else {
            if (increment > product.stockQty) {
                toast.error('Insufficient Stock');
                return;
            }
            setCart([...cart, {
                product_id: product.id,
                variant_id: product.variantId || null,
                name: product.name,
                imageUrl: product.imageUrl,
                price: product.price,
                catalogPrice: product.price,
                quantity: increment,
                stockQty: product.stockQty,
                variantName: product.variantName,
                measurementType: product.measurementType,
                baseUnit: product.baseUnit,
                fractionalSalesAllowed: product.fractionalSalesAllowed,
                minimumSaleQuantity: product.minimumSaleQuantity
            }]);
        }
    };

    const updateQuantity = (productId: string, variantId: string | null = null, delta: number) => {
        setCart(cart.map(item => {
            if (item.product_id === productId && item.variant_id === variantId) {
                const newQty = Math.max(0, item.quantity + delta);
                // Simple precision fix for JS floats
                const roundedQty = Math.round(newQty * 10000) / 10000;
                if (roundedQty > item.stockQty) {
                    toast.error(`Max available: ${item.stockQty}`);
                    return item;
                }
                return { ...item, quantity: roundedQty };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const updatePrice = (productId: string, variantId: string | null = null, nextPrice: number) => {
        setCart(cart.map(item =>
            item.product_id === productId && item.variant_id === variantId
                ? { ...item, price: nextPrice }
                : item
        ));
    };

    const resetPrice = (productId: string, variantId: string | null = null) => {
        setCart(cart.map(item =>
            item.product_id === productId && item.variant_id === variantId
                ? { ...item, price: item.catalogPrice }
                : item
        ));
    };

    const subtotal = cart.reduce((acc, item) =>
        new Decimal(acc).plus(new Decimal(item.price).times(item.quantity)).toNumber(), 0);
    const total = subtotal;

    const onPaymentComplete = async (payments: any[]) => {
        const saleData = {
            items: cart.map(item => ({
                productId: item.product_id,
                variantId: item.variant_id,
                quantity: item.quantity,
                price: item.price,
                catalogPrice: item.catalogPrice,
                name: item.name,
                baseUnit: item.baseUnit
            })),
            payments,
            totalAmount: total,
            branchId: user?.branchId,
            offlineId: crypto.randomUUID()
        };

        try {
            setLoading(true);
            const response = await api.createSale(saleData);

            // The backend now returns the full sale object with items and payments
            setCurrentSale(response.data.sale);
            setShowPaymentModal(false);
            setShowSuccessModal(true);
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
                subtotal: subtotal,
                tax: (branchData?.taxRate || 0) > 0
                    ? new Decimal(subtotal).times(branchData.taxRate).div(100).toNumber()
                    : 0,
                total: (branchData?.taxRate || 0) > 0
                    ? new Decimal(total).plus(new Decimal(subtotal).times(branchData.taxRate).div(100)).toNumber()
                    : total,
                paymentMethod: payments.map(p => p.method).join(' + '),
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
        const searchLower = searchTerm.toLowerCase().trim();
        
        // If there is a search term, ignore the category filter (matches ProductsPage behavior)
        if (searchLower) {
            const searchWords = searchLower.split(/\s+/).filter(Boolean);
            const searchableFields = [
                p.name || '',
                p.sku || '',
                p.barcode || '',
                ...(p.barcodes || []),
                p.category || '',
                p.brand || '',
                p.description || ''
            ].map(f => f.toLowerCase());

            return searchWords.every(word =>
                searchableFields.some(field => field.includes(word))
            );
        }

        // If no search term, filter by category
        return selectedCategory === 'All' || p.category === selectedCategory;
    });

    const categories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);

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

        // 3. Backend Fallback (Deep Search)
        if (!product && isOnline) {
            try {
                const response = await api.get(`/products/search?q=${barcode}`);
                if (response.data.product) {
                    const p = response.data.product;
                    // Mapped format for local state
                    const mappedProduct: Product = {
                        id: p.id,
                        name: p.name,
                        imageUrl: p.imageUrl,
                        price: p.basePrice || 0,
                        stockQty: p.stockQuantity || 0,
                        category: p.category || 'Uncategorized',
                        brand: p.brand || '',
                        sku: p.sku || '',
                        barcode: p.barcode || '',
                        barcodes: p.barcodes || [],
                        lowStockAlert: p.lowStockAlert || 5,
                        minimumSaleQuantity: p.minimumSaleQuantity
                    };
                    setProducts(prev => [...prev, mappedProduct]);
                    await db.products.put(mappedProduct as any);
                    product = mappedProduct;
                }
            } catch (err) {
                console.error('Barcode lookup failed:', err);
            }
        }

        if (product) {
            addToCart(product);
            toast.success(`Added ${product.name}`);
            setShowScanner(false);
            setSearchTerm(''); // Clear search after successful scan
            return;
        }

        if (!isOnline) {
            toast.error('Offline: Product not in local catalog', { id: 'barcode-error' });
        }
        setShowScanner(false);
    };

    return (
        <div className="h-full bg-background flex flex-col overflow-hidden font-body transition-colors duration-500">
            {/* Action Bar - Secondary Header */}
            <div className="flex-none bg-card/40 backdrop-blur-md border-b border-border/50 px-4 lg:px-8 py-2 flex items-center justify-between z-30">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-destructive'}`} />
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{branchData?.name || 'Loading...'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Currency Selector */}
                    <div className="hidden sm:flex items-center gap-3 mr-2 px-3 py-1 bg-secondary/30 rounded-lg border border-border/50">
                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Currency</span>
                        <select
                            value={targetCurrency}
                            onChange={handleCurrencyChange}
                            className="bg-transparent border-none text-[9px] font-black uppercase tracking-tighter p-0 outline-none focus:ring-0 transition-all cursor-pointer"
                        >
                            <option value="KES">KES</option>
                            <option value="USD">USD</option>
                            <option value="UGX">UGX</option>
                            <option value="TZS">TZS</option>
                        </select>
                    </div>

                    {/* Account Balance */}
                    <div className="hidden md:flex items-center gap-3 px-3 py-1 bg-primary/10 rounded-lg border border-primary/20">
                        <span className="text-[8px] font-black text-primary uppercase tracking-widest">Revenue Today</span>
                        <span className="text-[10px] font-black text-foreground">{formatPrice(tillBalance)}</span>
                    </div>

                    {pendingSync > 0 && (
                        <button onClick={syncOfflineSales} className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-lg text-[9px] font-black uppercase animate-pulse">
                            <RefreshCw className="w-3 h-3" /> {pendingSync}
                        </button>
                    )}
                    <button
                        onClick={() => setShowHistory(true)}
                        className="p-2 text-foreground hover:bg-primary/20 hover:text-primary rounded-lg transition-all flex items-center gap-2 group"
                        title="History"
                    >
                        <History className="w-4 h-4" />
                        <span className="text-[9px] font-black uppercase tracking-wider hidden lg:inline">Records</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area: Responsive Grid */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Left Side: Products and Search */}
                <div className={`flex-1 flex flex-col min-w-0 bg-secondary/5 border-r border-border ${showCartMobile ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="p-3 lg:p-6 space-y-4 lg:space-y-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 lg:p-3 bg-primary/10 rounded-xl lg:rounded-2xl border border-primary/20">
                                    <ShoppingBag className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />
                                </div>
                                <h2 className="text-lg lg:text-2xl font-black text-foreground tracking-tighter uppercase italic">Store<span className="text-primary not-italic">Front</span></h2>
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                                {['All', ...categories].map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-3 py-1.5 lg:px-5 lg:py-2.5 rounded-lg lg:rounded-xl text-[10px] lg:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedCategory === cat
                                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                            : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground border border-border'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="relative group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                                <Search className="w-4 h-4 lg:w-5 lg:h-5" />
                            </div>
                            <input
                                id="pos-search-input"
                                type="text"
                                placeholder="Search by name, brand, category, or scan..."
                                className="w-full h-12 lg:h-16 bg-card border-2 border-border rounded-xl lg:rounded-2xl pl-12 pr-12 lg:pl-14 lg:pr-14 text-sm lg:text-lg font-bold placeholder:text-muted-foreground/30 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <button 
                                onClick={() => setShowScanner(true)}
                                className="absolute inset-y-0 right-4 flex items-center text-muted-foreground hover:text-primary transition-colors"
                            >
                                <Maximize className="w-5 h-5 lg:w-6 lg:h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Products Grid - Highly Responsive */}
                    <div className="flex-1 overflow-y-auto p-3 lg:p-6 pt-0">
                        {loading ? (
                            <div className="h-full flex flex-col items-center justify-center gap-4 animate-in fade-in">
                                <div className="w-10 h-10 lg:w-12 lg:h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-[10px] lg:text-xs font-black text-muted-foreground uppercase tracking-widest">Indexing Inventory...</p>
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                <div className="w-16 h-16 lg:w-20 lg:h-20 bg-secondary/50 rounded-full flex items-center justify-center mb-4 lg:mb-6">
                                    <Search className="w-8 h-8 lg:w-10 lg:h-10 text-muted-foreground opacity-20" />
                                </div>
                                <h3 className="text-base lg:text-lg font-black text-foreground uppercase tracking-tighter">No items found</h3>
                                <p className="text-xs lg:text-sm text-muted-foreground mt-2 font-bold max-w-xs">Try adjusting your search filters or scan another barcode.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 lg:gap-6">
                                {filteredProducts.map(product => (
                                    <button
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        className="group bg-card hover:bg-secondary/10 border border-border rounded-xl lg:rounded-2xl p-3 lg:p-5 text-left transition-all hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] relative overflow-hidden"
                                    >
                                        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
                                            {product.stockQty <= 5 && (
                                                <span className="px-1.5 py-0.5 bg-destructive/10 text-destructive text-[8px] font-black uppercase rounded-md border border-destructive/20 backdrop-blur-md">Low Stock</span>
                                            )}
                                        </div>
                                        <div className="aspect-square bg-secondary/30 rounded-lg lg:rounded-xl mb-3 lg:mb-4 flex items-center justify-center text-muted-foreground group-hover:scale-105 transition-transform overflow-hidden relative border border-border">
                                            {product.imageUrl ? (
                                                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <ShoppingBag className="w-6 h-6 lg:w-8 lg:h-8 opacity-20" />
                                            )}
                                            {product.category && (
                                                <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/60 text-white text-[7px] font-black uppercase rounded-md backdrop-blur-md">
                                                    {product.category}
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-[10px] lg:text-xs font-black text-foreground uppercase tracking-tight line-clamp-2 leading-tight group-hover:text-primary transition-colors">{product.name}</h3>
                                            <div className="flex items-center justify-between mt-2">
                                                <p className="text-xs lg:text-sm font-black text-primary tracking-tighter">{formatPrice(product.price)}</p>
                                                <p className="text-[8px] lg:text-[10px] font-bold text-muted-foreground">{product.stockQty}{product.baseUnit} in stock</p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Cart - Responsive */}
                <div className={`${showCartMobile ? 'flex fixed inset-0 z-[100]' : 'hidden lg:flex'} lg:relative w-full lg:w-[380px] xl:w-[420px] flex-col bg-card shadow-2xl shrink-0 border-l border-border/50 animate-in slide-in-from-right duration-300`}>
                    <div className="lg:hidden absolute top-4 right-4 z-[110]">
                        <button onClick={() => setShowCartMobile(false)} className="p-2 bg-secondary rounded-full shadow-lg">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    
                    <div className="flex-none p-6 border-b border-border/50 bg-gradient-to-br from-card via-card to-primary/5">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-black text-foreground tracking-tight uppercase italic">Current<span className="text-primary not-italic">Cart</span></h2>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-lg border border-primary/20">{cart.length} ITEMS</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Live Session: {branchData?.id?.substring(0, 8)}</p>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-hidden">
                        <CartContent
                            cart={cart}
                            setCart={setCart}
                            updateQuantity={updateQuantity}
                            resetPrice={resetPrice}
                            formatPrice={formatPrice}
                            subtotal={subtotal}
                            total={total}
                            setShowPaymentModal={setShowPaymentModal}
                            onBargain={(item) => {
                                setBargainItem(item);
                                setShowBargainModal(true);
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Mobile Cart Floating Button */}
            {!showCartMobile && cart.length > 0 && (
                <button
                    onClick={() => setShowCartMobile(true)}
                    className="lg:hidden fixed bottom-6 right-6 w-16 h-16 bg-primary text-primary-foreground rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center z-50 animate-bounce active:scale-95"
                >
                    <div className="relative">
                        <ShoppingBag className="w-7 h-7" />
                        <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 border-primary">
                            {cart.length}
                        </span>
                    </div>
                </button>
            )}

            {/* Modals */}
            {showScanner && (
                <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
            )}

            {showSuccessModal && currentSale && (
                <PaymentSuccessModal
                    isOpen={showSuccessModal}
                    amount={formatPrice(currentSale.totalAmount).split(' ')[1] || formatPrice(currentSale.totalAmount).replace(/[A-Za-z$]/g, '').trim()}
                    currency={formatPrice(currentSale.totalAmount).replace(/[0., ]/g, '') || 'KES'}
                    receiptId={currentSale.receiptId}
                    servedBy={`${currentSale.user?.firstName || user?.firstName} ${currentSale.user?.lastName || user?.lastName}`}
                    onGenerateReceipt={() => {
                        setShowSuccessModal(false);
                        setShowReceipt(true);
                    }}
                    onClose={() => {
                        setShowSuccessModal(false);
                        setCurrentSale(null);
                    }}
                />
            )}

            {showPrinterSetup && (
                <PrinterSetupModal
                    isOpen={showPrinterSetup}
                    onClose={() => setShowPrinterSetup(false)}
                />
            )}

            {showReceipt && currentSale && (
                <ReceiptModal
                    sale={currentSale}
                    companyName={branchData?.name || 'RetailPro'}
                    autoPrint={true}
                    onClose={() => {
                        setShowReceipt(false);
                        setCurrentSale(null);
                    }}
                />
            )}

            {showPaymentModal && (
                <PaymentModal
                    total={total}
                    cart={cart}
                    branchConfig={branchData}
                    onComplete={onPaymentComplete}
                    onClose={() => setShowPaymentModal(false)}
                />
            )}

            {showBargainModal && bargainItem && (
                <BargainModal
                    isOpen={showBargainModal}
                    onClose={() => {
                        setShowBargainModal(false);
                        setBargainItem(null);
                    }}
                    onConfirm={(nextPrice) => {
                        updatePrice(bargainItem.product_id, bargainItem.variant_id || null, nextPrice);
                    }}
                    currentPrice={bargainItem.price}
                    catalogPrice={bargainItem.catalogPrice}
                    productName={bargainItem.name}
                    formatPrice={formatPrice}
                    measurementType={bargainItem.measurementType}
                    baseUnit={bargainItem.baseUnit}
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
