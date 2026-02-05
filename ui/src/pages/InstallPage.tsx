import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api-client';
import { ShieldCheck, User, Mail, Lock, Store, ArrowRight, Loader2 } from 'lucide-react';

export default function InstallPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        branchName: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const nameParts = formData.name.trim().split(/\s+/);
            const firstName = nameParts[0] || 'Admin';
            const lastName = nameParts.slice(1).join(' ') || 'User';

            const setupData = {
                branch: {
                    name: formData.branchName,
                },
                admin: {
                    firstName,
                    lastName,
                    email: formData.email,
                    password: formData.password,
                }
            };

            const response = await api.setup(setupData);

            if (response.data.success) {
                // Installation complete, redirect to login
                navigate('/auth/login');
            } else {
                setError(response.data.error || 'Installation failed');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-2xl animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20 ring-1 ring-inset ring-primary/20">
                        <ShieldCheck className="w-10 h-10 text-primary" />
                    </div>
                    <h1 className="text-4xl font-black text-foreground uppercase tracking-tighter mb-2">
                        BorderShop <span className="text-primary">System</span>
                    </h1>
                    <p className="text-muted-foreground font-medium">Initial System Configuration & Setup</p>
                </div>

                <div className="bg-card rounded-[2.5rem] border border-border shadow-xl p-8 md:p-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                        {error && (
                            <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-2xl border border-destructive/20 flex items-center gap-3 animate-in shake">
                                <span className="w-2 h-2 rounded-full bg-destructive shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">
                                    Administrator Name
                                </label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Enter full name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        className="w-full h-12 rounded-xl border border-input bg-background pl-11 pr-4 text-sm ring-offset-background placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">
                                    Email Address
                                </label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="email"
                                        placeholder="admin@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                        className="w-full h-12 rounded-xl border border-input bg-background pl-11 pr-4 text-sm ring-offset-background placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">
                                    System Password
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        className="w-full h-12 rounded-xl border border-input bg-background pl-11 pr-4 text-sm ring-offset-background placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">
                                    Confirm Security Key
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        required
                                        className="w-full h-12 rounded-xl border border-input bg-background pl-11 pr-4 text-sm ring-offset-background placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">
                                Primary Branch Name
                            </label>
                            <div className="relative group">
                                <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder="e.g. Main Headquarters"
                                    value={formData.branchName}
                                    onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                                    required
                                    className="w-full h-12 rounded-xl border border-input bg-background pl-11 pr-4 text-sm ring-offset-background placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all"
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none group"
                            >
                                {loading ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        Complete Installation
                                        <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                <p className="text-center mt-8 text-sm text-muted-foreground font-medium">
                    Secure Setup • BorderShop POS v2.0
                </p>
            </div>
        </div>
    );
}
