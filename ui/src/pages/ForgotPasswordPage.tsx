import { useState } from 'react';
import { Mail, ArrowRight, Loader2, ChevronLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api-client';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.post('/auth/forgot-password', { email });
            setSent(true);
            toast.success('Recovery link sent!');
        } catch (err: any) {
            toast.error('Failed to process request');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden font-body">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none opacity-40"></div>

            <div className="w-full max-w-md relative z-10 animate-in">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-primary/20 p-2">
                        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-3xl font-black text-foreground mb-2">RECOVERY</h1>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Account Access Restoration</p>
                </div>

                <div className="glass-card p-8">
                    {!sent ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <p className="text-xs font-bold text-muted-foreground leading-relaxed text-center px-4">
                                Enter your registered email address. We will send a secure authentication link to reset your access.
                            </p>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                                    Email Address
                                </label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="email"
                                        placeholder="node@retailpro.io"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="glass-input w-full h-14 pl-11 pr-4 focus:ring-primary/50 text-foreground font-bold"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>SEND RESET LINK <ArrowRight className="w-5 h-5" /></>}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center space-y-6 py-4">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                                <Mail className="w-8 h-8" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-black text-foreground uppercase tracking-wider">Transmission Success</h3>
                                <p className="text-xs font-bold text-muted-foreground leading-relaxed">
                                    Check your inbox. If the email exists in our records, a link will arrive shortly.
                                </p>
                            </div>
                            <button onClick={() => navigate('/auth/login')} className="text-[10px] font-black text-primary uppercase tracking-[0.2em] hover:underline">
                                Return to Login
                            </button>
                        </div>
                    )}
                </div>

                {!sent && (
                    <Link to="/auth/login" className="mt-8 flex items-center justify-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors">
                        <ChevronLeft className="w-4 h-4" /> Back to Terminal
                    </Link>
                )}
            </div>
        </div>
    );
}
