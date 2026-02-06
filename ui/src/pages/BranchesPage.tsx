import { useState, useEffect } from 'react';
import { Plus, Search, MapPin, Phone, Building, CreditCard, Globe, Edit, X } from 'lucide-react';
import api from '../lib/api-client';
import toast from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';
import { useCurrency } from '../hooks/useCurrency';

interface Branch {
    id: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    currency: string;
    secondaryCurrency?: string;
    exchangeRate?: number;
    isActive: boolean;
}

export default function BranchesPage() {
    const { currency: defaultCurrency } = useCurrency();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

    const [formData, setFormData] = useState<{
        name: string;
        address: string;
        phone: string;
        email: string;
        currency: string;
        secondaryCurrency?: string;
        exchangeRate: number;
    }>({
        name: '',
        address: '',
        phone: '',
        email: '',
        currency: defaultCurrency || 'KES',
        secondaryCurrency: '',
        exchangeRate: 1,
    });

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        try {
            setLoading(true);
            const res = await api.getBranches();
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
                secondaryCurrency: branch.secondaryCurrency || '',
                exchangeRate: branch.exchangeRate || 1,
            });
        } else {
            setEditingBranch(null);
            setFormData({
                name: '',
                address: '',
                phone: '',
                email: '',
                currency: 'USD',
                secondaryCurrency: '',
                exchangeRate: 1,
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

    const filteredBranches = branches.filter(branch =>
        branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        branch.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-muted-foreground text-sm font-medium">Loading Network...</p>
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
                            <p className="text-xs text-muted-foreground font-medium">Manage branch locations and configurations</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all shadow-sm active:scale-[0.98]"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden md:inline">Add Branch</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full px-6 py-8 space-y-8 animate-in fade-in zoom-in-95 duration-500">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search branches..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-12 pl-12 rounded-lg border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>

                {filteredBranches.length === 0 ? (
                    <div className="bg-card border border-dashed border-border p-16 text-center rounded-2xl">
                        <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-bold text-foreground">No branches found</h3>
                        <p className="text-muted-foreground text-sm mt-1">Initialize your first hub to start the network.</p>
                        <button onClick={() => handleOpenModal()} className="mt-6 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors">Setup Initial Hub</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredBranches.map((branch) => (
                            <div key={branch.id} className="group relative rounded-xl border border-border/50 bg-card p-6 flex flex-col gap-5 hover:border-primary/50 transition-all shadow-sm hover:shadow-md">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-bold text-foreground uppercase tracking-tight">
                                            {branch.name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`w-2 h-2 rounded-full ${branch.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></span>
                                            <span className="text-[10px] font-bold uppercase text-muted-foreground">
                                                {branch.isActive ? 'Operational' : 'Offline'}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleOpenModal(branch)}
                                        className="p-2 text-muted-foreground hover:text-primary transition-colors bg-muted/50 hover:bg-muted rounded-md"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-border/50">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                        <span className="text-xs text-muted-foreground leading-relaxed">{branch.address}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                        <span className="text-xs text-muted-foreground">{branch.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <CreditCard className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                            Base: <span className="text-primary">{branch.currency}</span>
                                            {branch.secondaryCurrency && <span className="ml-2">• {branch.secondaryCurrency} @ {branch.exchangeRate}</span>}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6 z-[100] animate-in fade-in duration-200">
                    <div className="bg-card rounded-2xl shadow-xl max-w-2xl w-full p-8 border border-border ring-1 ring-border/50">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-bold text-foreground">
                                {editingBranch ? 'Update Hub Node' : 'Initialize Hub Node'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Branch Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Street Address</label>
                                <textarea
                                    required
                                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Phone</label>
                                    <input
                                        type="tel"
                                        required
                                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="bg-muted/30 p-6 rounded-xl space-y-6 border border-border/50">
                                <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Currency Configuration</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Primary Asset</label>
                                        <select
                                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                            value={formData.currency}
                                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                        >
                                            <option value="USD">USD ($)</option>
                                            <option value="KES">KES (KSh)</option>
                                            <option value="EUR">EUR (€)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Secondary Node</label>
                                        <select
                                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                            value={formData.secondaryCurrency || ''}
                                            onChange={(e) => setFormData({ ...formData, secondaryCurrency: e.target.value })}
                                        >
                                            <option value="">-- None --</option>
                                            <option value="USD">USD ($)</option>
                                            <option value="KES">KES (KSh)</option>
                                        </select>
                                    </div>
                                </div>

                                {formData.secondaryCurrency && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Normalization Rate</label>
                                        <input
                                            type="number"
                                            step="0.0001"
                                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                            value={formData.exchangeRate}
                                            onChange={(e) => setFormData({ ...formData, exchangeRate: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-bold shadow-sm transition-all"
                            >
                                {editingBranch ? 'Update Configuration' : 'Confirm Initialization'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
