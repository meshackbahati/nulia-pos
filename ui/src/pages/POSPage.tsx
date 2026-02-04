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
        <div className="min-h-screen gradient-bg flex flex-col">
            {/* Mobile Responsiveness Fixes */}
            <style>{`
                @media (max-width: 640px) {
                    .warm-card { padding: 1rem; margin: 0.5rem; }
                    .warm-input { height: 2.75rem; font-size: 0.875rem; }
                    header { margin: 0.5rem; padding: 1rem; }
                    .grid { gap: 0.75rem; }
                }
                @media (max-width: 768px) {
                    .lg\:col-span-8 { grid-column: span 12 / span 12; }
                    .lg\:col-span-4 { grid-column: span 12 / span 12; }
                    .text-display { font-size: 1.25rem; }
                }
            `}</style>
            {/* Terminal Header */}
            <header className="warm-card mx-6 mt-4 mb-6 px-6 py-4">
                <div className="max-w-[1800px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground shadow-sm">
                            <Store className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-display text-foreground">
                                BorderShop <span className="text-primary">POS</span>
                            </h1>
                            <div className="flex items-center gap-2 text-responsive-micro text-muted-foreground mt-1">
                                <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                                Terminal #01 • {user?.firstName || 'User'}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 bg-secondary rounded-md px-3 py-1.5 text-responsive-micro text-muted-foreground">
                            <Clock className="w-4 h-4 text-primary" />
                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <ThemeToggle />
                        <button 
                            onClick={() => console.log('[POS] Logout initiated')}
                            className="p-2 text-muted-foreground hover:text-error transition-colors active-press"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-[1800px] mx-auto w-full p-6 overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">

                    {/* Left: Products */}
                    <div className="lg:col-span-8 flex flex-col min-h-0 space-y-6">
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search products..."
                                    className="warm-input pl-11 h-12"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        console.log('[POS] Search term changed:', e.target.value);
                                        setSearchTerm(e.target.value);
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        console.log('[POS] Barcode scanner opened');
                                        setShowScanner(true);
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-secondary rounded-md transition-colors active-press"
                                >
                                    <Maximize className="w-4 h-4 text-primary" />
                                </button>
                            </div>

                            <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => {
                                            console.log('[POS] Category selected:', cat);
                                            setSelectedCategory(cat);
                                        }}
                                        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${selectedCategory === cat
                                                ? 'bg-primary text-primary-foreground shadow-sm'
                                                : 'bg-secondary border border-border text-muted-foreground hover:border-primary'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
                            {loading ? (
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                        <div key={i} className="h-48 warm-card animate-pulse"></div>
                                    ))}
                                </div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-12 warm-card border-2 border-dashed border-border rounded-xl">
                                    <Package className="w-12 h-12 text-muted-foreground mb-4" />
                                    <h3 className="text-display text-foreground mb-1">No products found</h3>
                                    <p className="text-responsive-micro text-muted-foreground">Try adjusting your search or category filters.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pb-6">
                                    {filteredProducts.map(product => (
                                        <div
                                            key={product.id}
                                            onClick={() => {
                                                console.log('[POS] Product added to cart:', product.name);
                                                addToCart(product);
                                            }}
                                            className="warm-card overflow-hidden cursor-pointer hover-lift active-press"
                                        >
                                            <div className="aspect-square bg-secondary relative">
                                                {product.imageUrl ? (
                                                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Package className="w-8 h-8 text-muted-foreground" />
                                                    </div>
                                                )}
                                                {product.stockQty <= product.lowStockAlert && (
                                                    <span className="absolute top-2 right-2 bg-error text-primary-foreground text-[10px] px-2 py-0.5 rounded-full font-bold">
                                                        Low Stock
                                                    </span>
                                                )}
                                            </div>
                                            <div className="p-3">
                                                <h3 className="font-bold text-foreground text-sm truncate">{product.name}</h3>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-primary font-bold">{formatCurrency(product.price)}</span>
                                                    <span className="text-[10px] text-muted-foreground font-medium">{product.stockQty} left</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Cart */}
                    <div className="lg:col-span-4 flex flex-col h-full min-h-0">
                        <div className="warm-card flex flex-col h-full">
                            <div className="p-4 border-b border-border flex items-center justify-between">
                                <h2 className="font-bold text-foreground flex items-center gap-2">
                                    <ShoppingCart className="w-4 h-4" />
                                    Current Order
                                </h2>
                                <button 
                                    onClick={() => {
                                        console.log('[POS] Cart cleared');
                                        setCart([]);
                                    }} 
                                    className="text-muted-foreground hover:text-error p-1 active-press"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                {cart.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                                        <ShoppingCart className="w-10 h-10 mb-2 opacity-20" />
                                        <p className="text-responsive-micro">Empty cart</p>
                                    </div>
                                ) : (
                                    cart.map(item => (
                                        <div key={item.product_id + (item.variant_id || '')} className="flex gap-3 py-2 border-b border-border last:border-0">
                                            <div className="w-12 h-12 rounded bg-secondary flex-shrink-0 overflow-hidden">
                                                {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-semibold truncate text-foreground">{item.name}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <button 
                                                        onClick={() => {
                                                            console.log('[POS] Quantity decreased for:', item.name);
                                                            updateQuantity(item.product_id, item.variant_id || null, -1);
                                                        }} 
                                                        className="p-1 hover:bg-secondary rounded border border-border active-press"
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </button>
                                                    <span className="text-sm w-4 text-center font-bold text-foreground">{item.quantity}</span>
                                                    <button 
                                                        onClick={() => {
                                                            console.log('[POS] Quantity increased for:', item.name);
                                                            updateQuantity(item.product_id, item.variant_id || null, 1);
                                                        }} 
                                                        className="p-1 hover:bg-secondary rounded border border-border active-press"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-foreground">{formatCurrency(item.price * item.quantity)}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-4 bg-secondary border-t border-border space-y-3">
                                <div className="flex justify-between text-responsive-micro text-muted-foreground">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-display text-foreground pt-2">
                                    <span>Total</span>
                                    <span className="text-primary">{formatCurrency(total)}</span>
                                </div>
                                <button
                                    onClick={() => {
                                        console.log('[POS] Checkout initiated');
                                        setShowPaymentModal(true);
                                    }}
                                    disabled={cart.length === 0}
                                    className="warm-button--primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    Checkout
                                    <CreditCard className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

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
