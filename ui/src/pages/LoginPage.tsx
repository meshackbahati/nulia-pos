import { useState } from 'react';
import { Mail, ArrowRight, Loader2, Store, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await login(email, password);
            // Redirection is handled by the login function in AuthContext
        } catch (err: any) {
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden font-body">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none opacity-40"></div>

            <div className="w-full max-w-md relative z-10 animate-in">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/30 border border-primary/20 p-2 transform hover:scale-105 transition-transform">
                        <img src="/logo.png" alt="RetailPro Logo" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                        RetailPro POS
                    </h1>
                    <p className="text-muted-foreground font-medium">Secure Terminal Access</p>
                </div>

                <div className="glass-card bg-card/80 backdrop-blur-xl border border-border p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-xl border border-destructive/20 flex items-center gap-3 animate-in">
                                <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse"></span>
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">
                                Email
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <input
                                    type="email"
                                    placeholder="user@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full h-12 bg-background/50 border border-input rounded-xl pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                                    Security Code
                                </label>
                                <Link to="/auth/forgot-password" title="Lost Account?" className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">
                                    Lost Account?
                                </Link>
                            </div>
                            <div className="relative group">
                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="glass-input w-full h-14 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-all placeholder:text-muted-foreground/30 font-bold"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    AUTHENTICATE
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-12 flex items-center justify-center gap-6 opacity-20 hover:opacity-100 transition-opacity duration-500">
                    <div className="flex items-center gap-2">
                        <Store className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">RetailPro Node v2.0</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
