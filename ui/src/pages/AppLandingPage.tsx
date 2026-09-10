import { Link } from 'react-router-dom';

export default function AppLandingPage() {
  const isNative = (() => {
    try {
      // Capacitor native
      // @ts-ignore
      if (window.Capacitor?.isNativePlatform?.()) return true;
      // Electron
      // @ts-ignore
      if (window.electron || navigator.userAgent.includes('Electron')) return true;
    } catch {}
    return false;
  })();

  // Totally different from web LandingPage - app focused, no marketing, just auth
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <img src="/logo.svg" alt="Nulia" className="w-20 h-20 rounded-2xl object-contain shadow-2xl" />
        <h1 className="mt-6 text-3xl font-black tracking-tighter">NULIA</h1>
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">sell smarter</p>
        <p className="mt-6 text-sm text-zinc-400 text-center max-w-[28ch] leading-relaxed">
          {isNative ? 'Your tills, offline ready. Sign in to continue.' : 'Sign in to your business.'}
        </p>

        <div className="mt-8 w-full max-w-[320px] space-y-3">
          <Link to="/auth/login" className="block w-full bg-white text-zinc-900 py-4 rounded-2xl font-black text-sm text-center">
            Sign in
          </Link>
          <Link to="/auth/signup" className="block w-full bg-zinc-800 text-white py-4 rounded-2xl font-black text-sm text-center border border-zinc-700">
            Create business
          </Link>
          <p className="text-center text-xs text-zinc-500 pt-2">New here? Create a business in 30 seconds. No card needed.</p>
        </div>

        <div className="mt-10 flex items-center gap-2 text-xs text-zinc-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Offline ready - sales queue when no internet
        </div>
      </div>

      <div className="px-6 py-6 border-t border-zinc-800">
        <p className="text-center text-xs text-zinc-500">
          By continuing you agree to our Terms. Need help? <Link to="/support" className="underline text-zinc-300">Support</Link>
        </p>
      </div>
    </div>
  );
}
