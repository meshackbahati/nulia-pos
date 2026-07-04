import { useState, useEffect } from 'react';
import { Search, UserPlus, Phone, Mail, CreditCard, Calendar, DollarSign, Pencil, Trash2 } from 'lucide-react';
import api from '../lib/api-client';
import toast from 'react-hot-toast';
import LoadingButton from '../components/LoadingButton';
import CustomModal from '../components/CustomModal';
import { useLock } from '../lib/useLock';

export default function CustomersPage() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<any | null>(null);
    const [sales, setSales] = useState<any[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showDeposit, setShowDeposit] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [depositType, setDepositType] = useState('deposit');
    const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', idNumber: '', creditLimit: '' });
    const [editCustomer, setEditCustomer] = useState<any | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const res = await api.get('/customers');
            setCustomers(res.data.customers || []);
        } catch { } finally { setLoading(false); }
    }

    const [handleSelectCustomer, _isSelectingCustomer] = useLock(async (c: any) => {
        setSelected(c);
        try {
            const res = await api.get(`/customers/${c.id}`);
            setSales(res.data.sales || []);
        } catch { }
    });

    const [handleCreateSafe, isCreating] = useLock(async () => {
        if (!form.firstName) { toast.error('First name is required'); return; }
        try {
            await api.post('/customers', form);
            toast.success('Customer created');
            setShowCreate(false);
            setForm({ firstName: '', lastName: '', phone: '', email: '', idNumber: '', creditLimit: '' });
            load();
        } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
    });

    const [handleUpdateCustomer, isUpdatingCustomer] = useLock(async () => {
        if (!editCustomer || !editCustomer.firstName) { toast.error('First name required'); return; }
        try {
            await api.put(`/customers/${editCustomer.id}`, {
                firstName: editCustomer.firstName,
                lastName: editCustomer.lastName,
                phone: editCustomer.phone,
                email: editCustomer.email,
                idNumber: editCustomer.idNumber,
                creditLimit: editCustomer.creditLimit,
            });
            toast.success('Customer updated');
            setEditCustomer(null);
            load();
            if (selected?.id === editCustomer.id) {
                setSelected({ ...editCustomer });
            }
        } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
    });

    const [handleDeleteCustomer, _isDeletingCustomer] = useLock(async (id: string) => {
        try {
            await api.delete(`/customers/${id}`);
            toast.success('Customer deleted');
            setConfirmDelete(null);
            if (selected?.id === id) setSelected(null);
            load();
        } catch (e: any) { toast.error(e?.response?.data?.error || 'Delete failed'); }
    });

    const [handleDepositSafe, isDepositing] = useLock(async () => {
        if (!depositAmount || !depositType) { toast.error('Amount and type required'); return; }
        try {
            await api.post(`/customers/${selected?.id}/deposit`, {
                amount: parseFloat(depositAmount), type: depositType,
            });
            toast.success('Deposit recorded');
            setShowDeposit(false);
            setDepositAmount('');
            handleSelectCustomer(selected);
        } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
    });

    const filtered = customers.filter((c: any) =>
        !search || `${c.firstName} ${c.lastName || ''} ${c.phone || ''} ${c.email || ''}`.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex h-full gap-6">
            {/* Left: Customer List */}
            <div className="w-[400px] shrink-0 flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h1 className="text-xl font-black tracking-tight">Customers</h1>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Save customer profiles, track credit, record deposits, and view purchase history</p>
                    </div>
                    <button onClick={() => setShowCreate(true)} className="p-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all">
                        <UserPlus className="w-4 h-4" />
                    </button>
                </div>
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary"
                        placeholder="Search customers..." />
                </div>
                <div className="flex-1 overflow-y-auto space-y-2">
                    {loading ? (
                        <div className="flex justify-center py-10"><div className="loading-spinner border-primary" /></div>
                    ) : filtered.length === 0 ? (
                        <p className="text-center text-muted-foreground text-sm py-10">No customers found</p>
                    ) : filtered.map((c: any) => (
                        <div key={c.id} onClick={() => handleSelectCustomer(c)}
                            className={`glass-card rounded-xl p-4 cursor-pointer transition-all hover:border-primary/30 ${selected?.id === c.id ? 'border-primary/50 bg-primary/5' : ''}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-sm">{c.firstName} {c.lastName || ''}</p>
                                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                                        {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                                        {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold">{c.currentBalance !== undefined ? `KES ${parseFloat(c.currentBalance).toLocaleString()}` : '-'}</p>
                                    <p className="text-[9px] text-muted-foreground">Balance</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Customer Detail */}
            <div className="flex-1 overflow-y-auto">
                {!selected ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground text-sm">Select a customer to view details</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="glass-card rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-black">{selected.firstName} {selected.lastName || ''}</h2>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setShowDeposit(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2">
                                        <DollarSign className="w-4 h-4" />Record Payment
                                    </button>
                                    <button onClick={() => setEditCustomer({ ...selected, creditLimit: selected.creditLimit || '' })} className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 transition-all" title="Edit">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setConfirmDelete(selected.id)} className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all" title="Delete">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { label: 'Phone', value: selected.phone, icon: Phone },
                                    { label: 'Email', value: selected.email, icon: Mail },
                                    { label: 'ID Number', value: selected.idNumber, icon: CreditCard },
                                    { label: 'Credit Limit', value: `KES ${parseFloat(selected.creditLimit || 0).toLocaleString()}`, icon: DollarSign },
                                    { label: 'Balance', value: `KES ${parseFloat(selected.currentBalance || 0).toLocaleString()}`, icon: DollarSign },
                                    { label: 'Since', value: new Date(selected.createdAt).toLocaleDateString(), icon: Calendar },
                                ].map((s, i) => (
                                    <div key={i} className="bg-secondary/20 rounded-xl p-4">
                                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                            <s.icon className="w-3 h-3" />
                                            <span className="text-[10px] uppercase tracking-wider">{s.label}</span>
                                        </div>
                                        <p className="font-bold text-sm">{s.value || '-'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {sales.length > 0 && (
                            <div className="glass-card rounded-2xl p-6">
                                <h3 className="font-bold mb-4">Recent Sales</h3>
                                <div className="space-y-2">
                                    {sales.map((s: any) => (
                                        <div key={s.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                            <div>
                                                <p className="text-xs font-bold">{s.receiptId}</p>
                                                <p className="text-[10px] text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <p className="text-xs font-bold">KES {parseFloat(s.totalAmount).toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create Customer Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
                    <div className="glass-card rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-black mb-4">New Customer</h2>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">First Name *</label>
                                    <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })}
                                        className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Last Name</label>
                                    <input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })}
                                        className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Phone</label>
                                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                                    className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Email</label>
                                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                                    className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Credit Limit</label>
                                <input value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: e.target.value })} type="number"
                                    className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <LoadingButton onClick={() => setShowCreate(false)} variant="secondary">Cancel</LoadingButton>
                                <LoadingButton onClick={handleCreateSafe} loading={isCreating}>Create Customer</LoadingButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Customer Modal */}
            {editCustomer && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={() => setEditCustomer(null)}>
                    <div className="glass-card rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-black mb-4">Edit Customer</h2>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">First Name *</label>
                                    <input value={editCustomer.firstName} onChange={e => setEditCustomer({ ...editCustomer, firstName: e.target.value })}
                                        className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Last Name</label>
                                    <input value={editCustomer.lastName || ''} onChange={e => setEditCustomer({ ...editCustomer, lastName: e.target.value })}
                                        className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Phone</label>
                                <input value={editCustomer.phone || ''} onChange={e => setEditCustomer({ ...editCustomer, phone: e.target.value })}
                                    className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Email</label>
                                <input value={editCustomer.email || ''} onChange={e => setEditCustomer({ ...editCustomer, email: e.target.value })}
                                    className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Credit Limit</label>
                                <input value={editCustomer.creditLimit} onChange={e => setEditCustomer({ ...editCustomer, creditLimit: e.target.value })} type="number"
                                    className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <LoadingButton onClick={() => setEditCustomer(null)} variant="secondary">Cancel</LoadingButton>
                                <LoadingButton onClick={handleUpdateCustomer} loading={isUpdatingCustomer}>Save</LoadingButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {confirmDelete && (
                <CustomModal
                    isOpen={true}
                    onClose={() => setConfirmDelete(null)}
                    type="confirm"
                    title="Delete Customer?"
                    message="This will permanently remove this customer and all their records."
                    onConfirm={() => handleDeleteCustomer(confirmDelete)}
                    onCancel={() => setConfirmDelete(null)}
                />
            )}

            {/* Deposit Modal */}
            {showDeposit && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={() => setShowDeposit(false)}>
                    <div className="glass-card rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-black mb-4">Record Payment</h2>
                        <p className="text-sm text-muted-foreground mb-4">{selected?.firstName} {selected?.lastName || ''}</p>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Type</label>
                                <select value={depositType} onChange={e => setDepositType(e.target.value)}
                                    className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary">
                                    <option value="deposit">Deposit</option>
                                    <option value="payment">Payment</option>
                                    <option value="credit">Credit (add to balance)</option>
                                    <option value="refund">Refund</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Amount</label>
                                <input value={depositAmount} onChange={e => setDepositAmount(e.target.value)} type="number" step="0.01"
                                    className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" placeholder="0.00" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <LoadingButton onClick={() => setShowDeposit(false)} variant="secondary">Cancel</LoadingButton>
                                <LoadingButton onClick={handleDepositSafe} loading={isDepositing}>Add Deposit</LoadingButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
