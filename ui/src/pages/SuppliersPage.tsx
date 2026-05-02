import { useState, useEffect } from 'react';
import { Plus, Search, Phone, Mail, Globe, Truck, X, Building2 } from 'lucide-react';
import api from '../lib/api-client';
import { toast } from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../contexts/AuthContext';

interface Supplier {
    id: string;
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
    isActive: boolean;
    branchId?: string;
}

// Helper to check permissions
const canManageSuppliers = (user: any) => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'manager') return true;
    if (user.role === 'head_of_sales') return user.permissions?.canManageInventory;
    return false;
};

export default function SuppliersPage() {
    const { user } = useAuth();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal Form State
    const [formData, setFormData] = useState<Partial<Supplier>>({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchSuppliers();
        if (user?.role === 'admin') {
            fetchBranches();
        }
    }, [user]);

    const fetchBranches = async () => {
        try {
            const response = await api.getBranches();
            setBranches(response.data.branches || []);
        } catch (error) {
            console.error('Failed to fetch branches', error);
        }
    };

    const fetchSuppliers = async () => {
        try {
            setLoading(true);
            const response = await api.getSuppliers();
            setSuppliers(response.data.suppliers || []);
        } catch (error) {
            console.error('Failed to fetch suppliers', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.createSupplier(formData);
            toast.success('Supplier added');
            setShowModal(false);
            setFormData({});
            fetchSuppliers();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to add supplier');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredSuppliers = suppliers.filter(s => {
        const searchLower = searchTerm.toLowerCase().trim();
        if (!searchLower) return true;

        const searchWords = searchLower.split(/\s+/).filter(Boolean);
        const searchableFields = [
            s.name || '',
            s.contactPerson || '',
            s.email || '',
            s.phone || '',
            s.address || ''
        ].map(f => f.toLowerCase());

        return searchWords.every(word => 
            searchableFields.some(field => field.includes(word))
        );
    });

    return (
        <div className="min-h-screen bg-background flex flex-col font-sans transition-colors duration-300">
            {/* Header */}
            <header className="bg-background/80 backdrop-blur-md border-b border-border/40 px-6 py-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-600/10 rounded-lg flex items-center justify-center text-blue-600 shadow-sm ring-1 ring-inset ring-blue-600/20">
                            <Truck className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">
                                Supply <span className="text-primary">Network</span>
                            </h1>
                            <p className="text-xs text-muted-foreground font-medium">Vendor partnerships and logistics</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        {canManageSuppliers(user) && (
                            <button
                                onClick={() => setShowModal(true)}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all shadow-sm active:scale-[0.98]"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="hidden md:inline">Add Vendor</span>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full px-6 py-8 space-y-8 animate-in fade-in zoom-in-95 duration-500 text-left">
                {/* Search & Stats */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search vendors..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-11 pl-12 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Active Accounts:</span>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold text-emerald-500 shadow-sm">
                            {suppliers.filter(s => s.isActive).length}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-64 bg-muted rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : filteredSuppliers.length === 0 ? (
                    <div className="bg-card border border-dashed border-border p-16 text-center rounded-2xl">
                        <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-bold text-foreground">No vendors found</h3>
                        <p className="text-muted-foreground text-sm mt-1">Start by adding your first supply partner to the terminal.</p>
                        <button onClick={() => setShowModal(true)} className="mt-6 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors">Add Vendor</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredSuppliers.map(supplier => (
                            <div key={supplier.id} className="group relative rounded-xl border border-border/50 bg-card p-6 flex flex-col gap-6 hover:border-primary/50 transition-all shadow-sm hover:shadow-md">
                                <div className="flex justify-between items-start">
                                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold text-xl ring-1 ring-inset ring-primary/20">
                                        {supplier.name.charAt(0)}
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${supplier.isActive ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                        {supplier.isActive ? 'Active' : 'Offline'}
                                    </span>
                                </div>

                                <div className="space-y-1">
                                    <h3 className="font-bold text-foreground line-clamp-1">{supplier.name}</h3>
                                    {supplier.contactPerson && (
                                        <p className="text-xs text-muted-foreground">{supplier.contactPerson}</p>
                                    )}
                                </div>

                                <div className="space-y-3 pt-4 border-t border-border/50">
                                    {supplier.phone && (
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                                            <Phone className="w-4 h-4 opacity-50" />
                                            <span>{supplier.phone}</span>
                                        </div>
                                    )}
                                    {supplier.email && (
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                                            <Mail className="w-4 h-4 opacity-50" />
                                            <span className="truncate">{supplier.email}</span>
                                        </div>
                                    )}
                                    {supplier.website && (
                                        <div className="flex items-center gap-3 text-xs text-primary">
                                            <Globe className="w-4 h-4 opacity-50" />
                                            <span className="truncate">{supplier.website.replace(/^https?:\/\//, '')}</span>
                                        </div>
                                    )}
                                </div>

                                {canManageSuppliers(user) && (
                                    <button className="mt-auto h-8 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground px-3 rounded-lg text-[10px] uppercase font-bold transition-colors">
                                        Edit Vendor
                                    </button>
                                )}
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
                            <h2 className="text-xl font-bold text-foreground">Register Vendor</h2>
                            <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {user?.role === 'admin' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Assign Branch</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <select
                                            className="w-full h-10 rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none"
                                            value={formData.branchId || ''}
                                            onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                                            required
                                        >
                                            <option value="">Select a Branch...</option>
                                            {branches.map(branch => (
                                                <option key={branch.id} value={branch.id}>
                                                    {branch.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">Admins must select a branch for the supplier.</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Company Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Key Contact</label>
                                    <input
                                        type="text"
                                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                        value={formData.contactPerson || ''}
                                        onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Communication</label>
                                    <input
                                        type="tel"
                                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                        value={formData.phone || ''}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Identity</label>
                                <input
                                    type="email"
                                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    value={formData.email || ''}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">HQ Address</label>
                                <textarea
                                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    value={formData.address || ''}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {submitting ? 'Registering...' : 'Confirm Registration'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
