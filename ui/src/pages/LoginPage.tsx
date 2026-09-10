import { useState, useEffect } from 'react';
import { Mail, ArrowRight, Loader2, Shield, Eye, EyeOff, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function isNativeApp() {
  try {
    // @ts-ignore
    if (window.Capacitor?.isNativePlatform?.()) return true;
    // @ts-ignore
    if (window.electron || navigator.userAgent.includes('Electron')) return true;
  } catch {}
  return false;
}

export default function LoginPage() {
  const isNative = isNativeApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === 'salesperson') navigate('/sales-dashboard', { replace: true });
      else navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Wrong email or password. Try again.');
    } finally { setLoading(false); }
  };

  if (isNative) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-[360px]">
            <div className="text-center mb-8">
              <img src="/logo.svg" alt="Nulia" className="w-14 h-14 rounded-2xl object-contain mx-auto bg-white p-1" />
              <h1 className="text-2xl font-black tracking-tighter mt-4">Welcome back</h1>
              <p className="text-sm text-zinc-400 mt-1">Sign in to continue</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 bg-zinc-900 border border-zinc-800 rounded-[24px] p-6">
              {error && <div className="p-3 rounded-xl bg-red-950 border border-red-900 text-sm text-red-300">{error}</div>}
              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Email or phone</label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input type="text" placeholder="admin@nulia.test" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full h-[48px] pl-11 pr-3 rounded-xl border border-zinc-700 focus:border-white focus:ring-4 focus:ring-white/10 outline-none text-sm font-medium bg-zinc-800 text-white placeholder:text-zinc-500 transition" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Password</label>
                <div className="relative mt-2">
                  <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full h-[48px] pl-11 pr-11 rounded-xl border border-zinc-700 focus:border-white focus:ring-4 focus:ring-white/10 outline-none text-sm font-medium bg-zinc-800 text-white placeholder:text-zinc-500 transition" />
                  <button type="button" onClick={()=>setShowPass(!showPass)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-zinc-500 hover:text-white">{showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full h-[48px] bg-white text-zinc-900 rounded-full font-black text-sm inline-flex items-center justify-center gap-2 hover:bg-zinc-100 disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign in <ArrowRight className="w-4 h-4" /></>}
              </button>
              <p className="text-center text-sm text-zinc-400 pt-2">No business? <Link to="/auth/signup" className="font-bold text-white underline">Create one</Link></p>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFBF8] flex flex-col">
      <header className="h-[64px] border-b border-zinc-200 bg-white/80 backdrop-blur flex items-center px-6 sticky top-0 z-10">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.svg" alt="Nulia" className="w-9 h-9 rounded-xl object-contain" />
          <span className="font-black tracking-[-0.03em] text-[16px]">NULIA</span>
          <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400 border-l pl-3 ml-1">sell smarter</span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <Link to="/auth/signup" className="hidden sm:inline text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-zinc-900 hover:text-white transition">Create business</Link>
          <Link to="/" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">← Home</Link>
        </div>
      </header>

      <div className="flex-1 grid lg:grid-cols-[1.05fr_0.95fr] max-w-[1280px] mx-auto w-full">
        <div className="flex items-center justify-center p-6 lg:p-12 order-1">
          <div className="w-full max-w-[440px]">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E8B86A] animate-pulse" /> Universal POS
              </div>
              <h1 className="text-[32px] font-black tracking-[-0.04em] leading-none mt-4">Welcome back</h1>
              <p className="text-sm text-zinc-500 mt-3 leading-relaxed">Sign in to Nulia — every business is isolated. Hotels, hardware, books, electrical &amp; general shops. Measure wire by metre, sell books by piece. All in one till.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-zinc-200 rounded-[24px] p-6 sm:p-7 shadow-[0_8px_40px_rgba(0,0,0,0.06)]">
              {error && <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-zinc-700">Email or phone number</label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input type="text" placeholder="admin@nulia.test / 07XXXXXXXX" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full h-[48px] pl-11 pr-3 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/10 outline-none text-sm font-medium bg-white text-zinc-900 placeholder:text-zinc-400 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white transition" />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1.5">Use the email or phone you registered with.</p>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-widest text-zinc-700">Password</label>
                  <Link to="/auth/forgot-password" className="text-[11px] font-bold text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900">Forgot?</Link>
                </div>
                <div className="relative mt-2">
                  <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full h-[48px] pl-11 pr-11 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/10 outline-none text-sm font-medium bg-white text-zinc-900 placeholder:text-zinc-400 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white transition" />
                  <button type="button" onClick={()=>setShowPass(!showPass)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-zinc-900">{showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1.5">Staff: use your PIN on the POS — here use email/phone + password.</p>
              </div>

              <button type="submit" disabled={loading} className="w-full h-[48px] bg-[#0F0F0F] text-white rounded-full font-bold text-sm inline-flex items-center justify-center gap-2 hover:bg-black disabled:opacity-50 shadow-lg shadow-black/10">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign in <ArrowRight className="w-4 h-4" /></>}
              </button>

              <div className="text-center text-sm pt-1">
                <span className="text-zinc-500">No business yet? </span><Link to="/auth/signup" className="font-bold underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900">Create your business — free 14 days</Link>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-zinc-400 justify-center pt-2 border-t border-zinc-100 mt-2">
                <Shield className="w-3.5 h-3.5" /> Encrypted • Isolated per business • Offline ready
              </div>
            </form>

            <p className="text-[11px] text-zinc-400 mt-5 text-center">By signing in you agree to Nulia processing isolated branch data. Need help? <Link to="/support" className="underline">Support</Link></p>
          </div>
        </div>

        <div className="hidden lg:flex bg-[#0F0F0F] text-white p-10 flex-col justify-between relative overflow-hidden order-2 rounded-tl-[32px] rounded-bl-[32px] my-6 mr-6">
          <div className="absolute inset-0 opacity-[0.06]" style={{backgroundImage:'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize:'24px 24px'}} />
          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">For every shop type</p>
            <h2 className="text-[32px] font-black tracking-[-0.04em] mt-3 leading-[0.95]">Hotel. Bookshop.<br />Hardware. Duka.<br /><span className="text-[#E8B86A]">One Nulia.</span></h2>
            <p className="text-sm text-zinc-400 mt-4 leading-relaxed max-w-[42ch]">Wires cut to 0.1m, cement by bag, novels by piece — measurable or discrete, Nulia handles purchase units, base units &amp; conversion.</p>
            <ul className="mt-7 space-y-3 text-sm">
              <li className="flex gap-3 items-start"><span className="w-6 h-6 rounded-full bg-white/10 grid place-items-center shrink-0 mt-0.5"><Check className="w-3.5 h-3.5" /></span><span><strong className="text-white">Cut-to-length:</strong> sell 2.35 m of 2.5mm cable from a 100 m roll</span></li>
              <li className="flex gap-3 items-start"><span className="w-6 h-6 rounded-full bg-white/10 grid place-items-center shrink-0 mt-0.5"><Check className="w-3.5 h-3.5" /></span><span><strong className="text-white">Hotels &amp; books:</strong> rooms per night, books by ISBN — same till</span></li>
              <li className="flex gap-3 items-start"><span className="w-6 h-6 rounded-full bg-white/10 grid place-items-center shrink-0 mt-0.5"><Check className="w-3.5 h-3.5" /></span><span><strong className="text-white">Works offline:</strong> sales queue &amp; sync when back</span></li>
              <li className="flex gap-3 items-start"><span className="w-6 h-6 rounded-full bg-white/10 grid place-items-center shrink-0 mt-0.5"><Check className="w-3.5 h-3.5" /></span><span><strong className="text-white">Jumia + Uber Direct:</strong> per-branch connectors</span></li>
            </ul>
          </div>
          <div className="relative bg-white/[0.07] rounded-[20px] p-5 border border-white/10 backdrop-blur">
            <div className="flex gap-3">
              <img src="/logo.svg" alt="Nulia" className="w-10 h-10 rounded-xl object-contain bg-white p-1" />
              <div>
                <p className="text-sm leading-relaxed">“We sell cable by metre and switches by piece — Nulia never mixes them. And M-Pesa or JumiaPay at checkout, same flow.”</p>
                <p className="text-xs text-zinc-400 mt-2">— James, electrical shop, Industrial Area</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4 text-[10px] font-bold uppercase tracking-widest">
              <span className="px-2.5 py-1 rounded-full bg-white text-black">Measurable</span>
              <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15">Discrete</span>
              <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15">Offline-first</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
