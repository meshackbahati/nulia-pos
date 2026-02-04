import { useState, useEffect } from 'react';
import { Plus, Search, Phone, Mail, Globe, Truck, X } from 'lucide-react';
import api from '../lib/api-client';
import { toast } from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';

interface Supplier {
    id: string;
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
    isActive: boolean;
}

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal Form State
    const [formData, setFormData] = useState<Partial<Supplier>>({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchSuppliers();
    }, []);

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

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-300">
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                            <Truck className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                                Supply <span className="text-blue-600">Network</span>
                            </h1>
                            <p className="text-xs text-slate-500 font-medium">Vendor partnerships and logistics</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <button
                            onClick={() => setShowModal(true)}
                            className="modern-button bg-blue-600 text-white flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden md:inline uppercase text-xs font-bold">Add Vendor</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full px-6 py-8 space-y-8 animate-in text-left">
                {/* Search & Stats */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search vendors..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="modern-input pl-12 h-11"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Active Accounts:</span>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1 rounded-full text-xs font-bold text-green-600 shadow-sm">
                            {suppliers.filter(s => s.isActive).length}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : filteredSuppliers.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-dash border-slate-200 dark:border-slate-800 p-16 text-center rounded-2xl">
                        <Truck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">No vendors found</h3>
                        <p className="text-slate-500 text-sm mt-1">Start by adding your first supply partner to the terminal.</p>
                        <button onClick={() => setShowModal(true)} className="mt-6 modern-button bg-blue-600 text-white">Add Vendor</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredSuppliers.map(supplier => (
                            <div key={supplier.id} className="modern-card p-6 flex flex-col gap-6 group">
                                <div className="flex justify-between items-start">
                                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-600 font-bold text-xl">
                                        {supplier.name.charAt(0)}
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${supplier.isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        {supplier.isActive ? 'Active' : 'Offline'}
                                    </span>
                                </div>

                                <div className="space-y-1">
                                    <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1">{supplier.name}</h3>
                                    {supplier.contactPerson && (
                                        <p className="text-xs text-slate-500">{supplier.contactPerson}</p>
                                    )}
                                </div>

                                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    {supplier.phone && (
                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                            <Phone className="w-4 h-4 opacity-50" />
                                            <span>{supplier.phone}</span>
                                        </div>
                                    )}
                                    {supplier.email && (
                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                            <Mail className="w-4 h-4 opacity-50" />
                                            <span className="truncate">{supplier.email}</span>
                                        </div>
                                    )}
                                    {supplier.website && (
                                        <div className="flex items-center gap-3 text-xs text-blue-600">
                                            <Globe className="w-4 h-4 opacity-50" />
                                            <span className="truncate">{supplier.website.replace(/^https?:\/\//, '')}</span>
                                        </div>
                                    )}
                                </div>

                                <button className="mt-auto h-8 modern-button bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] uppercase font-bold hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-600">Edit Vendor</button>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6 z-[100] animate-in">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-2xl w-full p-8 border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Register Vendor</h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Name</label>
                                <input type="text" required className="modern-input" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Key Contact</label>
                                    <input type="text" className="modern-input" value={formData.contactPerson || ''} onChange={e => setFormData({ ...formData, contactPerson: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Communication</label>
                                    <input type="tel" className="modern-input" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Identity</label>
                                <input type="email" className="modern-input" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">HQ Address</label>
                                <textarea className="modern-input h-20" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                            </div>

                            <button type="submit" disabled={submitting} className="w-full h-12 modern-button bg-blue-600 text-white font-bold shadow-sm disabled:opacity-50">
                                {submitting ? 'Registering...' : 'Confirm Registration'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
