import { useState, useEffect } from 'react';
import { Plus, ReceiptText, TrendingDown } from 'lucide-react';
import api from '../lib/api-client';
import toast from 'react-hot-toast';
import LoadingButton from '../components/LoadingButton';

const CATEGORIES = ['utilities', 'rent', 'salaries', 'supplies', 'maintenance', 'transport', 'marketing', 'other'];

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [filter, setFilter] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ category: 'other', amount: '', description: '', paidAt: new Date().toISOString().split('T')[0] });

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const [expRes, sumRes] = await Promise.all([
                api.get('/expenses', { category: filter || undefined }),
                api.get('/expenses/summary'),
            ]);
            setExpenses(expRes.data.expenses || []);
            setSummary(sumRes.data);
        } catch { } finally { setLoading(false); }
    }

    async function handleCreate() {
        if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Valid amount required'); return; }
        setSubmitting(true);
        try {
            await api.post('/expenses', {
                category: form.category,
                amount: parseFloat(form.amount),
                description: form.description,
                paidAt: form.paidAt,
            });
            toast.success('Expense recorded');
            setShowCreate(false);
            setForm({ category: 'other', amount: '', description: '', paidAt: new Date().toISOString().split('T')[0] });
            load();
        } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
        finally { setSubmitting(false); }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Expenses</h1>
                    <p className="text-sm text-muted-foreground mt-1">Track operational costs</p>
                    <p className="text-[9px] text-muted-foreground/60 mt-0.5">Record rent, salaries, utilities, transport, and other business costs. See totals by category and approve expenses.</p>
                </div>
                <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Record Expense
                </button>
            </div>

            {summary && (
                <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <TrendingDown className="w-5 h-5 text-red-500" />
                        <h2 className="font-bold">Total: KES {parseFloat(summary.total || 0).toLocaleString()}</h2>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                        {(summary.byCategory || []).map((c: any) => (
                            <div key={c.category} className="bg-secondary/20 rounded-xl p-3">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.category}</p>
                                <p className="font-bold text-sm">KES {parseFloat(c.total || 0).toLocaleString()}</p>
                                <p className="text-[9px] text-muted-foreground">{c.count} entries</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex gap-2 flex-wrap">
                <button onClick={() => setFilter('')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider ${!filter ? 'bg-primary text-primary-foreground' : 'bg-secondary/30 text-muted-foreground'}`}>All</button>
                {CATEGORIES.map(c => (
                    <button key={c} onClick={() => setFilter(c)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider ${filter === c ? 'bg-primary text-primary-foreground' : 'bg-secondary/30 text-muted-foreground'}`}>{c}</button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="loading-spinner border-primary" /></div>
            ) : expenses.length === 0 ? (
                <div className="text-center py-20 glass-card rounded-2xl">
                    <ReceiptText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                    <h3 className="text-lg font-bold mb-2">No Expenses</h3>
                    <p className="text-sm text-muted-foreground">Record your first expense</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {expenses.map((e: any) => (
                        <div key={e.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase
                                    ${e.category === 'utilities' ? 'bg-blue-500/20 text-blue-500' :
                                      e.category === 'rent' ? 'bg-purple-500/20 text-purple-500' :
                                      e.category === 'salaries' ? 'bg-orange-500/20 text-orange-500' :
                                      'bg-secondary/50 text-muted-foreground'}`}>
                                    {e.category.slice(0, 3)}
                                </div>
                                <div>
                                    <p className="font-bold text-sm">{e.description || e.category}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {e.payer?.firstName} {e.payer?.lastName} — {new Date(e.paidAt).toLocaleDateString()}
                                        {e.isApproved ? ' ✅ Approved' : ' ⏳ Pending'}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-sm">KES {parseFloat(e.amount).toLocaleString()}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Expense Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
                    <div className="glass-card rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-black mb-4">Record Expense</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Category</label>
                                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                                    className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary">
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Amount (KES)</label>
                                <input value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} type="number" step="0.01"
                                    className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" placeholder="0.00" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Description</label>
                                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                    className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" placeholder="What is this for?" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Date</label>
                                <input value={form.paidAt} onChange={e => setForm({ ...form, paidAt: e.target.value })} type="date"
                                    className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <LoadingButton onClick={() => setShowCreate(false)} variant="secondary">Cancel</LoadingButton>
                                <LoadingButton onClick={handleCreate} loading={submitting}>Save</LoadingButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
