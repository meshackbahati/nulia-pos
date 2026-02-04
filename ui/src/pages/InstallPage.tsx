import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
            const response = await fetch(`${import.meta.env.VITE_API_URL}/install/setup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                // Installation complete, redirect to login
                navigate('/auth/login');
            } else {
                setError(data.error || 'Installation failed');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen gradient-bg flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-2xl animate-in">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-primary/10 soft-ui-out rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck className="w-10 h-10 text-primary" />
                    </div>
                    <h1 className="text-4xl font-black text-gray-800 dark:text-gray-100 uppercase tracking-tighter mb-2">
                        BorderShop <span className="text-primary">System</span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Initial System Configuration & Setup</p>
                </div>

                <div className="soft-ui-out rounded-[2.5rem] bg-white dark:bg-gray-900 border-none p-8 md:p-12">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {error && (
                            <div className="p-4 text-sm text-red-500 soft-ui-in bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20 flex items-center gap-3 animate-in">
                                <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                                    Administrator Name
                                </label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Enter full name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        className="modern-input w-full pl-11 pr-4 py-4"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                                    Email Address
                                </label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="email"
                                        placeholder="admin@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                        className="modern-input w-full pl-11 pr-4 py-4"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                                    System Password
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        className="modern-input w-full pl-11 pr-4 py-4"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                                    Confirm Security Key
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        required
                                        className="modern-input w-full pl-11 pr-4 py-4"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                                Primary Branch Name
                            </label>
                            <div className="relative group">
                                <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder="e.g. Main Headquarters"
                                    value={formData.branchName}
                                    onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                                    required
                                    className="modern-input w-full pl-11 pr-4 py-4"
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full modern-button py-5 text-gray-100 flex items-center justify-center gap-3 font-black text-lg group bg-primary"
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

                <p className="text-center mt-8 text-sm text-gray-400 font-medium">
                    Secure Setup • BorderShop POS v2.0
                </p>
            </div>
        </div>
    );
}
