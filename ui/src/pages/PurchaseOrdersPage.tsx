import { useState, useEffect } from 'react';
import { Plus, CheckCircle, X, ShoppingBag, Truck, Calendar, DollarSign, FileText } from 'lucide-react';
import api from '../lib/api-client';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../lib/utils';
import ThemeToggle from '../components/ThemeToggle';

interface PurchaseOrder {
    id: string;
    orderNumber: string;
    supplier: { name: string };
    status: 'pending' | 'ordered' | 'received' | 'cancelled';
    totalAmount: number;
    expectedDeliveryDate?: string;
    createdAt: string;
    items?: any[];
}

interface Supplier {
    id: string;
    name: string;
}

interface Product {
    id: string;
    name: string;
    variants?: any[];
}

export default function PurchaseOrdersPage() {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Create Form State
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [orderItems, setOrderItems] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Item input state
    const [selectedProduct, setSelectedProduct] = useState('');
    const [selectedVariant, setSelectedVariant] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unitCost, setUnitCost] = useState('');

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await api.getPurchaseOrders();
            setOrders(response.data.purchaseOrders || []);
        } catch (error) {
            console.error('Failed to fetch orders', error);
            toast.error('Failed to load purchase orders');
        } finally {
            setLoading(false);
        }
    };

    const fetchFormData = async () => {
        try {
            const [suppliersRes, productsRes] = await Promise.all([
                api.getSuppliers(),
                api.listProducts({ limit: 200 })
            ]);
            setSuppliers(suppliersRes.data.suppliers || []);
            setProducts(productsRes.data.products || []);
        } catch (error) {
            toast.error('Failed to load form data');
        }
    };

    const handleOpenCreate = () => {
        fetchFormData();
        setShowCreateModal(true);
        setOrderItems([]);
        setSelectedSupplier('');
    };

    const handleAddItem = () => {
        if (!selectedProduct || !quantity || !unitCost) {
            toast.error('Please fill all item fields');
            return;
        }

        const product = products.find(p => p.id === selectedProduct);
        const variant = product?.variants?.find((v: any) => v.id === selectedVariant);

        const newItem = {
            productId: selectedProduct,
            productName: product?.name,
            variantId: selectedVariant || null,
            variantName: variant?.name || '',
            quantity: parseInt(quantity),
            unitCost: parseFloat(unitCost),
            totalCost: parseInt(quantity) * parseFloat(unitCost)
        };

        setOrderItems([...orderItems, newItem]);
        setSelectedProduct('');
        setSelectedVariant('');
        setQuantity('');
        setUnitCost('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSupplier || orderItems.length === 0) {
            toast.error('Please select supplier and add items');
            return;
        }

        setSubmitting(true);
        try {
            await api.createPurchaseOrder({
                supplierId: selectedSupplier,
                items: orderItems,
            });
            toast.success('Purchase Order Created');
            setShowCreateModal(false);
            fetchOrders();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to create order');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReceive = async (id: string) => {
        if (!confirm('Mark as received? This updates inventory.')) return;
        try {
            await api.receivePurchaseOrder(id);
            toast.success('Order Received');
            fetchOrders();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to receive order');
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col font-sans transition-colors duration-300">
            {/* Header */}
            <header className="bg-background/80 backdrop-blur-md border-b border-border/40 px-6 py-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shadow-sm ring-1 ring-inset ring-primary/20">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">
                                Purchase <span className="text-primary">Orders</span>
                            </h1>
                            <p className="text-xs text-muted-foreground font-medium">Manage procurement and logistics</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <button
                            onClick={handleOpenCreate}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all shadow-sm active:scale-[0.98]"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden md:inline">New Order</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full px-6 py-8 space-y-8 animate-in fade-in zoom-in-95 duration-500 text-left">
                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="rounded-xl border border-border/50 bg-card p-6 flex items-center gap-4 shadow-sm">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Orders</p>
                            <p className="text-xl font-bold text-foreground mt-0.5">
                                {orders.filter(o => o.status === 'pending' || o.status === 'ordered').length}
                            </p>
                        </div>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-card p-6 flex items-center gap-4 shadow-sm">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Received</p>
                            <p className="text-xl font-bold text-foreground mt-0.5">
                                {orders.filter(o => o.status === 'received').length}
                            </p>
                        </div>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-card p-6 flex items-center gap-4 shadow-sm">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Value</p>
                            <p className="text-xl font-bold text-foreground mt-0.5">
                                {formatCurrency(orders.reduce((acc, o) => acc + o.totalAmount, 0))}
                            </p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-48 bg-muted rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : orders.length === 0 ? (
                    <div className="bg-card border border-dashed border-border p-16 text-center rounded-2xl">
                        <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-bold text-foreground">No purchase orders</h3>
                        <p className="text-muted-foreground text-sm mt-1">Initialize procurement by creating your first order.</p>
                        <button onClick={handleOpenCreate} className="mt-6 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors">New Order</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {orders.map(order => (
                            <div key={order.id} className="group relative rounded-xl border border-border/50 bg-card p-6 flex flex-col gap-4 hover:border-primary/50 transition-colors shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                            Ref: <span className="text-primary">{order.orderNumber}</span>
                                        </p>
                                        <h3 className="font-bold text-foreground line-clamp-1 h-6">
                                            {order.supplier?.name}
                                        </h3>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${order.status === 'received' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                            order.status === 'cancelled' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                        }`}>
                                        {order.status}
                                    </span>
                                </div>

                                <div className="flex items-center gap-4 text-muted-foreground text-xs">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 opacity-70" />
                                        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Truck className="w-4 h-4 opacity-70" />
                                        <span>Logistics</span>
                                    </div>
                                </div>

                                <div className="mt-2 pt-4 border-t border-border/50 flex items-center justify-between">
                                    <div className="text-left">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Amount</p>
                                        <p className="text-lg font-bold text-foreground">
                                            {formatCurrency(order.totalAmount)}
                                        </p>
                                    </div>
                                    {(order.status === 'pending' || order.status === 'ordered') && (
                                        <button
                                            onClick={() => handleReceive(order.id)}
                                            className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white px-3 rounded-lg text-[10px] font-bold uppercase transition-colors"
                                        >
                                            Receive
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6 z-[100] animate-in fade-in duration-200">
                    <div className="bg-card rounded-2xl shadow-xl max-w-5xl w-full p-8 border border-border ring-1 ring-border/50">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-xl font-bold text-foreground">Generate Purchase Order</h2>
                                <p className="text-xs text-muted-foreground mt-1">Add items and select a vendor for requisition</p>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                            <div className="lg:col-span-5 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase">Supply Partner</label>
                                    <select
                                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                        value={selectedSupplier}
                                        onChange={e => setSelectedSupplier(e.target.value)}
                                    >
                                        <option value="">-- Choose Vendor --</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>

                                <div className="bg-muted/30 p-6 rounded-xl space-y-4 border border-border/50">
                                    <label className="text-xs font-bold text-primary uppercase">Append Items</label>
                                    <div className="space-y-4">
                                        <select
                                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                            value={selectedProduct}
                                            onChange={e => { setSelectedProduct(e.target.value); setSelectedVariant(''); }}
                                        >
                                            <option value="">Select Resource</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input
                                                type="number"
                                                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                value={quantity}
                                                onChange={e => setQuantity(e.target.value)}
                                                placeholder="Qty"
                                            />
                                            <input
                                                type="number"
                                                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                value={unitCost}
                                                onChange={e => setUnitCost(e.target.value)}
                                                placeholder="Unit Cost"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleAddItem}
                                        className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs uppercase rounded-lg transition-all"
                                    >
                                        Add to List
                                    </button>
                                </div>
                            </div>

                            <div className="lg:col-span-7 flex flex-col h-full border border-border rounded-xl overflow-hidden">
                                <div className="bg-muted/50 p-4 border-b border-border flex justify-between items-center">
                                    <span className="text-xs font-bold text-muted-foreground uppercase">Order Manifest</span>
                                    <span className="text-xs font-bold text-primary italic">Total: {formatCurrency(orderItems.reduce((acc, item) => acc + item.totalCost, 0))}</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-[300px] bg-background">
                                    {orderItems.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 py-12">
                                            <ShoppingBag className="w-10 h-10 mb-2" />
                                            <p className="text-xs">No items added</p>
                                        </div>
                                    ) : (
                                        orderItems.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-4 p-3 bg-card border border-border/50 rounded-lg group hover:border-border transition-colors">
                                                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">{item.quantity}</div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-sm truncate text-foreground">{item.productName}</h4>
                                                    <p className="text-[10px] text-muted-foreground">@{formatCurrency(item.unitCost)} each</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-sm text-foreground">{formatCurrency(item.totalCost)}</p>
                                                </div>
                                                <button onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-red-500 p-1 transition-colors">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="p-4 bg-muted/30 border-t border-border">
                                    <button
                                        onClick={handleSubmit}
                                        disabled={submitting || orderItems.length === 0}
                                        className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-bold uppercase disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {submitting ? 'Confirming...' : 'Submit Purchase Order'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
