import { useState, useEffect } from 'react';
import { Plus, Search, MapPin, Phone, Building, CreditCard, Globe, Edit, X, Percent, Hash, Clock, ShieldCheck, UserMinus, UserCheck } from 'lucide-react';
import api from '../lib/api-client';
import toast from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';
import { useCurrency } from '../hooks/useCurrency';
import { useModal } from '../contexts/ModalContext';

interface Branch {
    id: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    currency: string;
    currencySymbol: string;
    secondaryCurrency?: string;
    exchangeRate?: number;
    taxRate: number;
    vatNumber?: string;
    timezone: string;
    isActive: boolean;
}

export default function BranchesPage() {
    const { baseCurrency: defaultCurrency } = useCurrency();
    const { showConfirm } = useModal();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [includeInactive, setIncludeInactive] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        email: '',
        currency: 'KES',
        currencySymbol: 'KSh',
        secondaryCurrency: '',
        exchangeRate: 1,
        taxRate: 0,
        vatNumber: '',
        timezone: 'UTC',
        isActive: true,
    });

    useEffect(() => {
        fetchBranches();
    }, [includeInactive]);

    const fetchBranches = async () => {
        try {
            setLoading(true);
            const res = await api.getBranches({ includeInactive });
            setBranches(res.data.branches || []);
        } catch (error) {
            console.error('Error fetching branches:', error);
            toast.error('Failed to load branches');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (branch?: Branch) => {
        if (branch) {
            setEditingBranch(branch);
            setFormData({
                name: branch.name,
                address: branch.address,
                phone: branch.phone,
                email: branch.email,
                currency: branch.currency,
                currencySymbol: branch.currencySymbol || 'KSh',
                secondaryCurrency: branch.secondaryCurrency || '',
                exchangeRate: branch.exchangeRate || 1,
                taxRate: branch.taxRate || 0,
                vatNumber: branch.vatNumber || '',
                timezone: branch.timezone || 'UTC',
                isActive: branch.isActive,
            });
        } else {
            setEditingBranch(null);
            setFormData({
                name: '',
                address: '',
                phone: '',
                email: '',
                currency: defaultCurrency || 'KES',
                currencySymbol: 'KSh',
                secondaryCurrency: '',
                exchangeRate: 1,
                taxRate: 0,
                vatNumber: '',
                timezone: 'UTC',
                isActive: true,
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingBranch) {
                await api.updateBranch({ id: editingBranch.id, ...formData });
                toast.success('Branch updated');
            } else {
                await api.createBranch(formData);
                toast.success('Branch created');
            }
            setShowModal(false);
            fetchBranches();
        } catch (error) {
            console.error('Error saving branch:', error);
            toast.error('Failed to save branch');
        }
    };

    const handleToggleStatus = async (branch: Branch) => {
        const action = branch.isActive ? 'deactivate' : 'reactivate';

        showConfirm({
            title: `${branch.isActive ? 'Deactivate' : 'Reactivate'} Hub`,
            message: `Are you sure you want to ${action} ${branch.name}? ${branch.isActive ? 'This will prevent agents from logging into this branch and hide its inventory.' : 'This will restore full access to this hub.'}`,
            type: branch.isActive ? 'warning' : 'confirm',
            confirmText: `Yes, ${action}`,
            onConfirm: async () => {
                try {
                    await api.updateBranch({ id: branch.id, isActive: !branch.isActive });
                    toast.success(`Hub ${action}d`);
                    fetchBranches();
                } catch (error) {
                    toast.error(`Failed to ${action} hub`);
                }
            }
        });
    };

    const filteredBranches = branches.filter(branch =>
        branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        branch.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-muted-foreground text-sm font-medium">Synchronizing Network...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col font-sans transition-colors duration-300">
            {/* Header */}
            <header className="bg-background/80 backdrop-blur-md border-b border-border/40 px-6 py-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shadow-sm ring-1 ring-inset ring-primary/20">
                            <Globe className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">
                                Store <span className="text-primary">Network</span>
                            </h1>
                            <p className="text-xs text-muted-foreground font-medium">Manage global branch locations and protocols</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 mr-4 bg-muted/50 px-3 py-1.5 rounded-full border border-border/50">
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">Include Offline</label>
                            <button
                                onClick={() => setIncludeInactive(!includeInactive)}
                                className={`w-8 h-4 rounded-full transition-all relative ${includeInactive ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]' : 'bg-muted-foreground/30'}`}
                            >
                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${includeInactive ? 'translate-x-4.5' : 'translate-x-0.5'}`}></div>
                            </button>
                        </div>
                        <ThemeToggle />
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all shadow-sm active:scale-[0.98]"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden md:inline">Initialize Hub</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full px-6 py-8 space-y-8 animate-in fade-in zoom-in-95 duration-500">
                {/* Search */}
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search system network by name or address..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-14 pl-12 rounded-2xl border border-border bg-card/50 backdrop-blur-sm px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0 transition-all shadow-inner"
                    />
                </div>

                {filteredBranches.length === 0 ? (
                    <div className="bg-card border border-dashed border-border p-20 text-center rounded-[2rem]">
                        <Building className="w-16 h-16 text-muted-foreground mx-auto mb-6 opacity-20" />
                        <h3 className="text-xl font-bold text-foreground uppercase tracking-tight">Zero Nodes Detected</h3>
                        <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">The system network is currently fragmented. Initialize a hub node to begin operations.</p>
                        <button onClick={() => handleOpenModal()} className="mt-8 bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">Setup Initial Hub</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredBranches.map((branch) => (
                            <div key={branch.id} className={`group relative rounded-[1.5rem] border bg-card p-6 flex flex-col gap-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 ${branch.isActive ? 'border-border/50' : 'border-destructive/20 bg-destructive/5 grayscale'}`}>
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0">
                                        <h3 className="text-lg font-black text-foreground uppercase tracking-tighter truncate">
                                            {branch.name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`w-2 h-2 rounded-full ${branch.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></span>
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${branch.isActive ? 'text-emerald-500' : 'text-destructive'}`}>
                                                {branch.isActive ? 'Operational' : 'Offline'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleOpenModal(branch)}
                                            className="p-2.5 text-muted-foreground hover:text-primary transition-colors bg-muted/50 hover:bg-primary/10 rounded-xl"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleToggleStatus(branch)}
                                            className={`p-2.5 transition-colors rounded-xl ${branch.isActive ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10' : 'text-emerald-500 hover:bg-emerald-500/10'}`}
                                            title={branch.isActive ? 'Deactivate Node' : 'Reactivate Node'}
                                        >
                                            {branch.isActive ? <UserMinus className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-border/50">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                        <span className="text-xs text-muted-foreground leading-relaxed font-medium">{branch.address}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3">
                                            <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                                            <span className="text-[10px] font-bold text-foreground">{branch.phone}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                                            <span className="text-[10px] font-bold text-foreground">{branch.timezone}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto bg-muted/30 p-4 rounded-xl flex items-center justify-between border border-border/20">
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Base Protocol</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-primary">{branch.currency} ({branch.currencySymbol})</span>
                                        </div>
                                    </div>
                                    {branch.taxRate > 0 && (
                                        <div className="text-right">
                                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Tax logic</p>
                                            <span className="text-xs font-black text-foreground">{branch.taxRate}%</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center p-6 z-[100] animate-in fade-in duration-200">
                    <div className="bg-card rounded-[2rem] shadow-2xl max-w-3xl w-full p-10 border border-border ring-1 ring-border/50 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-foreground uppercase tracking-tighter">
                                        {editingBranch ? 'Update Node Configuration' : 'Initialize New Hub'}
                                    </h2>
                                    <p className="text-xs text-muted-foreground font-medium">Configure core operational parameters</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted rounded-full">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Identity: Hub Name</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Nairobi Central Hub"
                                            className="w-full h-12 rounded-xl border border-input bg-background px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Logistics: Street Address</label>
                                        <textarea
                                            required
                                            placeholder="Full physical location details..."
                                            className="w-full min-h-[100px] rounded-xl border border-input bg-background px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Comms: Phone</label>
                                            <input
                                                type="tel"
                                                required
                                                placeholder="+254..."
                                                className="w-full h-12 rounded-xl border border-input bg-background px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Comms: Email</label>
                                            <input
                                                type="email"
                                                required
                                                placeholder="hub@retailpro.com"
                                                className="w-full h-12 rounded-xl border border-input bg-background px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-muted/30 p-6 rounded-3xl border border-border/50 space-y-6">
                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                                            <CreditCard className="w-3 h-3" /> Financial Protocols
                                        </p>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Primary Asset</label>
                                                <select
                                                    className="w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-xs font-black focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    value={formData.currency}
                                                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                                >
                                                    <option value="KES">KES</option>
                                                    <option value="USD">USD</option>
                                                    <option value="EUR">EUR</option>
                                                    <option value="GBP">GBP</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Asset Symbol</label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="KSh"
                                                    className="w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-xs font-black focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    value={formData.currencySymbol}
                                                    onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter flex items-center gap-1">
                                                    <Percent className="w-3 h-3" /> Tax Rate (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-xs font-black focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    value={formData.taxRate}
                                                    onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter flex items-center gap-1">
                                                    <Hash className="w-3 h-3" /> VAT/Tax ID
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="P05..."
                                                    className="w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-xs font-black focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    value={formData.vatNumber}
                                                    onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2 pt-4 border-t border-border/50">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> Timezone
                                            </label>
                                            <select
                                                className="w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-xs font-black focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                value={formData.timezone}
                                                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                                            >
                                                <option value="UTC">UTC (Universal)</option>
                                                <option value="Africa/Nairobi">EAT (Nairobi, UTC+3)</option>
                                                <option value="Europe/London">GMT/BST (London)</option>
                                                <option value="America/New_York">EST/EDT (New York)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 space-y-4">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest">Secondary Normalization Node</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Secondary Node</label>
                                        <select
                                            className="w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-xs font-black focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            value={formData.secondaryCurrency || ''}
                                            onChange={(e) => setFormData({ ...formData, secondaryCurrency: e.target.value })}
                                        >
                                            <option value="">-- None --</option>
                                            <option value="KES">KES</option>
                                            <option value="USD">USD</option>
                                        </select>
                                    </div>
                                    {formData.secondaryCurrency && (
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Normalization Rate (1 {formData.currency} = ? {formData.secondaryCurrency})</label>
                                            <input
                                                type="number"
                                                step="0.0001"
                                                className="w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-xs font-black focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                value={formData.exchangeRate}
                                                onChange={(e) => setFormData({ ...formData, exchangeRate: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full h-16 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98]"
                            >
                                {editingBranch ? 'Confirm Update' : 'Authorize Initialization'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
