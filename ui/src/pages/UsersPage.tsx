import { useState, useEffect } from 'react';
import api from '../lib/api-client';
import { Mail, Users, Shield, UserPlus, Building, X, Award, Edit2, UserMinus, UserCheck, Key } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    branch?: { id: string; name: string };
    isActive: boolean;
    lastLoginAt?: string;
    creator?: {
        id: string;
        firstName: string;
        lastName: string;
        role: string;
    };
}

export default function UsersPage() {
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'salesperson',
        branchId: '',
    });
    const [branches, setBranches] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [includeInactive, setIncludeInactive] = useState(true);

    useEffect(() => {
        fetchUsers();
        fetchBranches();
    }, [includeInactive]);

    const fetchBranches = async () => {
        try {
            const response = await api.getBranches();
            setBranches(response.data.branches || []);
        } catch (error) {
            console.error('Error fetching branches:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await api.listUsers({ includeInactive: includeInactive ? 'true' : 'false' });
            setUsers(response.data.users || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setSubmitting(true);

        try {
            await api.updateUser(editingUser.id, formData);
            setShowEditModal(false);
            setEditingUser(null);
            setFormData({
                email: '',
                password: '',
                firstName: '',
                lastName: '',
                role: 'salesperson',
                branchId: '',
            });
            toast.success('Agent updated successfully');
            fetchUsers();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to update agent');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeactivate = async (user: User) => {
        const action = user.isActive ? 'deactivate' : 'reactivate';
        if (!confirm(`Are you sure you want to ${action} ${user.firstName}?`)) return;

        try {
            await api.updateUser(user.id, { isActive: !user.isActive });
            toast.success(`Agent ${action}d successfully`);
            fetchUsers();
        } catch (error: any) {
            toast.error(error.response?.data?.error || `Failed to ${action} agent`);
        }
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setFormData({
            email: user.email,
            password: '', // Keep empty unless changing
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            branchId: user.branch?.id || '',
        });
        setShowEditModal(true);
    };

    return (
        <div className="min-h-screen bg-background flex flex-col font-sans transition-colors duration-300">
            {/* Header */}
            <header className="bg-background border-b border-border px-6 py-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shadow-sm">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">
                                Agent <span className="text-primary">Management</span>
                            </h1>
                            <p className="text-xs text-muted-foreground font-medium">Control system access and permissions</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 mr-2">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">Show Inactive</label>
                            <button
                                onClick={() => {
                                    setIncludeInactive(!includeInactive);
                                    // Trigger fetch manually because the effect depends on mount
                                }}
                                className={`w-8 h-4 rounded-full transition-colors relative ${includeInactive ? 'bg-primary' : 'bg-muted'}`}
                            >
                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${includeInactive ? 'translate-x-4.5' : 'translate-x-0.5'}`}></div>
                            </button>
                        </div>
                        <ThemeToggle />
                        {currentUser?.role !== 'salesperson' && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 rounded-md transition-colors text-sm font-medium"
                            >
                                <UserPlus className="w-4 h-4" />
                                <span className="hidden md:inline uppercase text-xs font-bold">Add New Agent</span>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full px-6 py-8 animate-in fade-in duration-500">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-48 bg-card border border-border rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : users.length === 0 ? (
                    <div className="bg-card border border-dashed border-border p-16 text-center rounded-2xl">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-bold text-foreground">No agents found</h3>
                        <p className="text-muted-foreground text-sm mt-1">Get started by creating your first system user.</p>
                        {currentUser?.role !== 'salesperson' && (
                            <button onClick={() => setShowAddModal(true)} className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 rounded-md transition-colors text-sm font-medium">Create Agent</button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {users.map((user) => (
                            <div key={user.id} className="bg-card text-card-foreground p-6 flex flex-col gap-4 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold text-lg">
                                            {user.firstName[0]}{user.lastName[0]}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-foreground">
                                                {user.firstName} {user.lastName}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                                <span className="text-[10px] font-bold uppercase text-primary bg-primary/10 px-2 py-0.5 rounded">
                                                    {user.role.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button className="text-muted-foreground hover:text-primary transition-colors">
                                        <Shield className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Mail className="w-4 h-4 opacity-50" />
                                        <span>{user.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Building className="w-4 h-4 opacity-50" />
                                        <span>{user.branch?.name || 'Main Office'}</span>
                                    </div>
                                    {user.creator && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Award className="w-4 h-4 opacity-50 text-amber-500" />
                                            <span>Hired by: {user.creator.firstName} ({user.creator.role.replace('_', ' ')})</span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-2 pt-4 border-t border-border flex items-center justify-between">
                                    <div className="text-left">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Last Login</p>
                                        <p className="text-xs font-medium text-foreground">
                                            {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEditModal(user)}
                                            className="text-muted-foreground hover:text-primary transition-colors"
                                            title="Edit Agent"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeactivate(user)}
                                            className={`text-xs font-bold uppercase transition-colors ${user.isActive ? 'text-destructive hover:text-destructive/80' : 'text-emerald-500 hover:text-emerald-600'}`}
                                            title={user.isActive ? "Deactivate Agent" : "Reactivate Agent"}
                                        >
                                            {user.isActive ? <UserMinus className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-[100] animate-in fade-in duration-200">
                    <div className="bg-card text-card-foreground rounded-2xl shadow-xl max-w-md w-full p-8 border border-border">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-bold text-foreground">Create New Agent</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            setSubmitting(true);
                            try {
                                if (formData.role !== 'admin' && !formData.branchId) {
                                    toast.error('Please assign a branch to this agent');
                                    setSubmitting(false);
                                    return;
                                }
                                await api.createUser(formData);
                                setShowAddModal(false);
                                setFormData({ email: '', password: '', firstName: '', lastName: '', role: 'salesperson', branchId: '' });
                                toast.success('Agent created successfully');
                                fetchUsers();
                            } catch (error: any) {
                                toast.error(error.response?.data?.error || 'Failed to create agent');
                            } finally {
                                setSubmitting(false);
                            }
                        }} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">First Name</label>
                                    <input type="text" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Last Name</label>
                                    <input type="text" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Email Address</label>
                                <input type="email" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Password</label>
                                <input type="password" required minLength={8} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Access Role</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="salesperson">Salesperson</option>
                                    {['admin', 'manager'].includes(currentUser?.role || '') && (
                                        <option value="head_of_sales">Head of Sales</option>
                                    )}
                                    {currentUser?.role === 'admin' && (
                                        <option value="manager">Manager</option>
                                    )}
                                    {currentUser?.role === 'admin' && (
                                        <option value="admin">Administrator</option>
                                    )}
                                </select>
                            </div>

                            {formData.role !== 'admin' && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Assign Branch</label>
                                        {branches.length === 0 && (
                                            <button
                                                type="button"
                                                onClick={() => { setShowAddModal(false); navigate('/manager/branches'); }}
                                                className="text-[10px] text-primary hover:underline font-bold"
                                            >
                                                + Create Branch
                                            </button>
                                        )}
                                    </div>
                                    <select
                                        required
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        value={formData.branchId}
                                        onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                                    >
                                        <option value="">Select a branch</option>
                                        {branches.map((b) => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <button type="submit" disabled={submitting} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md transition-colors text-sm font-medium disabled:opacity-50">
                                {submitting ? 'Creating...' : 'Create Agent Account'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editingUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-[100] animate-in fade-in duration-200">
                    <div className="bg-card text-card-foreground rounded-2xl shadow-xl max-w-md w-full p-8 border border-border">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-bold text-foreground">Edit Agent</h2>
                            <button onClick={() => { setShowEditModal(false); setEditingUser(null); }} className="text-muted-foreground hover:text-foreground">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">First Name</label>
                                    <input type="text" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Last Name</label>
                                    <input type="text" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Email Address</label>
                                <input type="email" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Update Password</label>
                                    <span className="text-[10px] text-muted-foreground">(Leave blank to keep current)</span>
                                </div>
                                <div className="relative">
                                    <input type="password" minLength={8} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                                    <Key className="w-4 h-4 absolute right-3 top-3 opacity-20" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Access Role</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="salesperson">Salesperson</option>
                                    {['admin', 'manager'].includes(currentUser?.role || '') && (
                                        <option value="head_of_sales">Head of Sales</option>
                                    )}
                                    {currentUser?.role === 'admin' && (
                                        <option value="manager">Manager</option>
                                    )}
                                    {currentUser?.role === 'admin' && (
                                        <option value="admin">Administrator</option>
                                    )}
                                </select>
                            </div>

                            {formData.role !== 'admin' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Assign Branch</label>
                                    <select
                                        required
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        value={formData.branchId}
                                        onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                                    >
                                        <option value="">Select a branch</option>
                                        {branches.map((b) => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <button type="submit" disabled={submitting} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md transition-colors text-sm font-medium disabled:opacity-50">
                                {submitting ? 'Updating...' : 'Update Agent Details'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
