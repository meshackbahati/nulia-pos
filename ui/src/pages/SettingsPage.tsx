import { useState, useEffect } from 'react';
import { Save, Settings as SettingsIcon, Shield, CreditCard, Smartphone, Trash2, AlertTriangle, Plus, DollarSign, Plug, RefreshCw } from 'lucide-react';
import api from '../lib/api-client';
import toast from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';
import { useCurrency } from '../hooks/useCurrency';
import { useAuth } from '../contexts/AuthContext';
import { useHardware } from '../contexts/HardwareContext';
import PrinterSetupModal from '../components/PrinterSetupModal';
import CustomModal from '../components/CustomModal';
import { Printer as PrinterIcon } from 'lucide-react';

export default function SettingsPage() {
    const { user } = useAuth();
    const { baseCurrency: defaultCurrency } = useCurrency();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [confirmClearSales, setConfirmClearSales] = useState(false);
    const [confirmClearProducts, setConfirmClearProducts] = useState(false);
    const [settings, setSettings] = useState({
        mpesa: {
            consumerKey: '',
            consumerSecret: '',
            shortcode: '',
            passkey: '',
            callbackUrl: '',
        },
        brevo: {
            apiKey: '',
            senderEmail: '',
            senderName: '',
        },
        cloudinary: {
            cloudName: '',
            apiKey: '',
            apiSecret: '',
        },
        company: {
            name: 'RetailPro',
            email: '',
            phone: '',
            address: '',
        },
        currency: {
            base: defaultCurrency || 'KES',
            symbol: 'KES',
            defaultRate: '1',
        },
        paystack: {
            publicKey: '',
            secretKey: '',
        }
    });
    const [activeGateway, setActiveGateway] = useState<'mpesa' | 'paystack' | 'none'>('none');
    const [exchangeRates, setExchangeRates] = useState<any[]>([]);
    const [newRate, setNewRate] = useState({ from: 'USD', to: 'KES', rate: '' });
    const [showPrinterModal, setShowPrinterModal] = useState(false);
    const { 
        handheldMode, 
        setHandheldMode, 
        defaultPrinter, 
        bluetoothPrinter, 
        networkPrinter 
    } = useHardware();

    useEffect(() => {
        fetchSettings();
        fetchRates();
    }, []);

    const fetchRates = async () => {
        try {
            const res = await api.get('/exchange-rates/current');
            setExchangeRates(res.data.rates);
        } catch (error) {
            console.error('Error fetching rates:', error);
        }
    };

    const handleAddRate = async () => {
        if (!newRate.rate) return;
        try {
            await api.post('/exchange-rates/update', {
                fromCurrency: newRate.from,
                toCurrency: newRate.to,
                rate: newRate.rate
            });
            toast.success('Rate updated');
            setNewRate({ ...newRate, rate: '' });
            fetchRates();
        } catch (error) {
            toast.error('Failed to update rate');
        }
    };

    const fetchSettings = async () => {
        try {
            const response = await api.getSettings();
            const s = response.data.settings || settings;
            setSettings(s);
            setActiveGateway(s.gateway?.preferred || 'none');
            // Cache for other components (like useCurrency)
            localStorage.setItem('globalSettings', JSON.stringify(s));
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const payload = {
                ...settings,
                gateway: {
                    preferred: activeGateway,
                    enabled: activeGateway !== 'none'
                }
            };
            await api.updateSettings(payload);
            toast.success('Settings synchronized');
        } catch (error) {
            toast.error('Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    const handleClearSales = async () => {
        try {
            await api.clearSales();
            toast.success('All sales records have been cleared');
        } catch (error) {
            toast.error('Failed to clear sales records');
        }
    };

    const handleClearProducts = async () => {
        try {
            await api.clearProducts();
            toast.success('All products and inventory have been cleared');
        } catch (error) {
            toast.error('Failed to clear product records');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">ACCESSING CORE...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col font-body transition-colors duration-300">
            {/* Header */}
            <header className="bg-background/80 backdrop-blur-md border-b border-border px-6 py-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner border border-primary/20">
                            <SettingsIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight text-foreground">
                                SYSTEM <span className="text-primary">NUCLEUS</span>
                            </h1>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">Global Parameters & Node Links</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 rounded-xl transition-all shadow-lg shadow-primary/20 text-xs font-black uppercase disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'SYNCING...' : 'SYNC CORE'}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto w-full px-6 py-12 space-y-12 animate-in fade-in duration-500 text-left">
                <form onSubmit={handleSave} className="space-y-12">
                    
                    {/* Organization Identity */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 border-l-4 border-primary pl-4">
                            <div>
                                <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Organization Identity</h2>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Branch Profile & Public Info</p>
                            </div>
                        </div>
                        <div className="glass-card p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Entity Title</label>
                                <input type="text" className="glass-input h-12 w-full px-4 text-sm font-medium focus:ring-primary outline-none" value={settings.company.name} onChange={(e) => setSettings({ ...settings, company: { ...settings.company, name: e.target.value } })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Support Channel</label>
                                <input type="email" className="glass-input h-12 w-full px-4 text-sm font-medium focus:ring-primary outline-none" value={settings.company.email} onChange={(e) => setSettings({ ...settings, company: { ...settings.company, email: e.target.value } })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Global Hotline</label>
                                <input type="tel" className="glass-input h-12 w-full px-4 text-sm font-medium focus:ring-primary outline-none" value={settings.company.phone} onChange={(e) => setSettings({ ...settings, company: { ...settings.company, phone: e.target.value } })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Headquarters</label>
                                <input type="text" className="glass-input h-12 w-full px-4 text-sm font-medium focus:ring-primary outline-none" value={settings.company.address} onChange={(e) => setSettings({ ...settings, company: { ...settings.company, address: e.target.value } })} />
                            </div>
                        </div>
                    </section>

                    {/* Currency & Exchange Rates */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <section className="lg:col-span-1 space-y-6">
                            <div className="flex items-center gap-3 border-l-4 border-emerald-500 pl-4">
                                <div>
                                    <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Currency Base</h2>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Primary Ledger Settings</p>
                                </div>
                            </div>
                            <div className="glass-card p-6 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Base ISO</label>
                                    <select className="glass-input h-12 w-full px-4 text-sm font-bold focus:ring-primary outline-none" value={settings.currency?.base} onChange={(e) => setSettings({ ...settings, currency: { ...settings.currency, base: e.target.value } })}>
                                        <option value="KES">KES (Kenya)</option>
                                        <option value="USD">USD (United States)</option>
                                        <option value="UGX">UGX (Uganda)</option>
                                        <option value="TZS">TZS (Tanzania)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Display Symbol</label>
                                    <input type="text" className="glass-input h-12 w-full px-4 text-sm font-bold" value={settings.currency?.symbol} onChange={(e) => setSettings({ ...settings, currency: { ...settings.currency, symbol: e.target.value } })} />
                                </div>
                            </div>
                        </section>

                        <section className="lg:col-span-2 space-y-6">
                            <div className="flex items-center gap-3 border-l-4 border-blue-500 pl-4">
                                <div>
                                    <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Daily Exchange Rates</h2>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Live Trade Conversions</p>
                                </div>
                            </div>
                            <div className="glass-card p-6 space-y-6">
                                <div className="flex flex-col gap-6">
                                    <div className="flex gap-4 items-end">
                                        <div className="flex-1 grid grid-cols-3 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-black uppercase text-muted-foreground ml-1">Reference Currency (Base)</label>
                                                <select className="glass-input h-10 w-full px-3 text-xs font-bold" value={newRate.from} onChange={(e) => setNewRate({ ...newRate, from: e.target.value })}>
                                                    <option value="USD">USD</option>
                                                    <option value="KES">KES</option>
                                                    <option value="UGX">UGX</option>
                                                    <option value="TZS">TZS</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-black uppercase text-muted-foreground ml-1">Target Currency</label>
                                                <select className="glass-input h-10 w-full px-3 text-xs font-bold" value={newRate.to} onChange={(e) => setNewRate({ ...newRate, to: e.target.value })}>
                                                    <option value="KES">KES</option>
                                                    <option value="USD">USD</option>
                                                    <option value="UGX">UGX</option>
                                                    <option value="TZS">TZS</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-black uppercase text-muted-foreground ml-1">Exchange Rate Value</label>
                                                <input type="number" step="0.0001" className="glass-input h-10 w-full px-3 text-xs font-bold" value={newRate.rate} onChange={(e) => setNewRate({ ...newRate, rate: e.target.value })} placeholder="e.g. 30.00" />
                                            </div>
                                        </div>
                                        <button type="button" onClick={handleAddRate} className="h-10 px-4 bg-primary text-primary-foreground rounded-xl font-bold text-[10px] uppercase">Authorize</button>
                                    </div>
                                    
                                    {newRate.rate && (
                                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest text-center">
                                                Preview: 1 {newRate.from} = {newRate.rate} {newRate.to} 
                                                <span className="mx-2 opacity-30">|</span> 
                                                5000 {newRate.from} = {(5000 * parseFloat(newRate.rate)).toLocaleString()} {newRate.to}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 max-h-[150px] overflow-y-auto scrollbar-hide pr-2">
                                    {exchangeRates.map((r, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-background/50 border border-border rounded-xl">
                                            <span className="text-xs font-bold uppercase">{r.fromCurrency} → {r.toCurrency}</span>
                                            <span className="text-xs font-black text-primary">{r.rate}</span>
                                            <span className="text-[8px] text-muted-foreground font-bold">{new Date(r.date).toLocaleDateString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Hardware & Printers */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 border-l-4 border-amber-500 pl-4">
                            <div>
                                <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Hardware & Peripherals</h2>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Device Nodes & External Links</p>
                            </div>
                        </div>
                        <div className="glass-card p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Default Output Node</label>
                                    <div className="p-4 rounded-xl bg-secondary/30 border border-border flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <PrinterIcon className="w-5 h-5 text-primary" />
                                            <div>
                                                <p className="text-xs font-black uppercase">{networkPrinter?.name || bluetoothPrinter?.name || defaultPrinter || 'No Printer Configured'}</p>
                                                <p className="text-[8px] font-bold text-muted-foreground uppercase">
                                                    {networkPrinter ? 'Network (TCP)' : bluetoothPrinter ? 'Bluetooth (BLE)' : defaultPrinter ? 'USB / System' : 'Target Device'}
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => setShowPrinterModal(true)}
                                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-[10px] font-black uppercase tracking-widest"
                                        >
                                            Configure
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Input Protocols</label>
                                    <div 
                                        onClick={() => setHandheldMode(!handheldMode)}
                                        className="p-4 rounded-xl border border-border flex items-center justify-between cursor-pointer hover:bg-secondary/20 transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${handheldMode ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                <Smartphone className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black uppercase">Handheld Scanner Mode</p>
                                                <p className="text-[8px] font-bold text-muted-foreground uppercase">Optimize for HID Keyboards</p>
                                            </div>
                                        </div>
                                        <div className={`w-12 h-6 rounded-full transition-all relative ${handheldMode ? 'bg-primary' : 'bg-muted'}`}>
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${handheldMode ? 'left-7' : 'left-1'}`} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Payment Gateways */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 border-l-4 border-purple-500 pl-4">
                            <div>
                                <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Payment Gateways</h2>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Financial Integration Nodes</p>
                            </div>
                        </div>
                        
                        <div className="flex gap-4 p-2 bg-muted/30 rounded-2xl w-fit border border-border mb-6">
                            {['none', 'mpesa', 'paystack'].map((g) => (
                                <button
                                    key={g}
                                    type="button"
                                    onClick={() => setActiveGateway(g as any)}
                                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeGateway === g ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:bg-background'}`}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {activeGateway === 'mpesa' && (
                                <div className="glass-card p-8 space-y-4 animate-in zoom-in-95 duration-300">
                                    <h3 className="text-[10px] font-black text-primary uppercase flex items-center gap-2 mb-2"><Smartphone className="w-4 h-4" /> M-Pesa (Daraja) Config</h3>
                                    <input type="text" className="glass-input h-11 w-full px-4 text-xs font-medium" placeholder="Consumer Key" value={settings.mpesa.consumerKey} onChange={(e) => setSettings({ ...settings, mpesa: { ...settings.mpesa, consumerKey: e.target.value } })} />
                                    <input type="password" className="glass-input h-11 w-full px-4 text-xs font-medium" placeholder="Consumer Secret" value={settings.mpesa.consumerSecret} onChange={(e) => setSettings({ ...settings, mpesa: { ...settings.mpesa, consumerSecret: e.target.value } })} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <input type="text" className="glass-input h-11 w-full px-4 text-xs font-medium" placeholder="Shortcode" value={settings.mpesa.shortcode} onChange={(e) => setSettings({ ...settings, mpesa: { ...settings.mpesa, shortcode: e.target.value } })} />
                                        <input type="password" className="glass-input h-11 w-full px-4 text-xs font-medium" placeholder="Passkey" value={settings.mpesa.passkey} onChange={(e) => setSettings({ ...settings, mpesa: { ...settings.mpesa, passkey: e.target.value } })} />
                                    </div>
                                </div>
                            )}

                            {activeGateway === 'paystack' && (
                                <div className="glass-card p-8 space-y-4 animate-in zoom-in-95 duration-300">
                                    <h3 className="text-[10px] font-black text-primary uppercase flex items-center gap-2 mb-2"><CreditCard className="w-4 h-4" /> Paystack Infrastructure</h3>
                                    <input type="text" className="glass-input h-11 w-full px-4 text-xs font-medium" placeholder="Public Key" value={settings.paystack?.publicKey} onChange={(e) => setSettings({ ...settings, paystack: { ...settings.paystack, publicKey: e.target.value } })} />
                                    <input type="password" className="glass-input h-11 w-full px-4 text-xs font-medium" placeholder="Secret Key" value={settings.paystack?.secretKey} onChange={(e) => setSettings({ ...settings, paystack: { ...settings.paystack, secretKey: e.target.value } })} />
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Tax Rates */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <DollarSign className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-widest">Tax Rates</h2>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Configure tax rates for products and branches</p>
                                <p className="text-[8px] text-muted-foreground/50 mt-0.5">Set up different tax rates (e.g. VAT 16%, Zero Rated) and assign them to products. Rates can be inclusive (in the price) or exclusive (added on top).</p>
                            </div>
                        </div>
                        <TaxRatesSection />
                    </section>

                    {/* Webhooks */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Plug className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-widest">Webhooks</h2>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Send real-time events to external services</p>
                                <p className="text-[8px] text-muted-foreground/50 mt-0.5">Tell your own external server when something happens: a sale is made, stock runs low, or a return is processed. Your server gets a signed URL call it can act on. Not needed unless you run external software.</p>
                            </div>
                        </div>
                        <WebhooksSection />
                    </section>

                    {user?.role === 'admin' && (
                        <section className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-destructive/20 pb-4">
                                <div className="p-2 bg-destructive/10 rounded-lg text-destructive">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black uppercase tracking-widest text-destructive">Danger Zone</h2>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Destructive system-wide protocols</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="glass-card p-6 border-destructive/10 hover:border-destructive/30 transition-colors">
                                    <h3 className="text-xs font-black text-foreground uppercase mb-2">Purge Transaction Vault</h3>
                                    <p className="text-[10px] text-muted-foreground mb-6">Wipes all sales, payments, and receipt logs. Inventory and user accounts are preserved.</p>
                                    <button 
                                        type="button"
                                        onClick={() => setConfirmClearSales(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive text-[10px] font-black uppercase tracking-widest transition-all hover:text-white"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Execute Purge
                                    </button>
                                </div>

                                <div className="glass-card p-6 border-destructive/10 hover:border-destructive/30 transition-colors">
                                    <h3 className="text-xs font-black text-foreground uppercase mb-2">Reset Product Catalog</h3>
                                    <p className="text-[10px] text-muted-foreground mb-6">Deletes ALL products, variants, and current inventory levels. Requires full re-import.</p>
                                    <button 
                                        type="button"
                                        onClick={() => setConfirmClearProducts(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive text-[10px] font-black uppercase tracking-widest transition-all hover:text-white"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Reset Catalog
                                    </button>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Nodes Status */}
                    <div className="bg-muted/50 p-8 rounded-3xl flex items-center justify-between border border-border group">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center text-primary shadow-inner border border-border group-hover:rotate-12 transition-transform">
                                <Shield className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-foreground tracking-tight">Security Protocol</h3>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-1">All integration secrets are RSA-2048 encrypted</p>
                            </div>
                        </div>
                        <button type="submit" disabled={saving} className="bg-foreground text-background hover:bg-foreground/90 h-14 px-10 rounded-2xl transition-all shadow-xl font-black uppercase text-xs tracking-widest disabled:opacity-50">
                            {saving ? 'UPDATING...' : 'AUTHORIZE SYNC'}
                        </button>
                    </div>
                </form>
            </main>
            <PrinterSetupModal isOpen={showPrinterModal} onClose={() => setShowPrinterModal(false)} />

            <CustomModal
                isOpen={confirmClearSales}
                type="warning"
                title="Clear All Sales?"
                message="CRITICAL ACTION: This will permanently delete ALL transaction and payment records. Are you absolutely sure? This cannot be undone."
                confirmText="Delete All Sales"
                cancelText="Cancel"
                onConfirm={handleClearSales}
                onCancel={() => setConfirmClearSales(false)}
                onClose={() => setConfirmClearSales(false)}
            />

            <CustomModal
                isOpen={confirmClearProducts}
                type="warning"
                title="Clear All Products?"
                message="CRITICAL ACTION: This will permanently delete ALL products and inventory. This cannot be undone. Proceed?"
                confirmText="Delete All Products"
                cancelText="Cancel"
                onConfirm={handleClearProducts}
                onCancel={() => setConfirmClearProducts(false)}
                onClose={() => setConfirmClearProducts(false)}
            />
        </div>
    );
}

// Tax Rates Section Component
function TaxRatesSection() {
    const [rates, setRates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ name: '', rate: '', type: 'exclusive', isDefault: false });

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const res = await api.get('/tax-rates');
            setRates(res.data.taxRates || []);
        } catch { } finally { setLoading(false); }
    }

    async function handleAdd() {
        if (!form.name || !form.rate) { toast.error('Name and rate required'); return; }
        try {
            await api.post('/tax-rates', { ...form, rate: parseFloat(form.rate) });
            toast.success('Tax rate created');
            setShowAdd(false);
            setForm({ name: '', rate: '', type: 'exclusive', isDefault: false });
            load();
        } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
    }

    async function handleDelete(id: string) {
        try {
            await api.delete(`/tax-rates/${id}`);
            toast.success('Tax rate deleted');
            load();
        } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] text-muted-foreground">{rates.length} tax rate(s) configured</p>
                <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-[9px] font-black uppercase tracking-wider">
                    <Plus className="w-3 h-3" /> Add Rate
                </button>
            </div>
            <div className="space-y-2">
                {rates.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between glass-card p-4 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${r.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <div>
                                <p className="text-xs font-bold">{r.name} <span className="text-muted-foreground">({r.rate}%)</span></p>
                                <p className="text-[9px] text-muted-foreground">{r.type} {r.isDefault ? '— Default' : ''}</p>
                            </div>
                        </div>
                        <button onClick={() => handleDelete(r.id)} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg text-[9px]">Delete</button>
                    </div>
                ))}
                {!loading && rates.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-4">No tax rates. Add one above.</p>}
            </div>

            {showAdd && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
                    <div className="bg-background rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h3 className="text-sm font-black mb-4">Add Tax Rate</h3>
                        <div className="space-y-3">
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name (e.g. VAT 16%)"
                                className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" />
                            <input value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} type="number" step="0.01" placeholder="Rate %"
                                className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" />
                            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                                className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary">
                                <option value="exclusive">Exclusive (added to price)</option>
                                <option value="inclusive">Inclusive (included in price)</option>
                            </select>
                            <label className="flex items-center gap-2 text-xs">
                                <input type="checkbox" checked={form.isDefault} onChange={e => setForm({ ...form, isDefault: e.target.checked })} />
                                Set as default
                            </label>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-3 bg-secondary/30 rounded-xl text-xs font-black uppercase">Cancel</button>
                                <button onClick={handleAdd} className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase">Add</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Webhooks Section Component
function WebhooksSection() {
    const [webhooks, setWebhooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ name: '', url: '', events: [] as string[], secret: '' });

    const EVENT_OPTIONS = [
        'sale.created', 'sale.voided', 'product.created', 'product.updated',
        'inventory.adjusted', 'inventory.low_stock', 'return.created', 'return.completed',
    ];

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const res = await api.get('/webhooks');
            setWebhooks(res.data.webhooks || []);
        } catch { } finally { setLoading(false); }
    }

    async function handleAdd() {
        if (!form.name || !form.url || form.events.length === 0) {
            toast.error('Name, URL, and at least one event required');
            return;
        }
        try {
            await api.post('/webhooks', form);
            toast.success('Webhook created');
            setShowAdd(false);
            setForm({ name: '', url: '', events: [], secret: '' });
            load();
        } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
    }

    async function handleDelete(id: string) {
        try {
            await api.delete(`/webhooks/${id}`);
            toast.success('Webhook deleted');
            load();
        } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
    }

    async function handleTest(id: string) {
        try {
            await api.post(`/webhooks/${id}/test`);
            toast.success('Test webhook sent');
        } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
    }

    function toggleEvent(event: string) {
        setForm(f => ({
            ...f,
            events: f.events.includes(event) ? f.events.filter(e => e !== event) : [...f.events, event],
        }));
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] text-muted-foreground">{webhooks.length} webhook(s) configured</p>
                <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-[9px] font-black uppercase tracking-wider">
                    <Plus className="w-3 h-3" /> Add Webhook
                </button>
            </div>
            <div className="space-y-2">
                {webhooks.map((w: any) => (
                    <div key={w.id} className="flex items-center justify-between glass-card p-4 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${w.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <div>
                                <p className="text-xs font-bold">{w.name}</p>
                                <p className="text-[9px] text-muted-foreground truncate max-w-[300px]">{w.url}</p>
                                <div className="flex gap-1 mt-1 flex-wrap">
                                    {(w.events || []).map((e: string) => (
                                        <span key={e} className="text-[8px] px-1.5 py-0.5 bg-secondary/30 rounded">{e}</span>
                                    ))}
                                </div>
                                {w.failureCount > 0 && (
                                    <p className="text-[8px] text-red-500 mt-1">{w.failureCount} failure(s)</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleTest(w.id)} className="p-1.5 bg-secondary/30 rounded-lg hover:bg-secondary/50 text-[9px]">
                                <RefreshCw className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleDelete(w.id)} className="p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 text-[9px]">Delete</button>
                        </div>
                    </div>
                ))}
                {!loading && webhooks.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-4">No webhooks configured</p>}
            </div>

            {showAdd && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
                    <div className="bg-background rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h3 className="text-sm font-black mb-4">Add Webhook</h3>
                        <div className="space-y-3">
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name"
                                className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" />
                            <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://example.com/webhook"
                                className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" />
                            <input value={form.secret} onChange={e => setForm({ ...form, secret: e.target.value })} placeholder="Secret (for HMAC signature)"
                                className="w-full px-4 py-3 bg-secondary/30 rounded-xl border border-white/10 text-sm focus:outline-none focus:border-primary" />
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block mb-2">Events</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {EVENT_OPTIONS.map(event => (
                                        <label key={event} className="flex items-center gap-2 text-[10px] cursor-pointer">
                                            <input type="checkbox" checked={form.events.includes(event)} onChange={() => toggleEvent(event)} />
                                            {event}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-3 bg-secondary/30 rounded-xl text-xs font-black uppercase">Cancel</button>
                                <button onClick={handleAdd} className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase">Create</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
