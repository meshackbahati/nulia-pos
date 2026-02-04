import { useState, useEffect } from 'react';
import api from '../lib/api-client';
import ProductModal from '../components/ProductModal';
import RestockModal from '../components/RestockModal';
import { Plus, Package, AlertTriangle, PlusCircle, Search } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

interface Product {
    id: string;
    name: string;
    description?: string;
    category: string;
    brand?: string;
    basePrice: number;
    costPrice: number;
    sku: string;
    barcode?: string;
    imageUrl?: string;
    stockQuantity: number;
    lowStockThreshold: number;
    isActive: boolean;
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [restockingProduct, setRestockingProduct] = useState<Product | null>(null);

    useEffect(() => {
        fetchProducts();
    }, []);

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

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this product?')) return;
        try {
            await api.deleteProduct(id);
            setProducts(products.filter((p) => p.id !== id));
        } catch (error) {
            console.error('Error deleting product:', error);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-300">
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                            <Package className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                                Product <span className="text-blue-600">Inventory</span>
                            </h1>
                            <p className="text-xs text-slate-500 font-medium">Control stock levels and catalog items</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="modern-button bg-blue-600 text-white flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden md:inline uppercase text-xs font-bold">Register Item</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full px-6 py-8 space-y-8 animate-in">
                {/* Search & Stats */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search catalog..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="modern-input pl-12 h-11"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Catalog Size:</span>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1 rounded-full text-xs font-bold text-blue-600 shadow-sm">
                            {products.length} Units
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-dash border-slate-200 dark:border-slate-800 p-16 text-center rounded-2xl">
                        <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">No products found</h3>
                        <p className="text-slate-500 text-sm mt-1">Start by adding your first item to the terminal inventory.</p>
                        <button onClick={() => setShowAddModal(true)} className="mt-6 modern-button bg-blue-600 text-white">Add Item</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredProducts.map((product) => (
                            <div key={product.id} className="modern-card p-4 flex flex-col group">
                                <div className="aspect-square bg-slate-50 dark:bg-slate-800 rounded-lg overflow-hidden relative mb-4">
                                    {product.imageUrl ? (
                                        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center">
                                            <Package className="w-8 h-8 text-slate-300" />
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2">
                                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-white/90 dark:bg-slate-800/90 text-blue-600 rounded">
                                            {product.category}
                                        </span>
                                    </div>
                                    {product.stockQuantity <= product.lowStockThreshold && (
                                        <div className="absolute top-2 right-2">
                                            <div className="p-1 bg-red-500 text-white rounded-full shadow-lg">
                                                <AlertTriangle className="w-3 h-3" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1 mb-4 flex-1">
                                    <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">{product.name}</h3>
                                    <div className="flex items-center justify-between">
                                        <span className="text-blue-600 font-bold text-sm">${product.basePrice.toFixed(2)}</span>
                                        <span className="text-[10px] text-slate-400 font-medium">SKU: {product.sku}</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Stock</p>
                                            <p className={`text-xs font-bold ${product.stockQuantity <= product.lowStockThreshold ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                                                {product.stockQuantity} Units
                                            </p>
                                        </div>
                                        <button onClick={() => setRestockingProduct(product)} className="text-green-500 hover:text-green-600 transition-colors">
                                            <PlusCircle className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="flex gap-2">
                                        <button onClick={() => setEditingProduct(product)} className="flex-1 h-8 modern-button bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-600 font-bold">Edit</button>
                                        <button onClick={() => handleDelete(product.id)} className="flex-1 h-8 modern-button bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] hover:bg-red-50 dark:hover:bg-red-900/40 hover:text-red-600 font-bold">Delete</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Modals */}
            {(showAddModal || editingProduct) && (
                <ProductModal
                    product={editingProduct || undefined}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingProduct(null);
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
        </div>
    );
}
