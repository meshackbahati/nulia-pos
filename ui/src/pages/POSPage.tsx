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
    Clock,
    LogOut,
    Maximize,
    Package,
    Trash2,
    Minus,
    CreditCard,
    History
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../hooks/useCurrency';
import { Link } from 'react-router-dom';
import useScanDetection from '../hooks/useScanDetection';

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
        <>
            <div className="p-4 lg:p-5 border-b flex items-center justify-between bg-card/50 backdrop-blur">
                <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-lg text-foreground">Current Order</h2>
                </div>
                <button
                    onClick={() => setCart([])}
                    disabled={cart.length === 0}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
                        <ShoppingCart className="w-16 h-16 mb-4 text-muted-foreground/50" />
                        <p className="text-sm font-medium text-foreground">Cart is empty</p>
                        <p className="text-xs text-muted-foreground mt-1">Scan items or select from grid</p>
                    </div>
                ) : (
                    cart.map(item => (
                        <div key={item.product_id + (item.variant_id || '')} className="flex gap-4 p-3 rounded-xl bg-secondary/30 border border-transparent hover:border-border transition-colors group">
                            <div className="w-16 h-16 rounded-lg bg-white overflow-hidden shadow-sm flex-shrink-0">
                                {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-secondary">
                                        <Package className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div>
                                    <h4 className="text-sm font-bold text-foreground line-clamp-1">{item.name}</h4>
                                    <p className="text-xs font-medium text-primary mt-0.5">{formatPrice(item.price)}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => updateQuantity(item.product_id, item.variant_id || null, -1)}
                                        className="w-6 h-6 rounded flex items-center justify-center bg-white dark:bg-black border shadow-sm hover:bg-secondary transition-colors"
                                    >
                                        <Minus className="w-3 h-3 text-foreground" />
                                    </button>
                                    <span className="text-sm font-bold w-4 text-center text-foreground">{item.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(item.product_id, item.variant_id || null, 1)}
                                        className="w-6 h-6 rounded flex items-center justify-center bg-white dark:bg-black border shadow-sm hover:bg-secondary transition-colors"
                                    >
                                        <Plus className="w-3 h-3 text-foreground" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col justify-between items-end">
                                <p className="font-bold text-foreground">{formatPrice(item.price * item.quantity)}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 lg:p-5 border-t bg-card shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Subtotal</span>
                        <span className="font-medium text-foreground">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-end pt-2 border-t border-dashed">
                        <span className="text-lg font-bold text-foreground">Total</span>
                        <span className="text-2xl font-black text-primary font-display">{formatPrice(total)}</span>
                    </div>
                </div>
                <button
                    onClick={() => setShowPaymentModal(true)}
                    disabled={cart.length === 0}
                    className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg shadow-lg shadow-primary/25 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none"
                >
                    <CreditCard className="w-5 h-5" />
                    Checkout
                </button>
            </div>
        </>
    );
}

export default function POSPage() {
    const [branchData, setBranchData] = useState<any>(null);
    const { user } = useAuth();
    // Use fetched branchData for currency settings (live from DB) instead of potentially stale user context
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

    useEffect(() => {
        fetchProducts();
        fetchBranchData();
    }, []);

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
                lowStockAlert: p.lowStockAlert || 5
            }));
            setProducts(mappedProducts);
        } catch (error) {
            console.error('Error fetching products:', error);
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

    const onPaymentComplete = async (paymentMethod: string, paymentDetails: any) => {
        try {
            setLoading(true);
            const saleData = {
                items: cart.map(item => ({
                    productId: item.product_id,
                    variantId: item.variant_id,
                    quantity: item.quantity,
                    price: item.price,
                    name: item.name
                })),
                paymentMethod,
                ...paymentDetails, // amountReceived, change, customerPhone, etc.
                totalAmount: total,
                branchId: user?.branchId
            };

            const response = await api.createSale(saleData);
            const completedSale = response.data.sale;

            setCurrentSale(completedSale);
            setShowPaymentModal(false);
            setShowReceipt(true);
            setCart([]);
            fetchProducts(); // Refresh stock
            // toast.success('Sale completed!');
        } catch (error) {
            console.error('Error processing sale:', error);
            // toast.error('Failed to process sale');
            // Re-throw or handle error so PaymentModal knows? 
            // PaymentModal catches errors from onComplete, so we throw.
            throw error;
        } finally {
            setLoading(false);
        }
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

    // Handle barcode scan (from hardware scanner)
    useScanDetection({
        onScan: (barcode) => {
            handleScan(barcode);
        },
        minLength: 3,
        timeLimit: 50 // Standard for HID scanners
    });

    const handleScan = (barcode: string) => {
        // Try to find product by SKU, Primary Barcode, or the barcodes array
        const product = products.find(p =>
            p.sku === barcode ||
            p.barcode === barcode ||
            p.barcodes.includes(barcode) ||
            p.id === barcode
        );

        if (product) {
            addToCart(product);
            // toast.success(`Added ${product.name}`);
        } else {
            // Check if it matches a product name loosely? No, scanner is precise.
            // Maybe just set search term
            setSearchTerm(barcode);
            // toast.error('Product not found');
        }
        setShowScanner(false);
    };

    return (
        <div className="h-full bg-background flex flex-col overflow-hidden font-body">
            {/* Header */}
            <header className="flex-none h-16 bg-card border-b px-3 lg:px-6 flex items-center justify-between z-20 shadow-sm">
                <div className="flex items-center gap-3 lg:gap-4">
                    <Link to="/dashboard" className="w-9 h-9 lg:w-10 lg:h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 hover:scale-105 transition-transform shrink-0">
                        <Store className="w-4 h-4 lg:w-5 lg:h-5" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-lg lg:text-xl font-bold font-display tracking-tight text-foreground truncate">
                            BorderShop <span className="text-primary lg:inline hidden">POS</span>
                        </h1>
                        <div className="flex items-center gap-1.5 lg:gap-2 text-[10px] lg:text-xs text-muted-foreground font-medium">
                            <span className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                            <span className="truncate">{user?.firstName || 'User'}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 lg:gap-3">
                    <div className="hidden sm:flex flex-col items-end gap-0.5 bg-secondary/30 px-2 lg:px-3 py-1 rounded-lg">
                        <div className="flex items-center gap-1.5 text-[10px] lg:text-xs font-mono font-medium text-foreground">
                            <Clock className="w-3 h-3 text-primary" />
                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[9px] lg:text-[10px] font-bold text-muted-foreground uppercase tracking-tight hidden lg:block">
                            Terminal: {user?.branchId || 'Main Branch'}
                        </div>
                    </div>
                    <button
                        onClick={() => setShowHistory(true)}
                        className="p-2 lg:p-2.5 bg-secondary/50 text-foreground hover:bg-primary/10 hover:text-primary rounded-xl transition-all flex items-center gap-2 group"
                        title="Transaction History"
                    >
                        <History className="w-5 h-5 transition-transform group-hover:rotate-12" />
                        <span className="text-xs font-bold hidden lg:inline">History</span>
                    </button>
                    <div className="hidden sm:block">
                        <ThemeToggle />
                    </div>
                    <button
                        onClick={() => window.location.href = '/dashboard'}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Content Area (Products) */}
                <div className="flex-1 flex flex-col min-w-0 bg-secondary/20">
                    {/* Search & Filters */}
                    <div className="flex-none p-4 pb-0 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search products by name or SKU..."
                                className="w-full h-12 rounded-xl bg-card border border-input pl-11 pr-12 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <button
                                onClick={() => setShowScanner(true)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-secondary rounded-lg text-primary transition-colors"
                            >
                                <Maximize className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap shadow-sm ${selectedCategory === cat
                                        ? 'bg-primary text-primary-foreground shadow-primary/25'
                                        : 'bg-card text-muted-foreground hover:bg-secondary border border-transparent hover:border-border'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Product Grid */}
                    <div className="flex-1 overflow-y-auto p-4 pt-0">
                        {loading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                    <div key={i} className="aspect-[4/5] bg-card rounded-2xl animate-pulse ring-1 ring-border/50"></div>
                                ))}
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4">
                                    <Package className="w-10 h-10 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-bold text-foreground">No products found</h3>
                                <p className="text-muted-foreground mt-1">Try searching for something else</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-20 lg:pb-4">
                                {filteredProducts.map(product => (
                                    <button
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        className="group relative flex flex-col bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ring-1 ring-border/50 text-left"
                                    >
                                        {/* Image Area */}
                                        <div className="aspect-square bg-white relative overflow-hidden">
                                            {product.imageUrl ? (
                                                <img
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-secondary/50">
                                                    <Package className="w-12 h-12 text-muted-foreground/50" />
                                                </div>
                                            )}

                                            {/* Stock Badge */}
                                            <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                                                {product.stockQty <= product.lowStockAlert && (
                                                    <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                                                        Low Stock
                                                    </span>
                                                )}
                                                <span className="bg-background/90 backdrop-blur text-foreground text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                                                    {product.stockQty} left
                                                </span>
                                            </div>
                                        </div>

                                        {/* Content Area */}
                                        <div className="p-4 flex flex-col flex-1">
                                            <h3 className="font-bold text-sm text-foreground line-clamp-2 mb-auto leading-tight">
                                                {product.name}
                                            </h3>
                                            <div className="mt-3 flex items-end justify-between">
                                                <span className="text-lg font-black text-primary font-display">
                                                    {formatPrice(product.price)}
                                                </span>
                                                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Plus className="w-5 h-5" />
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Cart - Desktop */}
                <div className="hidden lg:flex w-96 bg-card border-l flex-col shadow-2xl z-20">
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

                {/* Mobile Cart Drawer Overlay */}
                {showCart && (
                    <div className="fixed inset-0 z-50 lg:hidden">
                        <div
                            className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
                            onClick={() => setShowCart(false)}
                        />
                        <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-card shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                            <div className="flex-none p-4 flex items-center justify-between border-b">
                                <h3 className="font-bold">Cart Items ({cart.length})</h3>
                                <button onClick={() => setShowCart(false)} className="p-2 hover:bg-secondary rounded-lg">
                                    <Plus className="w-5 h-5 rotate-45" />
                                </button>
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
            </div>

            {/* Floating Cart Button (Mobile Only) */}
            <button
                onClick={() => setShowCart(true)}
                className="lg:hidden fixed bottom-6 right-6 w-16 h-16 bg-primary text-primary-foreground rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center z-40 hover:scale-110 active:scale-95 transition-all"
            >
                <div className="relative">
                    <ShoppingCart className="w-7 h-7" />
                    {cart.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-primary">
                            {cart.length}
                        </span>
                    )}
                </div>
            </button>

            {/* Modals */}
            {showScanner && (
                <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
            )}

            {showReceipt && currentSale && (
                <ReceiptModal
                    sale={currentSale}
                    companyName="RetailPro POS"
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
