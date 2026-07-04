import { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, BarChart3, Plus } from 'lucide-react';
import api from '../lib/api-client';
import toast from 'react-hot-toast';

const REASONS = ['spoilage', 'damage', 'expired', 'theft', 'breakage', 'other'];

export default function WastePage() {
    const [records, setRecords] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [activeTab, setActiveTab] = useState<'list' | 'summary'>('list');
    const [form, setForm] = useState({ productId: '', productSearch: '', quantity: '', reason: 'spoilage', notes: '' });
    const [productResults, setProductResults] = useState<any[]>([]);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const [recRes, sumRes] = await Promise.all([
                api.get('/waste'),
                api.get('/waste/summary'),
            ]);
            setRecords(recRes.data.waste || []);
            setSummary(sumRes.data);
        } catch { } finally { setLoading(false); }
    }

    async function searchProduct(q: string) {
        setForm({ ...form, productSearch: q });
        if (q.length < 2) { setProductResults([]); return; }
        try {
            const res = await api.get('/products/search', { params: { q } });
            setProductResults(res.data.products || res.data.results || []);
        } catch { setProductResults([]); }
    }

    async function handleCreate() {
        if (!form.productId || !form.quantity) { toast.error('Product and quantity required'); return; }
        try {
            await api.post('/waste', {
                productId: form.productId, quantity: parseFloat(form.quantity),
                reason: form.reason, notes: form.notes,
            });
            toast.success('Waste recorded');
            setShowCreate(false);
            setForm({ productId: '', productSearch: '', quantity: '', reason: 'spoilage', notes: '' });
            load();
        } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
    }

    const reasonColor = (r: string) => {
        if (r === 'spoilage' || r === 'expired') return 'text-amber-500 bg-amber-500/10';
        if (r === 'theft') return 'text-red-500 bg-red-500/10';
        if (r === 'damage' || r === 'breakage') return 'text-orange-500 bg-orange-500/10';
        return 'text-muted-foreground bg-secondary/30';
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Waste & Breakage</h1>
                    <p className="text-sm text-muted-foreground mt-1">Track inventory losses</p>
                    <p className="text-[9px] text-muted-foreground/60 mt-0.5">When items spoil, expire, get damaged, or are stolen, record them here. Stock is deducted automatically and you can see monthly loss totals.</p>
                </div>
                <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Record Waste
                </button>
            </div>

            <div className="flex gap-2">
                {['list', 'summary'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab as any)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider ${activeTab === tab ? 'bg-primary text-primary-foreground' : 'bg-secondary/30 text-muted-foreground'}`}>
                        {tab === 'list' ? 'Records' : 'Summary'}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="loading-spinner border-primary" /></div>
            ) : activeTab === 'summary' && summary ? (
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="glass-card rounded-2xl p-6">
                        <h3 className="font-bold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> By Reason</h3>
                        <div className="space-y-3">
                            {(summary.byReason || []).map((r: any) => (
                                <div key={r.reason} className="flex items-center justify-between">
                                    <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${reasonColor(r.reason)}`}>{r.reason}</span>
                                    <div className="text-right">
                                        <p className="font-bold text-sm">{parseFloat(r.totalQuantity || 0).toFixed(1)} units</p>
                                        <p className="text-[10px] text-muted-foreground">KES {parseFloat(r.totalCost || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="glass-card rounded-2xl p-6">
                        <h3 className="font-bold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> By Month</h3>
                        <div className="space-y-2">
                            {(summary.byMonth || []).map((m: any) => (
                                <div key={m.month} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                                    <span className="text-xs">{m.month}</span>
                                    <span className="text-xs font-bold">KES {parseFloat(m.totalCost || 0).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : records.length === 0 ? (
                <div className="text-center py-20 glass-card rounded-2xl">
                    <Trash2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                    <h3 className="text-lg font-bold mb-2">No Waste Records</h3>
                    <p className="text-sm text-muted-foreground">No inventory losses recorded yet</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {records.map((r: any) => (
                        <div key={r.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                <div>
                                    <p className="font-bold text-sm">{r.product?.name || 'Unknown'}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[9px] px-2 py-0.5 rounded-full ${reasonColor(r.reason)}`}>{r.reason}</span>
                                        <span className="text-[10px] text-muted-foreground">{new Date(r.recordedAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-sm">{parseFloat(r.quantity).toFixed(1)} units</p>
                                {r.costValue && <p className="text-[10px] text-muted-foreground">KES {parseFloat(r.costValue).toLocaleString()}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Waste Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
                    <div className="glass-card rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-black mb-4">Record Waste</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Product</label>
                                <input value={form.productSearch} onChange={e => searchProduct(e.target.value)}
                                    className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary"
                                    placeholder="Search product..." />
                                {productResults.length > 0 && (
                                    <div className="mt-1 bg-secondary/50 rounded-xl border border-white/10 max-h-40 overflow-y-auto">
                                        {productResults.map((p: any) => (
                                            <div key={p.id} onClick={() => { setForm({ ...form, productId: p.id, productSearch: `${p.name} (${p.sku || ''})` }); setProductResults([]); }}
                                                className="px-4 py-2 hover:bg-primary/10 cursor-pointer text-xs">{p.name} <span className="text-muted-foreground">{p.sku}</span></div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Quantity</label>
                                <input value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} type="number" step="0.01"
                                    className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" placeholder="0" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Reason</label>
                                <select value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                                    className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary">
                                    {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Notes</label>
                                <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                                    className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-3 bg-secondary/30 rounded-xl text-xs font-black uppercase">Cancel</button>
                                <button onClick={handleCreate} className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase">Record</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
