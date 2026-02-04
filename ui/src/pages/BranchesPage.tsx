import { useState, useEffect } from 'react';
import { Plus, Search, MapPin, Phone, Building, CreditCard, Globe, Edit, X } from 'lucide-react';
import api from '../lib/api-client';
import toast from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';

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
        currency: 'USD',
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
            <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 text-sm font-medium">Loading Network...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-300">
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                            <Globe className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                                Store <span className="text-blue-600">Network</span>
                            </h1>
                            <p className="text-xs text-slate-500 font-medium">Manage branch locations and configurations</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <button
                            onClick={() => handleOpenModal()}
                            className="modern-button bg-blue-600 text-white flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden md:inline uppercase text-xs font-bold">Add Branch</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full px-6 py-8 space-y-8 animate-in">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search branches..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="modern-input pl-12 h-12 text-base"
                    />
                </div>

                {filteredBranches.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-dash border-slate-200 dark:border-slate-800 p-16 text-center rounded-2xl">
                        <Building className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">No branches found</h3>
                        <p className="text-slate-500 text-sm mt-1">Initialize your first hub to start the network.</p>
                        <button onClick={() => handleOpenModal()} className="mt-6 modern-button bg-blue-600 text-white">Setup Initial Hub</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredBranches.map((branch) => (
                            <div key={branch.id} className="modern-card p-6 flex flex-col gap-5 group">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                                            {branch.name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`w-2 h-2 rounded-full ${branch.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                            <span className="text-[10px] font-bold uppercase text-slate-400">
                                                {branch.isActive ? 'Operational' : 'Offline'}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleOpenModal(branch)}
                                        className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
                                        <span className="text-xs text-slate-500 leading-relaxed">{branch.address}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Phone className="w-4 h-4 text-slate-300 flex-shrink-0" />
                                        <span className="text-xs text-slate-500">{branch.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <CreditCard className="w-4 h-4 text-slate-300 flex-shrink-0" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                                            Base: <span className="text-blue-600">{branch.currency}</span>
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
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6 z-[100] animate-in">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-2xl w-full p-8 border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {editingBranch ? 'Update Hub Node' : 'Initialize Hub Node'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Branch Name</label>
                                <input type="text" required className="modern-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Street Address</label>
                                <textarea required className="modern-input h-20" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</label>
                                    <input type="tel" required className="modern-input" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                                    <input type="email" required className="modern-input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl space-y-6">
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Currency Configuration</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Primary Asset</label>
                                        <select className="modern-input" value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })}>
                                            <option value="USD">USD ($)</option>
                                            <option value="KES">KES (KSh)</option>
                                            <option value="EUR">EUR (€)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Secondary Node</label>
                                        <select className="modern-input" value={formData.secondaryCurrency || ''} onChange={(e) => setFormData({ ...formData, secondaryCurrency: e.target.value })}>
                                            <option value="">-- None --</option>
                                            <option value="USD">USD ($)</option>
                                            <option value="KES">KES (KSh)</option>
                                        </select>
                                    </div>
                                </div>

                                {formData.secondaryCurrency && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Normalization Rate</label>
                                        <input type="number" step="0.0001" className="modern-input" value={formData.exchangeRate} onChange={(e) => setFormData({ ...formData, exchangeRate: parseFloat(e.target.value) })} />
                                    </div>
                                )}
                            </div>

                            <button type="submit" className="w-full h-12 modern-button bg-blue-600 text-white font-bold shadow-sm">
                                {editingBranch ? 'Update Configuration' : 'Confirm Initialization'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
