import { useState, useEffect } from 'react';
import api from '../lib/api-client';
import { Mail, Users, Shield, UserPlus, Building, X } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import toast from 'react-hot-toast';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    branch?: { id: string; name: string };
    isActive: boolean;
    lastLoginAt?: string;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'salesperson',
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await api.listUsers();
            setUsers(response.data.users || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            await api.createUser(formData);
            setShowAddModal(false);
            setFormData({
                email: '',
                password: '',
                firstName: '',
                lastName: '',
                role: 'salesperson',
            });
            toast.success('Agent created successfully');
            fetchUsers();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to create agent');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-300">
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                                Agent <span className="text-blue-600">Management</span>
                            </h1>
                            <p className="text-xs text-slate-500 font-medium">Control system access and permissions</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="modern-button bg-blue-600 text-white flex items-center gap-2"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span className="hidden md:inline uppercase text-xs font-bold">Add New Agent</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full px-6 py-8 animate-in">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : users.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-dash border-slate-200 dark:border-slate-800 p-16 text-center rounded-2xl">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">No agents found</h3>
                        <p className="text-slate-500 text-sm mt-1">Get started by creating your first system user.</p>
                        <button onClick={() => setShowAddModal(true)} className="mt-6 modern-button bg-blue-600 text-white">Create Agent</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {users.map((user) => (
                            <div key={user.id} className="modern-card p-6 flex flex-col gap-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                                            {user.firstName[0]}{user.lastName[0]}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white">
                                                {user.firstName} {user.lastName}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                                                    {user.role}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button className="text-slate-400 hover:text-blue-600 transition-colors">
                                        <Shield className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Mail className="w-4 h-4 opacity-50" />
                                        <span>{user.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Building className="w-4 h-4 opacity-50" />
                                        <span>{user.branch?.name || 'Main Office'}</span>
                                    </div>
                                </div>

                                <div className="mt-2 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <div className="text-left">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Last Login</p>
                                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                            {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                                        </p>
                                    </div>
                                    <button className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors uppercase">
                                        Deactivate
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6 z-[100] animate-in">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-8 border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create New Agent</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">First Name</label>
                                    <input type="text" required className="modern-input" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Name</label>
                                    <input type="text" required className="modern-input" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                                <input type="email" required className="modern-input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                                <input type="password" required minLength={8} className="modern-input" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Access Role</label>
                                <select className="modern-input" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                                    <option value="salesperson">Salesperson</option>
                                    <option value="manager">Manager</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>

                            <button type="submit" disabled={submitting} className="w-full modern-button bg-blue-600 text-white font-bold h-12 shadow-sm disabled:opacity-50">
                                {submitting ? 'Creating...' : 'Create Agent Account'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
