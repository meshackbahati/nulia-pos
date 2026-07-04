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

            <div className="flex gap-2 items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" placeholder="Search serial or batch..." />
                </div>
                {['', 'in_stock', 'sold', 'returned', 'voided'].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                        className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-secondary/30 text-muted-foreground'}`}>
                        {s || 'All'}
                    </button>
                ))}
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
                <div className="space-y-2">
                    <div className="grid grid-cols-7 gap-3 px-4 py-2 text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                        <span>Serial #</span><span>Product</span><span>Batch</span><span>Status</span><span>Expiry</span><span>Price</span><span></span>
                    </div>
                    {serials.map((s: any) => (
                        <div key={s.id} className="glass-card rounded-xl px-4 py-3 grid grid-cols-7 gap-3 items-center">
                            <span className="font-mono text-xs font-bold">{s.serialNumber}</span>
                            <span className="text-xs">{s.product?.name || 'Unknown'}</span>
                            <span className="text-[10px] text-muted-foreground">{s.batchNumber || '-'}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-black w-fit ${statusBadge(s.status)}`}>{s.status}</span>
                            <span className="text-[10px] text-muted-foreground">{s.expiryDate ? new Date(s.expiryDate).toLocaleDateString() : '-'}</span>
                            <span className="text-xs">{s.costPrice ? `KES ${parseFloat(s.costPrice).toLocaleString()}` : '-'}</span>
                            <div className="flex justify-end">
                                {s.status !== 'sold' && (
                                    <button onClick={() => setConfirmDelete(s.id)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all" title="Delete">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
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
