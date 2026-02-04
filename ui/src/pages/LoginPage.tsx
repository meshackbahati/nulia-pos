import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Loader2, Store, Shield } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // Store token
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                // Redirect to dashboard
                navigate('/dashboard');
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen gradient-bg flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md animate-in">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-primary/10 soft-ui-out rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-10 h-10 text-primary" />
                    </div>
                    <h1 className="text-4xl font-black text-gray-800 dark:text-gray-100 uppercase tracking-tighter mb-2">
                        Welcome <span className="text-primary">Back</span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Secure Terminal Login</p>
                </div>

                <div className="soft-ui-out rounded-[2.5rem] bg-white dark:bg-gray-900 border-none p-8 md:p-10">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 text-sm text-red-500 soft-ui-in bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20 flex items-center gap-3 animate-in">
                                <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                                Terminal ID / Email
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="email"
                                    placeholder="admin@bordershop.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="modern-input w-full pl-11 pr-4 py-4"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                                Access Password
                            </label>
                            <div className="relative group">
                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="modern-input w-full pl-11 pr-4 py-4"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full modern-button py-5 text-gray-100 flex items-center justify-center gap-3 font-black text-lg group bg-primary"
                            >
                                {loading ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        Sign In to Terminal
                                        <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="mt-8 flex items-center justify-center gap-6 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                    <div className="flex items-center gap-2">
                        <Store className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Multi-Branch</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Secure POS</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
