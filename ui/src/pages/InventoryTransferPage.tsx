import { useState, useEffect } from 'react';
import { Truck, Search, ArrowRight, Package, Check, X } from 'lucide-react';
import api from '../lib/api-client';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface Product {
    id: string;
    name: string;
    stockQuantity: number;
    baseUnit: string;
    sku: string;
}

interface Branch {
    id: string;
    name: string;
}

export default function InventoryTransferPage() {
    const { user } = useAuth();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [fromBranchId, setFromBranchId] = useState(user?.branchId || '');
    const [toBranchId, setToBranchId] = useState('');
    const [transferItems, setTransferItems] = useState<{ productId: string, name: string, quantity: string, max: number, unit: string }[]>([]);

    useEffect(() => {
        fetchBranches();
        fetchProducts();
    }, [fromBranchId]);

    const fetchBranches = async () => {
        try {
            const res = await api.getBranches();
            setBranches(res.data.branches || []);
        } catch (error) {
            toast.error('Failed to load branches');
        }
    };

    const fetchProducts = async () => {
        if (!fromBranchId) return;
        try {
            setLoading(true);
            const res = await api.listProducts({ branchId: fromBranchId });
            setProducts(res.data.products || []);
        } catch (error) {
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const addItem = (product: Product) => {
        if (transferItems.find(i => i.productId === product.id)) {
            toast.error('Item already in list');
            return;
        }
        setTransferItems([...transferItems, {
            productId: product.id,
            name: product.name,
            quantity: '1',
            max: product.stockQuantity,
            unit: product.baseUnit
        }]);
    };

    const removeItem = (id: string) => {
        setTransferItems(transferItems.filter(i => i.productId !== id));
    };

    const handleTransfer = async () => {
        if (!toBranchId) {
            toast.error('Select destination branch');
            return;
        }
        if (transferItems.length === 0) {
            toast.error('Add items to transfer');
            return;
        }

        setLoading(true);
        try {
            await api.post('/inventory/transfer', {
                fromBranchId,
                toBranchId,
                items: transferItems.map(i => ({
                    productId: i.productId,
                    quantity: parseFloat(i.quantity)
                })),
                reason: 'Stock Redistribution'
            });
            toast.success('Transfer successful');
            setTransferItems([]);
            fetchProducts();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Transfer failed');
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-500/20">
                        <Truck className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight">Stock Transfer</h1>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Move inventory between nodes</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Source & Destination */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-card p-6 space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Source Node</label>
                            <select
                                value={fromBranchId}
                                onChange={(e) => setFromBranchId(e.target.value)}
                                disabled={user?.role !== 'admin'}
                                className="w-full h-12 bg-secondary/30 border border-border rounded-xl px-4 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>

                        <div className="flex justify-center">
                            <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center">
                                <ArrowRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Destination Node</label>
                            <select
                                value={toBranchId}
                                onChange={(e) => setToBranchId(e.target.value)}
                                className="w-full h-12 bg-primary/5 border-2 border-primary/20 rounded-xl px-4 text-xs font-bold uppercase text-primary outline-none focus:ring-4 focus:ring-primary/10"
                            >
                                <option value="">Select Destination...</option>
                                {branches.filter(b => b.id !== fromBranchId).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="glass-card p-6">
                        <h3 className="text-xs font-black uppercase tracking-widest mb-4">Transfer List</h3>
                        <div className="space-y-3">
                            {transferItems.map(item => (
                                <div key={item.productId} className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl border border-border/50">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black uppercase truncate">{item.name}</p>
                                        <p className="text-[8px] font-bold text-muted-foreground uppercase">Available: {item.max} {item.unit}</p>
                                    </div>
                                    <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setTransferItems(transferItems.map(i => i.productId === item.productId ? { ...i, quantity: val } : i));
                                        }}
                                        className="w-16 h-8 bg-background border border-border rounded-lg text-center text-[10px] font-bold"
                                    />
                                    <button onClick={() => removeItem(item.productId)} className="text-destructive hover:bg-destructive/10 p-1 rounded-lg">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {transferItems.length === 0 && (
                                <div className="text-center py-8 opacity-20">
                                    <Package className="w-8 h-8 mx-auto mb-2" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">No items selected</p>
                                </div>
                            )}
                        </div>

                        <button
                            disabled={loading || transferItems.length === 0 || !toBranchId}
                            onClick={handleTransfer}
                            className="w-full h-14 bg-primary text-primary-foreground rounded-xl mt-6 font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                            {loading ? 'EXECUTING...' : 'INITIATE TRANSFER'}
                        </button>
                    </div>
                </div>

                {/* Product Search */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="SEARCH CATALOG BY NAME OR SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-16 bg-card border-2 border-border rounded-2xl pl-12 pr-6 text-sm font-bold uppercase tracking-widest focus:border-primary transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {loading ? (
                            <div className="col-span-full py-20 text-center animate-pulse">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Accessing Node Inventory...</p>
                            </div>
                        ) : filteredProducts.map(product => (
                            <button
                                key={product.id}
                                onClick={() => addItem(product)}
                                className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl hover:border-primary/50 transition-all text-left group"
                            >
                                <div className="w-12 h-12 bg-secondary/50 rounded-xl flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                    <Package className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black uppercase truncate">{product.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">SKU: {product.sku}</span>
                                        <div className="w-1 h-1 rounded-full bg-border" />
                                        <span className="text-[8px] font-black text-primary uppercase tracking-tighter">{product.stockQuantity} {product.baseUnit} IN STOCK</span>
                                    </div>
                                </div>
                                <div className="w-8 h-8 rounded-lg bg-secondary/30 flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                    <Check className="w-4 h-4" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
