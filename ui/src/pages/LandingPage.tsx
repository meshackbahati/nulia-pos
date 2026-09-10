import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Check, Phone, BarChart3, CreditCard, Package, Users, Receipt, WifiOff, ShoppingBag, HandCoins } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fdfbf7] text-zinc-900">
      <header className="sticky top-0 z-50 bg-[#fdfbf7]/90 backdrop-blur border-b border-zinc-200">
        <div className="max-w-[1280px] mx-auto px-6 h-[64px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Nulia" className="w-9 h-9 rounded-xl object-contain" />
            <span className="font-black tracking-[-0.03em] text-[17px]">NULIA</span>
            <span className="hidden md:inline text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 border-l pl-3 ml-1">sell smarter</span>
          </div>
          <nav className="flex items-center gap-3">
            <div id="google_translate_element" className="hidden md:block text-xs"></div>
            <Link to="/auth/login" className="hidden md:inline px-4 py-2 text-sm font-medium hover:bg-zinc-100 rounded-full">Staff login</Link>
            <Link to="/auth/signup" className="bg-zinc-900 text-white px-5 py-2.5 rounded-full text-sm font-bold inline-flex items-center gap-2">Start free trial <ArrowRight className="w-4 h-4" /></Link>
          </nav>
        </div>
      </header>

      <section className="max-w-[1280px] mx-auto px-6 pt-12 pb-10 lg:pt-16 lg:pb-16 grid lg:grid-cols-2 gap-10 items-center min-h-[520px]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Built for duka, kiosk, mini-mart and cross-border trade</p>
          <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-tighter leading-none">Money sorted.<br />Books sorted.</h1>
          <p className="mt-4 text-base text-zinc-600 leading-relaxed max-w-[52ch]">Nulia is the everyday POS for Kenyan retail. Works offline, understands KES, USD and UGX in one sale, and keeps every business isolated. No leaks, no confusion.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/auth/signup" className="bg-zinc-900 text-white px-6 py-3 rounded-full font-bold text-sm inline-flex items-center gap-2">Start 14-day free trial <ArrowRight className="w-4 h-4" /></Link>
            <Link to="/auth/login" className="px-6 py-3 rounded-full border border-zinc-300 font-semibold text-sm bg-white">Sign in</Link>
          </div>
          <div className="mt-5 flex flex-wrap gap-4 text-xs text-zinc-600">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600" /> No card upfront</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600" /> Cancel anytime</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Isolated per business</span>
          </div>
          <div className="mt-6 flex items-center gap-3 text-xs text-zinc-500 border-t pt-4">
            <div className="flex -space-x-2">
              <img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=80&h=80&fit=crop" alt="Kenyan shop owner" className="w-7 h-7 rounded-full border-2 border-white object-cover" />
              <img src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=80&h=80&fit=crop" alt="Kenyan market" className="w-7 h-7 rounded-full border-2 border-white object-cover" />
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop" alt="Kenyan business" className="w-7 h-7 rounded-full border-2 border-white object-cover" />
            </div>
            <span><strong className="text-zinc-900">200+ businesses</strong> in Nairobi, Mombasa, Kisumu - daily users</span>
          </div>
        </div>
        <div className="relative">
          <img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=900&q=80&auto=format&fit=crop" alt="Kenyan retail shop interior with POS" className="w-full aspect-[4/3] object-cover rounded-[24px] border border-zinc-200 shadow-sm" />
          <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl border border-zinc-200 shadow-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center"><Receipt className="w-5 h-5 text-emerald-700" /></div>
            <div>
              <p className="text-xs font-bold">Receipt in 7s</p>
              <p className="text-xs text-zinc-500">Thermal, instant</p>
            </div>
            <span className="ml-4 text-xs font-black bg-zinc-900 text-white px-2 py-1 rounded-full">KES</span>
          </div>
        </div>
      </section>

      <section className="border-y bg-white">
        <div className="max-w-[1280px] mx-auto px-6 py-4 flex flex-wrap items-center gap-6 text-xs">
          <span className="font-bold uppercase tracking-widest text-zinc-500">Trusted by</span>
          <span className="font-bold">Shops in Gikomba</span><span className="text-zinc-400">|</span><span className="font-bold">Dukas in Eastlands</span><span className="text-zinc-400">|</span><span className="font-bold">Kiosks in Kisumu</span><span className="text-zinc-500">and 200+ neighbourhood businesses</span>
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-6 py-14">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tighter">Every business has its own books. <span className="text-zinc-500">No mixing.</span></h2>
        <p className="text-sm text-zinc-600 mt-2 max-w-2xl">Nulia gives each business its own inventory, customers, and reports. Owners see everything for their businesses. Staff see only what they are allowed. Perfect for Kenyan SMEs with one or many shops.</p>
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white border border-zinc-200 rounded-[20px] p-6 flex gap-6 items-center">
            <img src="https://images.unsplash.com/photo-1556740738-b6a63e27c189?w=400&q=80&auto=format&fit=crop" alt="M-Pesa payment in Kenyan shop" className="w-28 h-28 rounded-xl object-cover border hidden sm:block" />
            <div>
              <h3 className="font-bold flex items-center gap-2"><Phone className="w-4 h-4 text-emerald-700" /> M-Pesa that never blocks a sale</h3>
              <p className="text-sm text-zinc-600 mt-1 leading-relaxed">Each business has its own till. If you have not set up Daraja, Nulia collects through its platform wallet and settles to you. No customer is ever stuck at the counter. Add your own Daraja when ready.</p>
              <p className="text-xs mt-3 px-2 py-1 bg-amber-50 border border-amber-200 rounded-full inline-flex">Fallback wallet settled in your dashboard</p>
            </div>
          </div>
          <div className="bg-zinc-900 text-white rounded-[20px] p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-bold flex items-center gap-2"><CreditCard className="w-4 h-4" /> Card reader, tap and done</h3>
              <p className="text-sm text-zinc-300 mt-1">Works with debit and credit card readers on Web and Desktop. Tap, pay, print receipt. Faster checkout, no extra steps.</p>
            </div>
            <img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80&auto=format&fit=crop" alt="Card reader in use at Kenyan retail counter" className="mt-4 w-full h-28 object-cover rounded-xl border border-white/10" />
          </div>
          <div className="bg-white border border-zinc-200 rounded-[20px] p-6">
            <h3 className="font-bold flex items-center gap-2"><Users className="w-4 h-4" /> Every customer, not just walk-ins</h3>
            <p className="text-sm text-zinc-600 mt-1">Save walk-in, credit and layaway customers. Pick by name or phone, put on credit, track debt, and handle returns and layaway payments.</p>
            <div className="mt-3 flex gap-2 text-xs"><span className="px-2 py-1 bg-zinc-100 rounded-full">Walk-in</span><span className="px-2 py-1 bg-zinc-100 rounded-full">Credit</span><span className="px-2 py-1 bg-zinc-100 rounded-full">Layaway</span></div>
          </div>
          <div className="bg-white border border-zinc-200 rounded-[20px] p-6 flex gap-4 items-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center"><WifiOff className="w-6 h-6" /></div>
            <div>
              <h3 className="font-bold">Works without internet</h3>
              <p className="text-sm text-zinc-600">Your products and sales stay on the device and sync when internet returns. Nothing is lost, even in low connectivity.</p>
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-[20px] p-6">
            <h3 className="font-bold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-emerald-700" /> True ledger for owners</h3>
            <p className="text-sm text-zinc-700 mt-1">Owners see uneditable sales history, staff performance, branch comparison and PDF reports. Decisions based on real numbers.</p>
          </div>
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-6 py-10 grid md:grid-cols-3 gap-6">
        <div className="bg-white border rounded-2xl p-6"><p className="text-xs font-black uppercase tracking-widest text-zinc-500">1. Open</p><h3 className="font-bold mt-1">Create business in 30 seconds</h3><p className="text-sm text-zinc-600 mt-1">Business name, phone and admin account. Need another business? Add it as a new business. Each keeps its own stock.</p></div>
        <div className="bg-white border rounded-2xl p-6"><p className="text-xs font-black uppercase tracking-widest text-zinc-500">2. Sell</p><h3 className="font-bold mt-1">Scan and sell</h3><p className="text-sm text-zinc-600 mt-1">Scan barcode or type product, set price, and charge. Accept KES, UGX and USD together. Card reader and M-Pesa ready.</p></div>
        <div className="bg-white border rounded-2xl p-6"><p className="text-xs font-black uppercase tracking-widest text-zinc-500">3. Track</p><h3 className="font-bold mt-1">See what matters</h3><p className="text-sm text-zinc-600 mt-1">Stock levels, credit customers, layaway, and profit reports per business. Clear and separate.</p></div>
      </section>

      <section className="max-w-[1280px] mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold tracking-tighter">Pricing from Kenya's cheapest POS</h2>
        <p className="text-sm text-zinc-600 mt-2 max-w-2xl">We researched Kenyan POS pricing. Most cheap options start from KES 500. Nulia matches that and grows with you. No hidden fees. Subscription invoices are sent 7 days before your billing date and you have 7 days grace to pay.</p>
        <div className="mt-6 grid md:grid-cols-3 gap-6">
          <div className="border rounded-2xl p-6 bg-white">
            <h3 className="font-bold">Single</h3><p className="text-3xl font-black mt-2">KES 500<span className="text-sm font-normal text-zinc-500"> per month for 1 business</span></p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-600" /> 1 business with stock, sales and receipts</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-600" /> M-Pesa fallback plus cash plus card reader</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-600" /> Walk-in, credit and layaway customers</li>
            </ul>
            <Link to="/auth/signup" className="mt-6 block text-center bg-zinc-900 text-white py-3 rounded-full font-bold text-sm">Start free</Link>
          </div>
          <div className="border rounded-2xl p-6 bg-white">
            <h3 className="font-bold">Three</h3><p className="text-3xl font-black mt-2">KES 800<span className="text-sm font-normal text-zinc-500"> per month for 3 businesses</span></p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-600" /> Up to 3 businesses, each with isolated stock</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-600" /> Staff accounts with PIN and roles</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-600" /> Reports per business</li>
            </ul>
            <Link to="/auth/signup" className="mt-6 block text-center bg-white border border-zinc-900 text-zinc-900 py-3 rounded-full font-bold text-sm">Choose three</Link>
          </div>
          <div className="border-2 border-zinc-900 rounded-2xl p-6 bg-zinc-900 text-white">
            <h3 className="font-bold">Five</h3><p className="text-3xl font-black mt-2">KES 1,500<span className="text-sm font-normal text-zinc-400"> per month for 5 businesses</span></p>
            <ul className="mt-4 space-y-2 text-sm text-zinc-300">
              <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-400" /> Up to 5 businesses, fully isolated</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-400" /> Priority support</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-400" /> Automatic subscription invoices 7 days before billing with 7 days grace</li>
            </ul>
            <Link to="/contact" className="mt-6 block text-center bg-white text-zinc-900 py-3 rounded-full font-bold text-sm">More than 5? Contact us</Link>
          </div>
        </div>
        <p className="text-xs text-zinc-500 mt-4">Need more than 5 businesses? Price is planned with you. Contact us. All subscriptions include 7 days grace after due date.</p>
      </section>

      <section className="max-w-[1280px] mx-auto px-6 py-10 grid lg:grid-cols-2 gap-8 items-center border-t">
        <div>
          <h2 className="text-2xl font-bold tracking-tighter">Built for the counter. Fast as your hand.</h2>
          <p className="text-sm text-zinc-600 mt-2">Nulia is not an AI hype. It is a reliable POS for real shops. Owners get full control. Staff get simple tools. Customers get quick service whether they pay cash, card or M-Pesa, and whether they are walk-ins or credit customers.</p>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-3"><HandCoins className="w-5 h-5 text-zinc-700" /> <span><strong>Card reader ready:</strong> Works with debit and credit readers on Web and Desktop. Tap, pay and print instantly.</span></li>
            <li className="flex gap-3"><ShoppingBag className="w-5 h-5" /> <span><strong>All customers:</strong> Walk-in for quick sales, credit and layaway for trusted customers. Debt tracked, returns and waste handled.</span></li>
            <li className="flex gap-3"><Package className="w-5 h-5" /> <span><strong>Each business separate:</strong> Stock, prices and customers never mix between businesses.</span></li>
          </ul>
        </div>
        <img src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80&auto=format&fit=crop" alt="Kenyan SME shop interior with shelves" className="w-full h-80 object-cover rounded-2xl border" />
      </section>

      <section className="max-w-[1280px] mx-auto px-6 py-10 border-t">
        <div className="bg-zinc-900 text-white rounded-[24px] p-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-xl font-black tracking-tighter">Download Nulia</h3>
              <p className="text-sm text-zinc-400 mt-1">Pick your system. One ledger everywhere.</p>
            </div>
            <a href="https://github.com/meshackbahati/nulia-pos/releases/tag/v1.12.0" target="_blank" rel="noreferrer" className="text-xs font-bold underline decoration-zinc-600 underline-offset-4 hover:decoration-white">All releases →</a>
          </div>
          <div className="mt-6 grid md:grid-cols-5 gap-3">
            <a href="https://github.com/meshackbahati/nulia-pos/releases/download/v1.12.0/Nulia.Setup.1.12.0.exe" className="bg-white text-zinc-900 rounded-2xl p-4 flex flex-col gap-3 hover:bg-zinc-100 transition">
              <span className="text-xs font-black uppercase tracking-widest">Windows</span>
              <span className="text-sm font-bold">Setup .exe</span>
              <span className="text-xs text-zinc-500">131 MB • nsis x64</span>
            </a>
            <a href="https://github.com/meshackbahati/nulia-pos/releases/download/v1.12.0/nulia_1.12.0_amd64.deb" className="bg-white/10 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 hover:bg-white/15 transition">
              <span className="text-xs font-black uppercase tracking-widest text-zinc-300">Debian / Ubuntu</span>
              <span className="text-sm font-bold">.deb</span>
              <span className="text-xs text-zinc-400">117 MB • amd64</span>
            </a>
            <a href="https://github.com/meshackbahati/nulia-pos/releases/download/v1.12.0/nulia-1.12.0-x64.pkg.tar.zst" className="bg-white/10 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 hover:bg-white/15 transition">
              <span className="text-xs font-black uppercase tracking-widest text-zinc-300">Arch</span>
              <span className="text-sm font-bold">.pkg.tar.zst</span>
              <span className="text-xs text-zinc-400">104 MB • pacman</span>
            </a>
            <a href="https://github.com/meshackbahati/nulia-pos/releases/download/v1.12.0/nulia-1.12.0-x86_64.AppImage" className="bg-white/10 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 hover:bg-white/15 transition">
              <span className="text-xs font-black uppercase tracking-widest text-zinc-300">AppImage</span>
              <span className="text-sm font-bold">AppImage</span>
              <span className="text-xs text-zinc-400">161 MB • x86_64</span>
            </a>
            <a href="https://github.com/meshackbahati/nulia-pos/releases/download/v1.12.0/Nulia-v1.12.0-release.apk" className="bg-[#E8B86A] text-zinc-900 rounded-2xl p-4 flex flex-col gap-3 hover:bg-[#D9A85F] transition">
              <span className="text-xs font-black uppercase tracking-widest">Android</span>
              <span className="text-sm font-bold">APK</span>
              <span className="text-xs text-zinc-700">36.7 MB • signed</span>
            </a>
          </div>
          <p className="text-xs text-zinc-500 mt-4">SHA256 shown on Releases. Android needs JDK21 to build, signed with nulia keystore.</p>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col md:flex-row gap-4 justify-between text-xs text-zinc-600">
          <span>© Nulia - Built for Kenyan retail. Use the language switch at the bottom right for Kiswahili and English.</span>
          <span className="flex gap-4"><Link to="/contact" className="underline">Contact us</Link><Link to="/support" className="underline">Support</Link><Link to="/auth/login" className="underline">Sign in</Link></span>
        </div>
      </footer>
    </div>
  );
}
