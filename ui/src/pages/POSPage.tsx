import { useState, useEffect } from 'react';
import api from '../lib/api-client';
import PaymentModal from '../components/PaymentModal';
import ReceiptModal from '../components/ReceiptModal';
import BarcodeScanner from '../components/BarcodeScanner';
import ThemeToggle from '../components/ThemeToggle';
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
    CreditCard
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../lib/utils';
import { Link } from 'react-router-dom';

interface Product {
    id: string;
    variantId?: string;
    name: string;
    imageUrl?: string;
    price: number;
    stockQty: number;
    category: string;
    sku: string;
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

export default function POSPage() {
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [loading, setLoading] = useState(true);
    const [showScanner, setShowScanner] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [currentSale, setCurrentSale] = useState<any>(null);

    useEffect(() => {
        fetchProducts();
    }, []);

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

    const onPaymentComplete = async (_paymentMethod: string, sale: any) => {
        setCurrentSale(sale);
        setShowPaymentModal(false);
        setShowReceipt(true);
        setCart([]);
        fetchProducts();
    };

    const handleScan = (_barcode: string) => {
        setShowScanner(false);
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const categories = ['All', ...new Set(products.map(p => p.category))];

    return (
        <div className="h-screen bg-background flex flex-col overflow-hidden font-body">
            {/* Header */}
            <header className="flex-none h-16 bg-card border-b px-4 lg:px-6 flex items-center justify-between z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                        <Store className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold font-display tracking-tight text-foreground">
                            BorderShop <span className="text-primary">POS</span>
                        </h1>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Online • {user?.firstName || 'User'}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-foreground">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <ThemeToggle />
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
                                                    {formatCurrency(product.price)}
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

                {/* Sidebar Cart */}
                <div className="w-96 bg-card border-l flex flex-col shadow-2xl z-30">
                    <div className="p-5 border-b flex items-center justify-between bg-card/50 backdrop-blur">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-primary" />
                            <h2 className="font-bold text-lg">Current Order</h2>
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
                                <p className="text-sm font-medium">Cart is empty</p>
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
                                            <p className="text-xs font-medium text-primary mt-0.5">{formatCurrency(item.price)}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => updateQuantity(item.product_id, item.variant_id || null, -1)}
                                                className="w-6 h-6 rounded flex items-center justify-center bg-white dark:bg-black border shadow-sm hover:bg-secondary transition-colors"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.product_id, item.variant_id || null, 1)}
                                                className="w-6 h-6 rounded flex items-center justify-center bg-white dark:bg-black border shadow-sm hover:bg-secondary transition-colors"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-col justify-between items-end">
                                        <p className="font-bold text-foreground">{formatCurrency(item.price * item.quantity)}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-5 border-t bg-card shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                        <div className="space-y-3 mb-4">
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Subtotal</span>
                                <span className="font-medium text-foreground">{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between items-end pt-2 border-t border-dashed">
                                <span className="text-lg font-bold">Total</span>
                                <span className="text-2xl font-black text-primary font-display">{formatCurrency(total)}</span>
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
                </div>
            </div>

            {/* Modals */}
            {showScanner && (
                <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
            )}

            {showReceipt && currentSale && (
                <ReceiptModal
                    sale={currentSale}
                    companyName="BorderShop"
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
                    onComplete={onPaymentComplete}
                    onClose={() => setShowPaymentModal(false)}
                />
            )}
        </div>
    );
}
