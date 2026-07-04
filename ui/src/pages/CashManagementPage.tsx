import { useState, useEffect } from 'react';
import { DollarSign, Plus, Play, Pencil, Trash2 } from 'lucide-react';
import api from '../lib/api-client';
import toast from 'react-hot-toast';
import LoadingButton from '../components/LoadingButton';
import CustomModal from '../components/CustomModal';
import { useLock } from '../lib/useLock';

export default function CashManagementPage() {
    const [registers, setRegisters] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'registers' | 'sessions'>('registers');
    const [showRegister, setShowRegister] = useState(false);
    const [registerName, setRegisterName] = useState('');
    const [showOpen, setShowOpen] = useState(false);
    const [showClose, setShowClose] = useState<any>(null);
    const [openForm, setOpenForm] = useState({ registerId: '', openingBalance: '' });
    const [closeForm, setCloseForm] = useState({ closingBalance: '' });
    const [editRegister, setEditRegister] = useState<any | null>(null);
    const [confirmDeleteRegister, setConfirmDeleteRegister] = useState<string | null>(null);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const [regRes, sesRes] = await Promise.all([
                api.get('/cash/register'),
                api.get('/cash/sessions'),
            ]);
            setRegisters(regRes.data.registers || []);
            setSessions(sesRes.data.sessions || []);
        } catch { } finally { setLoading(false); }
    }

    const [handleCreateRegister, isCreatingRegister] = useLock(async () => {
        if (!registerName) { toast.error('Name required'); return; }
        try {
            await api.post('/cash/register', { name: registerName });
            toast.success('Register created');
            setShowRegister(false);
            setRegisterName('');
            load();
        } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
    });

    const [handleUpdateRegister, isUpdatingRegister] = useLock(async () => {
        if (!editRegister || !editRegister.name) { toast.error('Name required'); return; }
        try {
            await api.put(`/cash/register/${editRegister.id}`, { name: editRegister.name });
            toast.success('Register updated');
            setEditRegister(null);
            load();
        } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
    });

    const [handleDeleteRegister, _isDeletingRegister] = useLock(async (id: string) => {
        try {
            await api.delete(`/cash/register/${id}`);
            toast.success('Register deleted');
            setConfirmDeleteRegister(null);
            load();
        } catch (e: any) { toast.error(e?.response?.data?.error || 'Delete failed'); }
    });

    const [handleOpenSession, isOpening] = useLock(async () => {
        if (!openForm.registerId || !openForm.openingBalance) { toast.error('All fields required'); return; }
        try {
            await api.post('/cash/session/open', {
                registerId: openForm.registerId,
                openingBalance: parseFloat(openForm.openingBalance),
            });
            toast.success('Session opened');
            setShowOpen(false);
            setOpenForm({ registerId: '', openingBalance: '' });
            load();
        } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
    });

    const [handleCloseSession, isClosing] = useLock(async () => {
        if (!closeForm.closingBalance) { toast.error('Closing balance required'); return; }
        try {
            const res = await api.post('/cash/session/close', {
                sessionId: showClose.id,
                closingBalance: parseFloat(closeForm.closingBalance),
            });
            const data = res.data;
            toast(`Difference: KES ${data.difference}`, { icon: data.difference === 0 ? '✅' : '⚠️' });
            setShowClose(null);
            setCloseForm({ closingBalance: '' });
            load();
        } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
    });

    const [handleToggleSession, isToggling] = useLock(async (reg: any) => {
        try {
            const res = await api.get('/cash/session/active', { registerId: reg.id });
            const session = res.data.session;
            if (session) {
                setShowClose(session);
            } else {
                setShowOpen(true);
                setOpenForm({ ...openForm, registerId: reg.id });
            }
        } catch {
            setShowOpen(true);
            setOpenForm({ ...openForm, registerId: reg.id });
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Cash Management</h1>
                    <p className="text-sm text-muted-foreground mt-1">Till registers, opening/closing floats, reconciliation</p>
                    <p className="text-[9px] text-muted-foreground/60 mt-0.5">Open a shift with starting cash, close with what's in the drawer, and the system checks if the amounts match. Catches missing money or errors.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowOpen(true)} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2">
                        <Play className="w-4 h-4" /> Open Session
                    </button>
                    <button onClick={() => setShowRegister(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2">
                        <Plus className="w-4 h-4" /> New Register
                    </button>
                </div>
            </div>

            <div className="flex gap-2">
                {['registers', 'sessions'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab as any)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider ${activeTab === tab ? 'bg-primary text-primary-foreground' : 'bg-secondary/30 text-muted-foreground'}`}>
                        {tab === 'registers' ? 'Registers' : 'Session History'}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="loading-spinner border-primary" /></div>
            ) : activeTab === 'registers' ? (
                <div className="grid md:grid-cols-2 gap-4">
                    {registers.map((reg: any) => (
                        <div key={reg.id} className="glass-card rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                        <DollarSign className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <h3 className="font-bold">{reg.name}</h3>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className={`text-[10px] px-2 py-1 rounded-full ${reg.isActive ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                                        {reg.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleToggleSession(reg)} disabled={isToggling} className="flex-1 px-4 py-2 bg-secondary/30 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-secondary/50 transition-all disabled:opacity-50">
                                    {reg.activeSession ? 'Close' : 'Open'} Session
                                </button>
                                <button onClick={() => setEditRegister({ ...reg })} className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 transition-all" title="Edit">
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => setConfirmDeleteRegister(reg.id)} className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all" title="Delete">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {registers.length === 0 && (
                        <div className="col-span-2 text-center py-10 text-muted-foreground text-sm">
                            No registers yet. Create one to start tracking cash.
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {sessions.map((s: any) => (
                        <div key={s.id} className="glass-card rounded-2xl p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm">{s.register?.name || 'Register'}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.closedAt ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                            {s.closedAt ? 'Closed' : 'Open'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        Opened: {new Date(s.openedAt).toLocaleString()} by {s.opener?.firstName}
                                        {s.closedAt && ` — Closed: ${new Date(s.closedAt).toLocaleString()}`}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold">KES {parseFloat(s.openingBalance).toLocaleString()}</p>
                                    {s.closingBalance && (
                                        <p className={`text-[10px] ${parseFloat(s.difference) === 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            Close: KES {parseFloat(s.closingBalance).toLocaleString()}
                                            {parseFloat(s.difference) !== 0 && ` (${parseFloat(s.difference).toFixed(2)})`}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {!s.closedAt && (
                                <button onClick={() => setShowClose(s)} className="mt-3 w-full px-4 py-2 bg-red-500/20 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-wider">
                                    Close Session
                                </button>
                            )}
                        </div>
                    ))}
                    {sessions.length === 0 && (
                        <p className="text-center py-10 text-muted-foreground text-sm">No sessions recorded</p>
                    )}
                </div>
            )}

            {/* Create Register Modal */}
            {showRegister && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={() => setShowRegister(false)}>
                    <div className="glass-card rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-black mb-4">New Register</h2>
                        <input value={registerName} onChange={e => setRegisterName(e.target.value)}
                            className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary mb-4"
                            placeholder="Till 1, Main Register..." />
                        <div className="flex gap-3">
                            <LoadingButton onClick={() => setShowRegister(false)} variant="secondary">Cancel</LoadingButton>
                            <LoadingButton onClick={handleCreateRegister} loading={isCreatingRegister}>Create Register</LoadingButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Register Modal */}
            {editRegister && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={() => setEditRegister(null)}>
                    <div className="glass-card rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-black mb-4">Edit Register</h2>
                        <input value={editRegister.name} onChange={e => setEditRegister({ ...editRegister, name: e.target.value })}
                            className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary mb-4"
                            placeholder="Register name" />
                        <div className="flex gap-3">
                            <LoadingButton onClick={() => setEditRegister(null)} variant="secondary">Cancel</LoadingButton>
                            <LoadingButton onClick={handleUpdateRegister} loading={isUpdatingRegister}>Save</LoadingButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Register Confirmation */}
            {confirmDeleteRegister && (
                <CustomModal
                    isOpen={true}
                    onClose={() => setConfirmDeleteRegister(null)}
                    type="confirm"
                    title="Delete Register?"
                    message="This will permanently remove this cash register and all its sessions."
                    onConfirm={() => handleDeleteRegister(confirmDeleteRegister)}
                    onCancel={() => setConfirmDeleteRegister(null)}
                />
            )}

            {/* Open Session Modal */}
            {showOpen && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={() => setShowOpen(false)}>
                    <div className="glass-card rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-black mb-4">Open Session</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Register</label>
                                <select value={openForm.registerId} onChange={e => setOpenForm({ ...openForm, registerId: e.target.value })}
                                    className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary">
                                    <option value="">Select register</option>
                                    {registers.filter(r => r.isActive).map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Opening Balance (KES)</label>
                                <input value={openForm.openingBalance} onChange={e => setOpenForm({ ...openForm, openingBalance: e.target.value })} type="number" step="0.01"
                                    className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" placeholder="0.00" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <LoadingButton onClick={() => setShowOpen(false)} variant="secondary">Cancel</LoadingButton>
                                <LoadingButton onClick={handleOpenSession} loading={isOpening} className="bg-emerald-500 text-white hover:bg-emerald-600">Open Session</LoadingButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Close Session Modal */}
            {showClose && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={() => setShowClose(null)}>
                    <div className="glass-card rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-black mb-4">Close Session</h2>
                        <p className="text-sm text-muted-foreground mb-2">Opening balance: KES {parseFloat(showClose.openingBalance).toLocaleString()}</p>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Closing Balance (KES)</label>
                            <input value={closeForm.closingBalance} onChange={e => setCloseForm({ closingBalance: e.target.value })} type="number" step="0.01"
                                className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" placeholder="0.00" />
                        </div>
                        <div className="flex gap-3 pt-4">
                            <LoadingButton onClick={() => setShowClose(null)} variant="secondary">Cancel</LoadingButton>
                            <LoadingButton onClick={handleCloseSession} loading={isClosing} variant="danger" className="bg-red-500 text-white hover:bg-red-600">Close Session</LoadingButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
