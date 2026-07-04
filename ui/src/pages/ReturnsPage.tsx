import { useState, useEffect } from 'react';
import { RotateCcw, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import api from '../lib/api-client';
import toast from 'react-hot-toast';
import LoadingButton from '../components/LoadingButton';

export default function ReturnsPage() {
    const [returns, setReturns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [saleSearch, setSaleSearch] = useState('');
    const [saleResult, setSaleResult] = useState<any | null>(null);
    const [searching, setSearching] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [createForm, setCreateForm] = useState({ saleId: '', reason: 'defective', notes: '', items: [] as any[] });

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const res = await api.get('/returns', { status: filter || undefined });
            setReturns(res.data.returns || []);
        } catch { } finally { setLoading(false); }
    }

    async function searchSale() {
        if (!saleSearch) return;
        setSearching(true);
        setSaleResult(null);
        try {
            const res = await api.get('/sales/search', { query: saleSearch });
            const sales = res.data.sales || res.data.results || [];
            if (sales.length === 0) { toast.error('No sale found'); return; }
            const sale = sales[0];
            const detail = await api.get(`/sales/${sale.id}`);
            setSaleResult(detail.data.sale || detail.data);
        } catch (e: any) {
            toast.error('Sale not found');
        } finally { setSearching(false); }
    }

    async function handleCreate() {
        if (!saleResult) { toast.error('Search and select a sale first'); return; }
        const items = (saleResult.items || []).map((i: any) => ({
            saleItemId: i.id,
            quantityReturned: i.quantity,
            refundAmount: i.totalPrice,
            restock: true,
        }));
        setSubmitting(true);
        try {
            const res = await api.post('/returns', {
                saleId: saleResult.id,
                reason: createForm.reason,
                items,
                notes: createForm.notes,
            });
            toast.success(`Return created: ${res.data.return?.returnNumber}`);
            setShowCreate(false);
            setSaleResult(null);
            setCreateForm({ saleId: '', reason: 'defective', notes: '', items: [] });
            setSaleSearch('');
            load();
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Failed to create return');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleApprove(id: string, approved: boolean) {
        try {
            await api.post(`/returns/${id}/approve`, { approved });
            toast.success(approved ? 'Return approved' : 'Return rejected');
            load();
        } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
    }

    const statusIcon = (s: string) => {
        if (s === 'approved') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
        if (s === 'rejected') return <XCircle className="w-4 h-4 text-red-500" />;
        if (s === 'completed') return <CheckCircle className="w-4 h-4 text-blue-500" />;
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Returns & RMA</h1>
                    <p className="text-sm text-muted-foreground mt-1">Process customer returns and refunds</p>
                    <p className="text-[9px] text-muted-foreground/60 mt-0.5">Find the original sale, pick items to return, choose a reason, and the system refunds the amount and restocks the shelf automatically.</p>
                </div>
                <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" /> New Return
                </button>
            </div>

            <div className="flex gap-2">
                {['', 'pending', 'approved', 'rejected', 'completed'].map(s => (
                    <button key={s} onClick={() => { setFilter(s); }}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${filter === s ? 'bg-primary text-primary-foreground' : 'bg-secondary/30 text-muted-foreground'}`}>
                        {s || 'All'}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="loading-spinner border-primary" /></div>
            ) : returns.length === 0 ? (
                <div className="text-center py-20 glass-card rounded-2xl">
                    <RotateCcw className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                    <h3 className="text-lg font-bold mb-2">No Returns</h3>
                    <p className="text-sm text-muted-foreground">No return requests found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {returns.map((r: any) => (
                        <div key={r.id} className="glass-card rounded-2xl p-5">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    {statusIcon(r.status)}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm">{r.returnNumber}</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-black
                                                ${r.status === 'pending' ? 'bg-amber-500/20 text-amber-500' :
                                                  r.status === 'approved' ? 'bg-emerald-500/20 text-emerald-500' :
                                                  r.status === 'rejected' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                                {r.status}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            Sale: {r.sale?.receiptId} — {r.reason} — {new Date(r.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {r.status === 'pending' && (
                                        <>
                                            <button onClick={() => handleApprove(r.id, true)} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-500 rounded-lg text-[10px] font-black uppercase tracking-wider">Approve</button>
                                            <button onClick={() => handleApprove(r.id, false)} className="px-3 py-1.5 bg-red-500/20 text-red-500 rounded-lg text-[10px] font-black uppercase tracking-wider">Reject</button>
                                        </>
                                    )}
                                </div>
                            </div>
                            {r.items && r.items.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-white/5">
                                    <p className="text-[10px] text-muted-foreground mb-1">Items ({r.items.length})</p>
                                    <div className="space-y-1">
                                        {r.items.map((item: any) => (
                                            <div key={item.id} className="flex items-center justify-between text-xs">
                                                <span>{item.product?.name || 'Unknown'} x{item.quantityReturned}</span>
                                                <span className={item.restock ? 'text-emerald-500' : ''}>
                                                    {item.restock ? 'Restocked' : 'No restock'} — KES {parseFloat(item.refundAmount).toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Create Return Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
                    <div className="glass-card rounded-2xl p-6 w-full max-w-xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-black mb-4">Create Return</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Search Sale (receipt ID or phone)</label>
                                <div className="flex gap-2">
                                    <input value={saleSearch} onChange={e => setSaleSearch(e.target.value)}
                                        className="flex-1 px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary"
                                        placeholder="Receipt ID or phone..." />
                                    <button onClick={searchSale} disabled={searching}
                                        className="px-4 py-3 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase tracking-wider">
                                        {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Search'}
                                    </button>
                                </div>
                            </div>

                            {saleResult && (
                                <div className="bg-secondary/20 rounded-xl p-4">
                                    <p className="font-bold text-sm">{saleResult.receiptId}</p>
                                    <p className="text-[10px] text-muted-foreground">{new Date(saleResult.createdAt).toLocaleDateString()} — KES {parseFloat(saleResult.totalAmount).toLocaleString()}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1">Items: {(saleResult.items || []).length}</p>
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Reason</label>
                                <select value={createForm.reason} onChange={e => setCreateForm({ ...createForm, reason: e.target.value })}
                                    className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary">
                                    <option value="defective">Defective</option>
                                    <option value="wrong_item">Wrong Item</option>
                                    <option value="customer_decision">Customer Decision</option>
                                    <option value="expired">Expired</option>
                                    <option value="damaged">Damaged</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Notes</label>
                                <textarea value={createForm.notes} onChange={e => setCreateForm({ ...createForm, notes: e.target.value })}
                                    className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" rows={3} />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <LoadingButton onClick={() => setShowCreate(false)} variant="secondary">Cancel</LoadingButton>
                                <LoadingButton onClick={handleCreate} loading={submitting} disabled={!saleResult}>Process Return</LoadingButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
