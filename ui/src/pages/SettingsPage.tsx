import { useState, useEffect } from 'react';
import { Save, Settings as SettingsIcon, Shield, CreditCard, Cloud, Building, Mail, Globe } from 'lucide-react';
import api from '../lib/api-client';
import toast from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';
import { useCurrency } from '../hooks/useCurrency';

export default function SettingsPage() {
    const { currency: defaultCurrency } = useCurrency();
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
            name: 'BorderShop POS',
            email: '',
            phone: '',
            address: '',
        },
        currency: {
            base: defaultCurrency || 'KES',
            symbol: 'KSh',
            defaultRate: '1',
        }
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.getSettings();
            setSettings(response.data.settings || settings);
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
            await api.updateSettings(settings);
            toast.success('Settings synchronized');
        } catch (error) {
            toast.error('Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 text-sm font-medium">Accessing Core...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col font-sans transition-colors duration-300">
            {/* Header */}
            <header className="bg-background border-b border-border px-6 py-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shadow-sm">
                            <SettingsIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">
                                Global <span className="text-primary">Configuration</span>
                            </h1>
                            <p className="text-xs text-muted-foreground font-medium">System parameters and integrations</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 rounded-md transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            <span className="hidden md:inline uppercase text-xs font-bold">{saving ? 'Syncing...' : 'Sync Config'}</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto w-full px-6 py-8 space-y-12 animate-in fade-in duration-500 text-left">
                <form onSubmit={handleSave} className="space-y-8">
                    {/* Organization */}
                    <div className="space-y-4">
                        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <Building className="w-4 h-4" />
                            Organization Identity
                        </h2>
                        <div className="bg-card text-card-foreground border border-border shadow-sm rounded-xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Company Name</label>
                                <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={settings.company.name} onChange={(e) => setSettings({ ...settings, company: { ...settings.company, name: e.target.value } })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Support Email</label>
                                <input type="email" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={settings.company.email} onChange={(e) => setSettings({ ...settings, company: { ...settings.company, email: e.target.value } })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Hotline</label>
                                <input type="tel" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={settings.company.phone} onChange={(e) => setSettings({ ...settings, company: { ...settings.company, phone: e.target.value } })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Location</label>
                                <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={settings.company.address} onChange={(e) => setSettings({ ...settings, company: { ...settings.company, address: e.target.value } })} />
                            </div>
                        </div>
                    </div>

                    {/* Currency Settings */}
                    <div className="space-y-4 text-left">
                        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <Globe className="w-4 h-4 text-primary" />
                            Currency System
                        </h2>
                        <div className="bg-card text-card-foreground border border-border shadow-sm rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Base Currency</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={settings.currency?.base || 'KES'}
                                    onChange={(e) => setSettings({ ...settings, currency: { ...(settings.currency || {}), base: e.target.value } })}
                                >
                                    <option value="USD">USD ($)</option>
                                    <option value="KES">KES (KSh)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="GBP">GBP (£)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Symbol</label>
                                <input
                                    type="text"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={settings.currency?.symbol || 'KSh'}
                                    onChange={(e) => setSettings({ ...settings, currency: { ...(settings.currency || {}), symbol: e.target.value } })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Exchange Rate</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={settings.currency?.defaultRate || '1'}
                                    onChange={(e) => setSettings({ ...settings, currency: { ...(settings.currency || {}), defaultRate: e.target.value } })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Financial */}
                        <div className="space-y-4">
                            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-emerald-500" />
                                M-Pesa Gateway
                            </h2>
                            <div className="bg-card text-card-foreground border border-border shadow-sm rounded-xl p-6 space-y-4">
                                <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Consumer Key" value={settings.mpesa.consumerKey} onChange={(e) => setSettings({ ...settings, mpesa: { ...settings.mpesa, consumerKey: e.target.value } })} />
                                <input type="password" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Consumer Secret" value={settings.mpesa.consumerSecret} onChange={(e) => setSettings({ ...settings, mpesa: { ...settings.mpesa, consumerSecret: e.target.value } })} />
                                <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Shortcode" value={settings.mpesa.shortcode} onChange={(e) => setSettings({ ...settings, mpesa: { ...settings.mpesa, shortcode: e.target.value } })} />
                                <input type="password" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Passkey" value={settings.mpesa.passkey} onChange={(e) => setSettings({ ...settings, mpesa: { ...settings.mpesa, passkey: e.target.value } })} />
                                <input type="url" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Callback URL" value={settings.mpesa.callbackUrl} onChange={(e) => setSettings({ ...settings, mpesa: { ...settings.mpesa, callbackUrl: e.target.value } })} />
                            </div>
                        </div>

                        {/* External Nodes */}
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-blue-500" />
                                    Communication
                                </h2>
                                <div className="bg-card text-card-foreground border border-border shadow-sm rounded-xl p-6 space-y-4">
                                    <input type="password" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Brevo API Key" value={settings.brevo.apiKey} onChange={(e) => setSettings({ ...settings, brevo: { ...settings.brevo, apiKey: e.target.value } })} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <input type="email" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Sender Email" value={settings.brevo.senderEmail} onChange={(e) => setSettings({ ...settings, brevo: { ...settings.brevo, senderEmail: e.target.value } })} />
                                        <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Sender Name" value={settings.brevo.senderName} onChange={(e) => setSettings({ ...settings, brevo: { ...settings.brevo, senderName: e.target.value } })} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Cloud className="w-4 h-4 text-purple-500" />
                                    Assets
                                </h2>
                                <div className="bg-card text-card-foreground border border-border shadow-sm rounded-xl p-6 space-y-4">
                                    <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Cloudinary Name" value={settings.cloudinary.cloudName} onChange={(e) => setSettings({ ...settings, cloudinary: { ...settings.cloudinary, cloudName: e.target.value } })} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="API Key" value={settings.cloudinary.apiKey} onChange={(e) => setSettings({ ...settings, cloudinary: { ...settings.cloudinary, apiKey: e.target.value } })} />
                                        <input type="password" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="API Secret" value={settings.cloudinary.apiSecret} onChange={(e) => setSettings({ ...settings, cloudinary: { ...settings.cloudinary, apiSecret: e.target.value } })} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-muted/50 p-6 rounded-xl flex items-center justify-between border border-border">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center text-primary shadow-sm border border-border">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-foreground">Security Protocol</h3>
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">All parameters encrypted</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 rounded-md transition-colors text-sm font-bold disabled:opacity-50">
                                {saving ? 'Syncing...' : 'Commit Changes'}
                            </button>
                        </div>
                    </div>
                </form>
            </main>
        </div >
    );
}
