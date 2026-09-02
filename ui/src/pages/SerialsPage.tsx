import { useState, useEffect } from 'react';
import { QrCode, Search, Upload, Trash2 } from 'lucide-react';
import api from '../lib/api-client';
import toast from 'react-hot-toast';
import LoadingButton from '../components/LoadingButton';
import CustomModal from '../components/CustomModal';
import { useLock } from '../lib/useLock';

export default function SerialsPage() {
    const [serials, setSerials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showRegister, setShowRegister] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [registerForm, setRegisterForm] = useState({ productSearch: '', productId: '', serialsText: '' });
    const [productResults, setProductResults] = useState<any[]>([]);

    useEffect(() => { load(); }, [statusFilter, search]);

    async function load() {
        setLoading(true);
        try {
            const params: any = {};
            if (statusFilter) params.status = statusFilter;
            if (search) params.search = search;
            const res = await api.get('/serials', params);
            setSerials(res.data.serialNumbers || []);
        } catch { } finally { setLoading(false); }
    }

    function searchProduct(q: string) {
        setRegisterForm({ ...registerForm, productSearch: q });
        if (q.length < 2) { setProductResults([]); return; }
        api.get('/products/search', { q }).then(res => {
            setProductResults(res.data.products || res.data.results || []);
        }).catch(() => setProductResults([]));
    }

    async function handleRegister() {
        if (!registerForm.productId || !registerForm.serialsText.trim()) {
            toast.error('Product and serial numbers required');
            return;
        }
        const serialNumbers = registerForm.serialsText.trim().split('\n').filter(Boolean).map(s => {
            const parts = s.trim().split(',');
            return { serialNumber: parts[0].trim(), batchNumber: parts[1]?.trim() || null };
        });
        if (serialNumbers.length === 0) { toast.error('No valid serial numbers'); return; }
        setSubmitting(true);
        try {
            const res = await api.post('/serials', { productId: registerForm.productId, serialNumbers });
            toast.success(`${res.data.created} serials registered${res.data.errors?.length ? `, ${res.data.errors.length} errors` : ''}`);
            setShowRegister(false);
            setRegisterForm({ productSearch: '', productId: '', serialsText: '' });
            load();
        } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
        finally { setSubmitting(false); }
    }

    const [handleDeleteSerial, _isDeletingSerial] = useLock(async (id: string) => {
        try {
            await api.delete(`/serials/${id}`);
            toast.success('Serial number deleted');
            setConfirmDelete(null);
            load();
        } catch (e: any) { toast.error(e?.response?.data?.error || 'Delete failed'); }
    });

    const statusBadge = (s: string) => {
        if (s === 'in_stock') return 'bg-emerald-500/20 text-emerald-500';
        if (s === 'sold') return 'bg-blue-500/20 text-blue-500';
        if (s === 'returned') return 'bg-amber-500/20 text-amber-500';
        return 'bg-red-500/20 text-red-500';
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Serial Numbers</h1>
                    <p className="text-sm text-muted-foreground mt-1">Track individual units by serial number</p>
                    <p className="text-[9px] text-muted-foreground/60 mt-0.5">Register serials when stock arrives, assign them at sale, and look up any serial to see if it's in stock, sold, or returned. Good for electronics and high-value items.</p>
                </div>
                <button onClick={() => setShowRegister(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2">
                    <Upload className="w-4 h-4" /> Register Serials
                </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:items-center">
                <div className="relative flex-1 max-w-sm w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 pointer-events-none" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium shadow-sm placeholder:text-slate-400 focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-400/20" placeholder="Search serial or batch..." />
                </div>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 sm:pb-0 -mx-3 px-3 sm:mx-0 sm:px-0">
                {['', 'in_stock', 'sold', 'returned', 'voided'].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                        className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider whitespace-nowrap shrink-0 border-2 transition-all ${statusFilter === s ? 'bg-violet-500 text-white border-violet-600 shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-muted-foreground hover:border-violet-400'}`}>
                        {s || 'All'}
                    </button>
                ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="loading-spinner border-primary" /></div>
            ) : serials.length === 0 ? (
                <div className="text-center py-20 glass-card rounded-2xl">
                    <QrCode className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                    <h3 className="text-lg font-bold mb-2">No Serial Numbers</h3>
                    <p className="text-sm text-muted-foreground">Register serial numbers for tracked products</p>
                </div>
            ) : (
                <>
                {/* Desktop: scrollable table */}
                <div className="hidden sm:block overflow-x-auto rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                    <div className="min-w-[640px]">
                        <div className="grid grid-cols-7 gap-3 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground bg-slate-50 dark:bg-slate-800/50 border-b-2 border-slate-200 dark:border-slate-700">
                            <span>Serial #</span><span>Product</span><span>Batch</span><span>Status</span><span>Expiry</span><span>Price</span><span></span>
                        </div>
                        {serials.map((s: any) => (
                            <div key={s.id} className="grid grid-cols-7 gap-3 items-center px-4 py-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <span className="font-mono text-xs font-bold truncate">{s.serialNumber}</span>
                                <span className="text-xs truncate">{s.product?.name || 'Unknown'}</span>
                                <span className="text-[10px] text-muted-foreground truncate">{s.batchNumber || '-'}</span>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-black w-fit border ${statusBadge(s.status)} border-current/20`}>{s.status}</span>
                                <span className="text-[10px] text-muted-foreground">{s.expiryDate ? new Date(s.expiryDate).toLocaleDateString() : '-'}</span>
                                <span className="text-xs font-bold">{s.costPrice ? `KES ${parseFloat(s.costPrice).toLocaleString()}` : '-'}</span>
                                <div className="flex justify-end">
                                    {s.status !== 'sold' && (
                                        <button onClick={() => setConfirmDelete(s.id)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all border border-red-500/20" title="Delete">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Mobile: cards */}
                <div className="sm:hidden space-y-3">
                    {serials.map((s: any) => (
                        <div key={s.id} className="clay-card p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-black">{s.serialNumber}</span>
                                <span className={`text-[9px] px-2 py-1 rounded-full uppercase font-black border ${statusBadge(s.status)} border-current/20`}>{s.status}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div><p className="text-[9px] font-black uppercase text-muted-foreground">Product</p><p className="font-bold truncate">{s.product?.name || 'Unknown'}</p></div>
                                <div><p className="text-[9px] font-black uppercase text-muted-foreground">Batch</p><p className="text-muted-foreground">{s.batchNumber || '-'}</p></div>
                                <div><p className="text-[9px] font-black uppercase text-muted-foreground">Expiry</p><p>{s.expiryDate ? new Date(s.expiryDate).toLocaleDateString() : '-'}</p></div>
                                <div><p className="text-[9px] font-black uppercase text-muted-foreground">Price</p><p className="font-bold">{s.costPrice ? `KES ${parseFloat(s.costPrice).toLocaleString()}` : '-'}</p></div>
                            </div>
                            {s.status !== 'sold' && (
                                <button onClick={() => setConfirmDelete(s.id)} className="w-full py-2 rounded-xl bg-red-500/10 text-red-500 border-2 border-red-500/20 text-[10px] font-black uppercase flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>
                            )}
                        </div>
                    ))}
                </div>
                </>
            )}

            {/* Delete Confirmation */}
            {confirmDelete && (
                <CustomModal
                    isOpen={true}
                    onClose={() => setConfirmDelete(null)}
                    type="confirm"
                    title="Delete Serial Number?"
                    message="This will permanently remove this serial number."
                    onConfirm={() => handleDeleteSerial(confirmDelete)}
                    onCancel={() => setConfirmDelete(null)}
                />
            )}

            {/* Register Serials Modal */}
            {showRegister && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={() => setShowRegister(false)}>
                    <div className="glass-card rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-black mb-4">Register Serial Numbers</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Product</label>
                                <input value={registerForm.productSearch} onChange={e => searchProduct(e.target.value)}
                                    className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" placeholder="Search product..." />
                                {productResults.length > 0 && (
                                    <div className="mt-1 bg-secondary/50 rounded-xl border border-white/10 max-h-32 overflow-y-auto">
                                        {productResults.map((p: any) => (
                                            <div key={p.id} onClick={() => { setRegisterForm({ ...registerForm, productId: p.id, productSearch: `${p.name}` }); setProductResults([]); }}
                                                className="px-4 py-2 hover:bg-primary/10 cursor-pointer text-xs">{p.name}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Serial Numbers (one per line, or serial,batch)</label>
                                <textarea value={registerForm.serialsText} onChange={e => setRegisterForm({ ...registerForm, serialsText: e.target.value })}
                                    className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary font-mono" rows={8}
                                    placeholder="SN001&#10;SN002, BATCH-A&#10;SN003, BATCH-A" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <LoadingButton onClick={() => setShowRegister(false)} variant="secondary">Cancel</LoadingButton>
                                <LoadingButton onClick={handleRegister} loading={submitting}>Register</LoadingButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
