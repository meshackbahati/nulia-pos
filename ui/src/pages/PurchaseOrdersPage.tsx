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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-300">
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                                Purchase <span className="text-blue-600">Orders</span>
                            </h1>
                            <p className="text-xs text-slate-500 font-medium">Manage procurement and logistics</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <button
                            onClick={handleOpenCreate}
                            className="modern-button bg-blue-600 text-white flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden md:inline uppercase text-xs font-bold">New Order</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full px-6 py-8 space-y-8 animate-in text-left">
                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="modern-card p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center text-blue-600">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Orders</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                                {orders.filter(o => o.status === 'pending' || o.status === 'ordered').length}
                            </p>
                        </div>
                    </div>
                    <div className="modern-card p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center text-green-600">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Received</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                                {orders.filter(o => o.status === 'received').length}
                            </p>
                        </div>
                    </div>
                    <div className="modern-card p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-600">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Value</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                                {formatCurrency(orders.reduce((acc, o) => acc + o.totalAmount, 0))}
                            </p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : orders.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-dash border-slate-200 dark:border-slate-800 p-16 text-center rounded-2xl">
                        <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">No purchase orders</h3>
                        <p className="text-slate-500 text-sm mt-1">Initialize procurement by creating your first order.</p>
                        <button onClick={handleOpenCreate} className="mt-6 modern-button bg-blue-600 text-white">New Order</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {orders.map(order => (
                            <div key={order.id} className="modern-card p-6 flex flex-col gap-4 group">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            Ref: <span className="text-blue-600">{order.orderNumber}</span>
                                        </p>
                                        <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1 h-6">
                                            {order.supplier?.name}
                                        </h3>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${order.status === 'received' ? 'bg-green-100 dark:bg-green-900/40 text-green-600' :
                                            order.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/40 text-red-600' :
                                                'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600'
                                        }`}>
                                        {order.status}
                                    </span>
                                </div>

                                <div className="flex items-center gap-4 text-slate-500 text-xs">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 opacity-50" />
                                        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Truck className="w-4 h-4 opacity-50" />
                                        <span>Logistics</span>
                                    </div>
                                </div>

                                <div className="mt-2 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <div className="text-left">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Amount</p>
                                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                                            {formatCurrency(order.totalAmount)}
                                        </p>
                                    </div>
                                    {(order.status === 'pending' || order.status === 'ordered') && (
                                        <button
                                            onClick={() => handleReceive(order.id)}
                                            className="h-8 modern-button bg-green-600 text-white text-[10px] font-bold"
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
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6 z-[100] animate-in">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-5xl w-full p-8 border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Generate Purchase Order</h2>
                                <p className="text-xs text-slate-500 mt-1">Add items and select a vendor for requisition</p>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                            <div className="lg:col-span-5 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Supply Partner</label>
                                    <select className="modern-input" value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}>
                                        <option value="">-- Choose Vendor --</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl space-y-4">
                                    <label className="text-xs font-bold text-blue-600 uppercase">Append Items</label>
                                    <div className="space-y-4">
                                        <select className="modern-input" value={selectedProduct} onChange={e => { setSelectedProduct(e.target.value); setSelectedVariant(''); }}>
                                            <option value="">Select Resource</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input type="number" className="modern-input" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Qty" />
                                            <input type="number" className="modern-input" value={unitCost} onChange={e => setUnitCost(e.target.value)} placeholder="Unit Cost" />
                                        </div>
                                    </div>
                                    <button onClick={handleAddItem} className="w-full h-11 modern-button bg-blue-600 text-white font-bold text-xs uppercase">
                                        Add to List
                                    </button>
                                </div>
                            </div>

                            <div className="lg:col-span-7 flex flex-col h-full border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Order Manifest</span>
                                    <span className="text-xs font-bold text-blue-600 italic">Total: {formatCurrency(orderItems.reduce((acc, item) => acc + item.totalCost, 0))}</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-[300px]">
                                    {orderItems.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 py-12">
                                            <ShoppingBag className="w-10 h-10 mb-2" />
                                            <p className="text-xs">No items added</p>
                                        </div>
                                    ) : (
                                        orderItems.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-4 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg group">
                                                <div className="w-8 h-8 rounded bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-bold text-blue-600 text-xs">{item.quantity}</div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-sm truncate dark:text-white">{item.productName}</h4>
                                                    <p className="text-[10px] text-slate-500">@{formatCurrency(item.unitCost)} each</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-sm dark:text-white">{formatCurrency(item.totalCost)}</p>
                                                </div>
                                                <button onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 p-1">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                                    <button onClick={handleSubmit} disabled={submitting || orderItems.length === 0} className="w-full h-12 modern-button bg-slate-900 dark:bg-blue-600 text-white font-bold uppercase disabled:opacity-50">
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
