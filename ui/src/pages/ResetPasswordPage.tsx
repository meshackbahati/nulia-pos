import { useState, useEffect } from 'react';
import { ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api-client';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    useEffect(() => {
        if (!token) {
            toast.error('Invalid reset link');
            navigate('/auth/login');
        }
    }, [token, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/reset-password', { token, newPassword: password });
            setSuccess(true);
            toast.success('Password reset success!');
            setTimeout(() => navigate('/auth/login'), 3000);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden font-body">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none opacity-40"></div>

            <div className="w-full max-w-md relative z-10 animate-in">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-foreground mb-2 uppercase tracking-tighter">New Credentials</h1>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Access Point Reconfiguration</p>
                </div>

                <div className="glass-card p-8">
                    {!success ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">New Security Code</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="glass-input w-full h-14 px-4 focus:ring-primary/50 text-foreground font-bold"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Confirm Code</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="glass-input w-full h-14 px-4 focus:ring-primary/50 text-foreground font-bold"
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-14 bg-foreground text-background rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>FINALIZE RESET <ArrowRight className="w-5 h-5" /></>}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center space-y-6 py-4">
                            <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-black text-foreground uppercase tracking-wider">Update Successful</h3>
                                <p className="text-xs font-bold text-muted-foreground">Your identity has been verified and updated. Redirecting to terminal...</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
