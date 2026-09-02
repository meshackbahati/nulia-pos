import { Package, ShoppingCart, Users, Building, CreditCard, BarChart3, Truck, DollarSign, Warehouse, QrCode, RotateCcw, ReceiptText, Plug, Globe, ShieldCheck, HelpCircle, BookOpen, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const features = [
  { icon: ShoppingCart, color: 'emerald', title: 'POS Terminal', path: '/pos', what: 'Fast checkout: scan HID/barcode → bargain price → split pay (KES+UGX+USD) → instant thermal receipt. Offline queue auto-syncs.', how: 'Products must exist → add to cart → Authorize Sale → PaymentModal → choose method per branch config. Test with Branch: Nairobi (KES) + Kampala (UGX).' },
  { icon: Package, color: 'amber', title: 'Products', path: '/products', what: 'Catalog: discrete (pcs) vs measurable (kg/L), variants, barcodes, images, stock threshold.', how: 'Register Item → set measurementType, baseUnit, fractional. CSV Import needs hub selected. Low-stock badge when ≤ threshold.' },
  { icon: Truck, color: 'orange', title: 'Inventory Transfer', path: '/manager/inventory-transfer', what: 'Move stock between hubs atomically.', how: 'Pick From Hub → To Hub → select products/qty → Transfer. Now wired (was 404). Emits realtime to both hubs.' },
  { icon: Building, color: 'sky', title: 'Branches (Hubs)', path: '/manager/branches', what: 'Per-hub currency, tax, timezone + per-hub payments (M-Pesa shortcode, Paystack keys) — not global.', how: 'Initialize Hub → set Primary Asset (KES) + Secondary Node (UGX) + Rate → Branch Payments toggle → choose mpesa/paystack → paste keys → Save. Card shows M-Pesa ✓ badge. Global fallback in Settings → System Nucleus.' },
  { icon: CreditCard, color: 'emerald', title: 'Payments per Branch', path: '/manager/branches', what: 'Each branch owns its till. POS PaymentModal now filters disabled methods (grey) vs cash always.', how: 'Configure in Branches → Edit → Branch Payments → Enable → pick mpesa. POS will show M-Pesa ✓ and disable Paystack if not configured. Test: create 2 hubs with different shortcodes.' },
  { icon: Users, color: 'violet', title: 'People & Roles', path: '/users', what: 'admin > manager > head_of_sales > salesperson. Salesperson sees only Dashboard/POS/Products/Customers.', how: 'Create user → assign branch + role + permissions (canManageInventory). Head_of_sales needs explicit permission for inventory.' },
  { icon: ReceiptText, color: 'teal', title: 'Sales History', path: '/sales-history', what: 'All transactions, filter by receipt/phone/date, reprint, void (manager).', how: 'Search receiptId → View & Reprint (thermal). Void restores stock. Export CSV.' },
  { icon: BarChart3, color: 'violet', title: 'Analytics (Ledger)', path: '/analytics', what: 'Revenue trends, payment method pie, top products, branch/person leaderboards.', how: 'Switch period week/month/year, view overview/ledger/leaderboard. Branch comparison admin only. Weekly cron fixed paymentStatus.' },
  { icon: Building, color: 'rose', title: 'Customers & Layaways', path: '/customers', what: 'Credit, deposits, layaway installments, balance.', how: 'Create customer → Deposit → Create Layaway (deposit+installments) → Pay installment. Fixed layaways routing (was shadowed).' },
  { icon: RotateCcw, color: 'orange', title: 'Returns & Waste', path: '/returns', what: 'Post-sale returns (approve), spoilage/waste tracking.', how: 'Returns: pick sale → reason → approve (restocks). Waste: pick product → qty → reason → delete. Both partial now supported.' },
  { icon: DollarSign, color: 'teal', title: 'Cash & Expenses', path: '/cash', what: 'Cash registers, open/close sessions, transactions; petty cash with approval.', how: 'Cash: create register → Open Session → add transactions → Close (counts). Expenses: create → manager approve. TaxRates in Settings.' },
  { icon: Warehouse, color: 'sky', title: 'Warehouses & Serials', path: '/warehouses', what: 'Multi-zone storage + tracked serials + bundles/kits.', how: 'Warehouse → Zones → assign inventory. Serials: scan/lookup per item. Bundles: kit of products.' },
  { icon: QrCode, color: 'purple', title: 'Hardware', path: '/manager/settings', what: 'Thermal 58/80mm ESC/POS, BLE/Network/USB, HID scan, handheld mode.', how: 'Settings → Hardware → Configure printer (thermal name), test. POS auto-prompts if missing. Fixed 58mm clip (paperSizeChars).' },
  { icon: Plug, color: 'slate', title: 'Webhooks & Integrations', path: '/integrations', what: 'Push sale/low-stock to external URL, HMAC secret.', how: 'Integrations → Add provider → URL + events (sale.created, inventory.low_stock) → Test. Webhooks in Settings similar.' },
  { icon: Globe, color: 'violet', title: 'Suppliers & Purchase Orders', path: '/manager/purchase-orders', what: 'Order from suppliers, receive → auto restock.', how: 'Create Supplier → Create PO → Receive (increments inventory).' },
  { icon: ShieldCheck, color: 'slate', title: 'System Nucleus', path: '/manager/settings', what: 'Global company, currency base, daily rates, gateways fallback, tax, webhooks.', how: 'Set Base ISO + rates (e.g., 1 USD=130 KES). Per-branch Branch Payments override global.' },
];

const colorMap: Record<string, string> = {
  emerald: 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20',
  amber: 'bg-amber-500 text-white border-amber-600 shadow-amber-500/20',
  orange: 'bg-orange-500 text-white border-orange-600',
  sky: 'bg-sky-500 text-white border-sky-600',
  violet: 'bg-violet-500 text-white border-violet-600',
  rose: 'bg-rose-500 text-white border-rose-600',
  teal: 'bg-teal-500 text-white border-teal-600',
  slate: 'bg-slate-700 text-white border-slate-800',
  purple: 'bg-purple-500 text-white border-purple-600',
};

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        <div className="clay-card p-6 sm:p-8 border-violet-200/50 dark:border-violet-800/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-500 text-white flex items-center justify-center shadow-lg shadow-violet-500/20 border-2 border-violet-600 shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Feature <span className="text-violet-600">Guide</span></h1>
              <p className="text-sm text-muted-foreground mt-1">What every feature does, how it’s wired, and how to use it — per-branch payments, offline POS, clay design.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase">POS ✓ Offline</span>
                <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase">Clay Warm</span>
                <span className="px-3 py-1 rounded-full bg-sky-500 text-white text-[10px] font-black uppercase">Per-Branch Till</span>
                <span className="px-3 py-1 rounded-full bg-violet-500 text-white text-[10px] font-black uppercase">1.12 Clay</span>
              </div>
            </div>
          </div>
          <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-800/30 rounded-xl flex gap-3">
            <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <p className="font-black uppercase tracking-widest text-amber-800 dark:text-amber-200">Start Here — 60s Setup</p>
              <p className="text-muted-foreground mt-1">1. <b>Branches</b> → Initialize Hub (set currency + M-Pesa for that hub) → 2. <b>Products</b> → Register Item → 3. <b>POS</b> → Scan → Bargain (try UGX) → Authorize Sale → 4. <b>Sales History</b> → Reprint. All split-currency via daily rates in <b>Settings → Daily Exchange Rates</b>.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {features.map(f => (
            <div key={f.title} className="clay-card p-5 sm:p-6 space-y-4 hover:translate-y-[-2px] transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 shadow-md ${colorMap[f.color]}`}>
                    <f.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black uppercase tracking-tight text-sm">{f.title}</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{f.path}</p>
                  </div>
                </div>
                <Link to={f.path} className="px-3 py-1.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-full text-[10px] font-black uppercase hover:border-violet-400 hover:text-violet-600 flex items-center gap-1 shrink-0">Open <ArrowRight className="w-3 h-3" /></Link>
              </div>
              <div className="space-y-3 text-xs leading-relaxed">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">What it does</p>
                  <p className="mt-1 text-foreground">{f.what}</p>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-200 dark:border-slate-700">
                  <p className="font-black uppercase text-[10px] tracking-widest text-violet-600">How to use</p>
                  <p className="mt-1 text-muted-foreground">{f.how}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="clay-card p-6 border-slate-200 dark:border-slate-700">
          <h3 className="font-black uppercase tracking-tight flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-500" /> System Health & Gaps Fixed</h3>
          <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <li className="flex gap-2"><span className="text-emerald-500">✓</span> Bargain UGX switch (loop fixed)</li>
            <li className="flex gap-2"><span className="text-emerald-500">✓</span> Receipt light paper #fefcf7</li>
            <li className="flex gap-2"><span className="text-emerald-500">✓</span> Linux pacman 107M valid</li>
            <li className="flex gap-2"><span className="text-emerald-500">✓</span> Inventory transfer atomic</li>
            <li className="flex gap-2"><span className="text-emerald-500">✓</span> Customers layaways routing</li>
            <li className="flex gap-2"><span className="text-emerald-500">✓</span> Weekly 0 sales → paymentStatus</li>
            <li className="flex gap-2"><span className="text-emerald-500">✓</span> Express deleted → Next.js single</li>
            <li className="flex gap-2"><span className="text-emerald-500">✓</span> Clay warm + feature palette</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
