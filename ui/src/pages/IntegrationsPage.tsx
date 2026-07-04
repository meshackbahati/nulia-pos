import { useState, useEffect } from 'react';
import { Plug, RefreshCw, Plus, Trash2, CheckCircle, XCircle, Edit2 } from 'lucide-react';
import api from '../lib/api-client';
import toast from 'react-hot-toast';
import CustomModal from '../components/CustomModal';
import LoadingButton from '../components/LoadingButton';

const PROVIDER_CONFIG_FIELDS: Record<string, { key: string; label: string; placeholder: string; type?: string }[]> = {
    quickbooks: [
        { key: 'clientId', label: 'Client ID', placeholder: 'QuickBooks OAuth client ID' },
        { key: 'clientSecret', label: 'Client Secret', placeholder: 'QuickBooks OAuth client secret', type: 'password' },
        { key: 'companyId', label: 'Company ID', placeholder: 'QuickBooks company/realm ID' },
    ],
    shopify: [
        { key: 'storeUrl', label: 'Store URL', placeholder: 'https://my-store.myshopify.com' },
        { key: 'accessToken', label: 'Access Token', placeholder: 'Shopify admin API access token', type: 'password' },
    ],
    custom: [
        { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://your-server.com/webhook' },
        { key: 'apiKey', label: 'API Key (optional)', placeholder: 'Bearer token for auth', type: 'password' },
    ],
};

export default function IntegrationsPage() {
    const [integrations, setIntegrations] = useState<any[]>([]);
    const [providers, setProviders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [syncing, setSyncing] = useState<string | null>(null);
    const [syncDataType, setSyncDataType] = useState<string>('products');
    const [form, setForm] = useState({ name: '', provider: '', config: '{}' as string | Record<string, string> });
    const [submitting, setSubmitting] = useState(false);
    const [configFields, setConfigFields] = useState<Record<string, string>>({});
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    useEffect(() => {
        load();
    }, []);

    async function load() {
        setLoading(true);
        try {
            const [intRes, provRes] = await Promise.all([
                api.get('/integrations'),
                api.get('/integrations/providers'),
            ]);
            setIntegrations(intRes.data.integrations || []);
            setProviders(provRes.data.providers || []);
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Failed to load integrations');
        } finally {
            setLoading(false);
        }
    }

    function buildConfig(_provider: string, fields: Record<string, string>): Record<string, string> {
        return { ...fields };
    }

    function handleProviderChange(provider: string) {
        setForm({ ...form, provider, config: '{}' });
        setConfigFields({});
    }

    async function handleSave() {
        if (!form.name || !form.provider) {
            toast.error('Name and provider are required');
            return;
        }
        const config = buildConfig(form.provider, configFields);
        setSubmitting(true);
        try {
            if (editId) {
                await api.put(`/integrations/${editId}`, { name: form.name, config });
                toast.success('Integration updated');
            } else {
                await api.post('/integrations', { name: form.name, provider: form.provider, config });
                toast.success('Integration connected');
            }
            setShowAdd(false);
            setEditId(null);
            setForm({ name: '', provider: '', config: '{}' });
            setConfigFields({});
            load();
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Save failed');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSync(id: string) {
        setSyncing(id);
        try {
            const res = await api.post(`/integrations/${id}/sync`, { dataType: syncDataType });
            const count = res.data.results?.length || res.data.synced || 0;
            toast.success(`Synced ${count} ${syncDataType}`);
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Sync failed');
        } finally {
            setSyncing(null);
        }
    }

    function openEdit(int: any) {
        setForm({ name: int.name, provider: int.provider, config: '{}' });
        setConfigFields(int.config || {});
        setEditId(int.id);
        setShowAdd(true);
    }

    function openAdd() {
        setEditId(null);
        setForm({ name: '', provider: '', config: '{}' });
        setConfigFields({});
        setShowAdd(true);
    }

    async function handleDelete(id: string) {
        try {
            await api.delete(`/integrations/${id}`);
            toast.success('Integration removed');
            setConfirmDelete(null);
            load();
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Delete failed');
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Integrations</h1>
                    <p className="text-sm text-muted-foreground mt-1">Connect external services</p>
                    <p className="text-[9px] text-muted-foreground/60 mt-0.5">Link your shop to QuickBooks, Shopify, or other platforms. Push products and sales to your accounting or e-commerce system.</p>
                </div>
                <button onClick={openAdd} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Connect
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="loading-spinner border-primary" />
                </div>
            ) : integrations.length === 0 ? (
                <div className="text-center py-20 glass-card rounded-2xl">
                    <Plug className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                    <h3 className="text-lg font-bold mb-2">No Integrations</h3>
                    <p className="text-sm text-muted-foreground mb-6">Connect QuickBooks, Shopify, or other services</p>
                    <button onClick={openAdd} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase tracking-wider">
                        Add Integration
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {integrations.map((int: any) => (
                        <div key={int.id} className="glass-card rounded-2xl p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${int.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {int.isActive ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h3 className="font-bold">{int.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary/30 px-2 py-0.5 rounded-full">{int.provider}</span>
                                        <span className="text-[10px] text-muted-foreground">{int.syncDirection}</span>
                                        {int.lastSyncAt && (
                                            <span className="text-[10px] text-muted-foreground">Last sync: {new Date(int.lastSyncAt).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <select value={syncDataType} onChange={e => setSyncDataType(e.target.value)}
                                    className="text-[10px] border border-input rounded-md bg-background px-2 py-1 text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                                    <option value="products">Products</option>
                                    <option value="sales">Sales</option>
                                </select>
                                <button onClick={() => handleSync(int.id)} disabled={syncing === int.id || !int.isActive}
                                    className="p-2 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all disabled:opacity-40" title="Sync">
                                    <RefreshCw className={`w-4 h-4 ${syncing === int.id ? 'animate-spin' : ''}`} />
                                </button>
                                <button onClick={() => openEdit(int)} className="p-2 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all" title="Edit">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setConfirmDelete(int.id)} className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all" title="Remove">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Integration Modal */}
            {showAdd && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
                    <div className="glass-card rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-black mb-4">{editId ? 'Edit Integration' : 'Connect Service'}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Name</label>
                                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" placeholder="My QuickBooks" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Provider</label>
                                <select value={form.provider} onChange={e => handleProviderChange(e.target.value)}
                                    className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" disabled={!!editId}>
                                    <option value="">Select provider</option>
                                    {providers.map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                                    ))}
                                </select>
                            </div>
                            {/* Provider-specific config fields */}
                            {form.provider && PROVIDER_CONFIG_FIELDS[form.provider] && (
                                <div className="space-y-3 p-3 bg-secondary/20 rounded-xl border border-white/5">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                        {providers.find((p: any) => p.id === form.provider)?.name || form.provider} Configuration
                                    </p>
                                    {PROVIDER_CONFIG_FIELDS[form.provider].map((field) => (
                                        <div key={field.key}>
                                            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">{field.label}</label>
                                            <input
                                                type={field.type || 'text'}
                                                value={configFields[field.key] || ''}
                                                onChange={e => setConfigFields({ ...configFields, [field.key]: e.target.value })}
                                                className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary"
                                                placeholder={field.placeholder} />
                                        </div>
                                    ))}
                                </div>
                            )}
                            {/* Raw JSON fallback for providers without specific fields */}
                            {form.provider && !PROVIDER_CONFIG_FIELDS[form.provider] && (
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Config (JSON)</label>
                                    <textarea value={typeof form.config === 'string' ? form.config : JSON.stringify(form.config, null, 2)}
                                        onChange={e => setForm({ ...form, config: e.target.value })}
                                        className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary font-mono" rows={6}
                                        placeholder='{"apiKey": "..."}' />
                                </div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <LoadingButton onClick={() => { setShowAdd(false); setEditId(null); }} variant="secondary">Cancel</LoadingButton>
                                <LoadingButton onClick={handleSave} loading={submitting}>{editId ? 'Save Changes' : 'Connect & Test'}</LoadingButton>
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
                    title="Remove Integration?"
                    message="This will disconnect the service. Data already synced is not affected."
                    onConfirm={() => handleDelete(confirmDelete)}
                    onCancel={() => setConfirmDelete(null)}
                />
            )}
        </div>
    );
}
