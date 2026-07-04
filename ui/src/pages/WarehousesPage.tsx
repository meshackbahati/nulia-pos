import { useState, useEffect } from 'react';
import { Warehouse, Plus, MapPin, Trash2 } from 'lucide-react';
import api from '../lib/api-client';
import toast from 'react-hot-toast';
import CustomModal from '../components/CustomModal';
import LoadingButton from '../components/LoadingButton';

export default function WarehousesPage() {
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [showZone, setShowZone] = useState<{ wh: any } | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ name: '', location: '' });
    const [zoneForm, setZoneForm] = useState({ name: '', code: '' });

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const res = await api.get('/warehouses');
            setWarehouses(res.data.warehouses || []);
        } catch { } finally { setLoading(false); }
    }

    async function createWarehouse() {
        if (!form.name) { toast.error('Name required'); return; }
        setSubmitting(true);
        try {
            await api.post('/warehouses', form);
            toast.success('Warehouse created');
            setShowCreate(false);
            setForm({ name: '', location: '' });
            load();
        } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
        finally { setSubmitting(false); }
    }

    async function createZone() {
        if (!zoneForm.name || !showZone) { toast.error('Name required'); return; }
        setSubmitting(true);
        try {
            await api.post('/warehouses/zones', { warehouseId: showZone.wh.id, ...zoneForm });
            toast.success('Zone created');
            setZoneForm({ name: '', code: '' });
            load();
        } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
        finally { setSubmitting(false); }
    }

    async function deleteWarehouse(id: string) {
        try {
            await api.delete(`/warehouses/${id}`);
            toast.success('Warehouse deleted');
            setConfirmDelete(null);
            load();
        } catch (e: any) { toast.error(e?.response?.data?.error || 'Delete failed'); }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Warehouses</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage locations, zones, and stock positions</p>
                    <p className="text-[9px] text-muted-foreground/60 mt-0.5">Create storage areas like "Main Store" or "Back Warehouse", add zones like "Aisle 3 - Shelf B", and assign products to exact locations so staff can find them.</p>
                </div>
                <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2">
                    <Plus className="w-4 h-4" /> New Warehouse
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="loading-spinner border-primary" /></div>
            ) : warehouses.length === 0 ? (
                <div className="text-center py-20 glass-card rounded-2xl">
                    <Warehouse className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                    <h3 className="text-lg font-bold mb-2">No Warehouses</h3>
                    <p className="text-sm text-muted-foreground">Create your first warehouse location</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-4">
                    {warehouses.map((w: any) => (
                        <div key={w.id} className="glass-card rounded-2xl p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                        <Warehouse className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold">{w.name}</h3>
                                        {w.location && <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{w.location}</p>}
                                    </div>
                                </div>
                                <button onClick={() => setConfirmDelete(w.id)} className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all" title="Delete">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Zones ({w.zones?.length || 0})</span>
                                <button onClick={() => setShowZone({ wh: w })} className="text-[9px] font-black uppercase tracking-wider text-primary">+ Add Zone</button>
                            </div>

                            {w.zones && w.zones.length > 0 && (
                                <div className="space-y-1">
                                    {w.zones.map((z: any) => (
                                        <div key={z.id} className="flex items-center gap-2 text-xs bg-secondary/20 rounded-lg px-3 py-2">
                                            <MapPin className="w-3 h-3 text-muted-foreground" />
                                            <span>{z.name}</span>
                                            {z.code && <span className="text-muted-foreground">({z.code})</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Create Warehouse Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
                    <div className="glass-card rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-black mb-4">New Warehouse</h2>
                        <div className="space-y-3">
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" placeholder="Warehouse name" />
                            <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                                className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" placeholder="Location (optional)" />
                            <div className="flex gap-3 pt-2">
                                <LoadingButton onClick={() => setShowCreate(false)} variant="secondary">Cancel</LoadingButton>
                                <LoadingButton onClick={createWarehouse} loading={submitting}>Create</LoadingButton>
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
                    title="Delete Warehouse?"
                    message="This will permanently remove this warehouse and all its zones. Inventory assigned to it will not be deleted."
                    onConfirm={() => deleteWarehouse(confirmDelete)}
                    onCancel={() => setConfirmDelete(null)}
                />
            )}

            {/* Add Zone Modal */}
            {showZone && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={() => setShowZone(null)}>
                    <div className="glass-card rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-black mb-2">Add Zone</h2>
                        <p className="text-sm text-muted-foreground mb-4">{showZone.wh.name}</p>
                        <div className="space-y-3">
                            <input value={zoneForm.name} onChange={e => setZoneForm({ ...zoneForm, name: e.target.value })}
                                className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" placeholder="Zone name (e.g. Aisle 3)" />
                            <input value={zoneForm.code} onChange={e => setZoneForm({ ...zoneForm, code: e.target.value })}
                                className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" placeholder="Code (e.g. A3)" />
                            <div className="flex gap-3 pt-2">
                                <LoadingButton onClick={() => setShowZone(null)} variant="secondary">Cancel</LoadingButton>
                                <LoadingButton onClick={createZone} loading={submitting}>Add</LoadingButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
