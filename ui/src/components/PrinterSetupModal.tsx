import { useState, useEffect } from 'react';
import { Printer, RefreshCw, Check, X, Wifi, Bluetooth, Cable, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { useHardware } from '../contexts/HardwareContext';

interface Device {
    name: string;
    address?: string;
    type: 'usb' | 'bluetooth' | 'network';
}

interface PrinterSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PrinterSetupModal({ isOpen, onClose }: PrinterSetupModalProps) {
    const { 
        defaultPrinter, 
        setDefaultPrinter,
        bluetoothPrinter,
        setBluetoothPrinter,
        networkPrinter,
        setNetworkPrinter,
        paperSize,
        setPaperSize,
        isElectron,
        discoverPrinters
    } = useHardware();

    const [printers, setPrinters] = useState<Device[]>([]);
    const [loading, setLoading] = useState(false);
    const [manualIp, setManualIp] = useState(networkPrinter?.address || '');
    const [activeTab, setActiveTab] = useState<'system' | 'bluetooth' | 'network'>(isElectron ? 'system' : 'bluetooth');

    useEffect(() => {
        if (isOpen) {
            handleDiscover();
        }
    }, [isOpen, activeTab]);

    const handleDiscover = async () => {
        setLoading(true);
        try {
            if (activeTab === 'system') {
                const list = await discoverPrinters();
                setPrinters(list as any);
            } else if (activeTab === 'bluetooth') {
                const list = await discoverPrinters(); // Now uses BleClient internally
                setPrinters(list as any);
            } else if (activeTab === 'network') {
                // Network discovery is usually manual IP for thermal printers
                setPrinters([]);
            }
        } catch (err) {
            toast.error('Discovery failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNetwork = () => {
        if (!manualIp) return;
        setNetworkPrinter({
            name: `Network Printer (${manualIp})`,
            address: manualIp,
            type: 'network'
        });
        toast.success('Network printer configured');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-xl flex items-center justify-center z-[300] p-4 animate-in fade-in duration-300 text-left">
            <div className="glass-card max-w-md w-full p-8 shadow-2xl border-white/10 relative overflow-hidden flex flex-col max-h-[90vh]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />

                <div className="flex items-center justify-between mb-8 relative z-10 shrink-0">
                    <div className="flex items-center gap-4 text-left">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                            <Printer className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-widest text-foreground">Printer Setup</h2>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Hardware Configuration</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-secondary/50 rounded-2xl transition-all"><X className="w-5 h-5" /></button>
                </div>

                <div className="space-y-6 relative z-10 overflow-y-auto pr-2 custom-scrollbar flex-1">
                    {/* Discovery Tabs */}
                    <div className="flex p-1 bg-secondary/30 rounded-xl border border-white/5 shrink-0">
                        {isElectron && (
                            <button
                                onClick={() => setActiveTab('system')}
                                className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg transition-all ${activeTab === 'system' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground'}`}
                            >
                                <Cable className="w-3 h-3 mx-auto mb-1" /> System
                            </button>
                        )}
                        <button
                            onClick={() => setActiveTab('bluetooth')}
                            className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg transition-all ${activeTab === 'bluetooth' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground'}`}
                        >
                            <Bluetooth className="w-3 h-3 mx-auto mb-1" /> Bluetooth
                        </button>
                        <button
                            onClick={() => setActiveTab('network')}
                            className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg transition-all ${activeTab === 'network' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground'}`}
                        >
                            <Globe className="w-3 h-3 mx-auto mb-1" /> Network
                        </button>
                    </div>

                    {/* Content */}
                    <div className="space-y-4">
                        {activeTab === 'network' ? (
                            <div className="space-y-4 animate-in slide-in-from-right-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Manual IP Assignment (XPrinter)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={manualIp}
                                            onChange={(e) => setManualIp(e.target.value)}
                                            placeholder="192.168.1.100"
                                            className="glass-input flex-1 h-12 px-4 text-xs font-bold font-mono tracking-widest focus:ring-primary outline-none"
                                        />
                                        <button
                                            onClick={handleSaveNetwork}
                                            className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20"
                                        >
                                            <Check className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                {networkPrinter && (
                                    <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Wifi className="w-5 h-5 text-primary" />
                                            <div className="text-left">
                                                <p className="text-[10px] font-black uppercase">{networkPrinter.name}</p>
                                                <p className="text-[8px] font-bold text-muted-foreground">{networkPrinter.address}</p>
                                            </div>
                                        </div>
                                        <Check className="w-5 h-5 text-primary" />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2 animate-in fade-in">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Discovered Devices</label>
                                    <button
                                        onClick={handleDiscover}
                                        disabled={loading}
                                        className="p-1 hover:bg-primary/10 rounded-lg text-primary transition-all disabled:opacity-50"
                                    >
                                        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>

                                {printers.length === 0 ? (
                                    <div className="p-8 rounded-2xl border-2 border-dashed border-border text-center opacity-50">
                                        <Printer className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">No Devices found</p>
                                        <p className="text-[8px] mt-1 italic">Ensure printer is on and discoverable</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {printers.map((p) => (
                                            <button
                                                key={p.name}
                                                onClick={() => {
                                                    if (activeTab === 'system') setDefaultPrinter(p.name);
                                                    else setBluetoothPrinter(p as any);
                                                }}
                                                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${((activeTab === 'system' && defaultPrinter === p.name) || (activeTab === 'bluetooth' && bluetoothPrinter?.name === p.name)) ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/10' : 'bg-background border-border text-foreground hover:border-primary/50'}`}
                                            >
                                                <div className="flex items-center gap-3 text-left">
                                                    {activeTab === 'bluetooth' ? <Bluetooth className="w-4 h-4" /> : <Printer className="w-4 h-4" />}
                                                    <div className="text-left">
                                                        <p className="text-[10px] font-black uppercase truncate max-w-[180px]">{p.name}</p>
                                                        {p.address && <p className="text-[8px] font-bold opacity-60">{p.address}</p>}
                                                    </div>
                                                </div>
                                                {((activeTab === 'system' && defaultPrinter === p.name) || (activeTab === 'bluetooth' && bluetoothPrinter?.name === p.name)) && <Check className="w-4 h-4" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Paper Size */}
                    <div className="space-y-2 shrink-0">
                        <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Receipt Width</label>
                        <div className="grid grid-cols-2 gap-3">
                            {(['58mm', '80mm'] as const).map(size => (
                                <button
                                    key={size}
                                    onClick={() => setPaperSize(size)}
                                    className={`h-12 rounded-xl border flex items-center justify-center gap-2 transition-all ${paperSize === size ? 'bg-foreground text-background border-foreground shadow-xl' : 'bg-background border-border text-muted-foreground hover:border-primary'}`}
                                >
                                    <span className="text-xs font-black uppercase tracking-widest">{size}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-white/5 shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        Confirm Configuration
                    </button>
                </div>
            </div>
        </div>
    );
}
