import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Printer, RefreshCw, Check, X, Wifi, Bluetooth, Cable, Globe, TestTube, Plug } from 'lucide-react';
import toast from 'react-hot-toast';
import { useHardware } from '../contexts/HardwareContext';
import { testTcpConnection } from '../plugins/tcp-printer';

interface Device {
    name: string;
    address?: string;
    port?: number;
    type: 'usb' | 'bluetooth' | 'network';
    displayName?: string;
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
        isMobile,
        discoverPrinters,
        requestWebUsbPrinter,
        requestWebBluetoothPrinter,
        testPrinter
    } = useHardware();

    const [printers, setPrinters] = useState<Device[]>([]);
    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState(false);
    const [manualIp, setManualIp] = useState(networkPrinter?.address || '');
    const [manualPort, setManualPort] = useState(String(networkPrinter?.port || 9100));
    const [activeTab, setActiveTab] = useState<'system' | 'bluetooth' | 'network' | 'usb'>(isElectron ? 'system' : (Capacitor.isNativePlatform() ? 'bluetooth' : 'usb'));
    const [checkingConnection, setCheckingConnection] = useState(false);
    const [connectionResult, setConnectionResult] = useState<{ reachable: boolean; error?: string; connectTimeMs?: number } | null>(null);

    useEffect(() => {
        if (isOpen) {
            setManualIp(networkPrinter?.address || '');
            setManualPort(String(networkPrinter?.port || 9100));
            handleDiscover();
        }
    }, [isOpen, activeTab]);

    const handleDiscover = async () => {
        setLoading(true);
        try {
            if (activeTab === 'system') {
                const list = await discoverPrinters();
                setPrinters(list);
            } else if (activeTab === 'bluetooth') {
                const list = await discoverPrinters();
                setPrinters(list);
            } else if (activeTab === 'network') {
                setPrinters([]);
            } else {
                setPrinters([]);
            }
        } catch (err) {
            toast.error('Discovery failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNetwork = () => {
        if (!manualIp) {
            toast.error('Please enter a printer IP address');
            return;
        }
        const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipPattern.test(manualIp)) {
            toast.error('Invalid IP address format');
            return;
        }
        const port = parseInt(manualPort) || 9100;
        setNetworkPrinter({
            name: `XPrinter (${manualIp}:${port})`,
            address: manualIp,
            port: port,
            type: 'network',
            displayName: `XPrinter @ ${manualIp}:${port}`
        });
        toast.success(`Network printer configured: ${manualIp}:${port}`);
    };

    const handleTestNetwork = async () => {
        if (!networkPrinter?.address) {
            toast.error('Configure a network printer first');
            return;
        }
        setTesting(true);
        try {
            const ok = await testPrinter('network', networkPrinter.address, networkPrinter.port || 9100);
            if (ok) {
                toast.success('Test print sent successfully!');
            } else {
                toast.error('Test print failed. Check IP, port, and printer status.');
            }
        } catch {
            toast.error('Test print failed');
        } finally {
            setTesting(false);
        }
    };

    const handleCheckConnection = async () => {
        if (!networkPrinter?.address) {
            toast.error('Configure a network printer first');
            return;
        }
        setCheckingConnection(true);
        setConnectionResult(null);
        try {
            const res = await testTcpConnection(networkPrinter.address, networkPrinter.port || 9100);
            setConnectionResult(res);
            if (res.reachable) {
                toast.success(`Printer reachable (${res.connectTimeMs}ms)`);
            } else {
                toast.error(res.error || 'Printer not reachable');
            }
        } catch {
            setConnectionResult({ reachable: false, error: 'Connection check failed' });
            toast.error('Connection check failed');
        } finally {
            setCheckingConnection(false);
        }
    };

    const handleTestBluetooth = async () => {
        if (!bluetoothPrinter) {
            toast.error('Configure a Bluetooth printer first');
            return;
        }
        setTesting(true);
        try {
            const ok = await testPrinter('bluetooth');
            if (ok) {
                toast.success('Test print sent successfully!');
            } else {
                toast.error('Test print failed. Check printer connection.');
            }
        } catch {
            toast.error('Test print failed');
        } finally {
            setTesting(false);
        }
    };

    const handleTestUsb = async () => {
        if (!defaultPrinter) {
            toast.error('Configure a USB printer first');
            return;
        }
        setTesting(true);
        try {
            const ok = await testPrinter('usb');
            if (ok) {
                toast.success('Test print sent successfully!');
            } else {
                toast.error('Test print failed. Check printer connection.');
            }
        } catch {
            toast.error('Test print failed');
        } finally {
            setTesting(false);
        }
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
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Network / BLE / USB</p>
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
                        {!isElectron && !isMobile && (
                            <button
                                onClick={() => setActiveTab('usb')}
                                className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg transition-all ${activeTab === 'usb' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground'}`}
                            >
                                <Cable className="w-3 h-3 mx-auto mb-1" /> USB
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
                                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Printer IP Address (XPrinter / Thermal)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={manualIp}
                                            onChange={(e) => setManualIp(e.target.value)}
                                            placeholder="192.168.1.100"
                                            className="glass-input flex-1 h-12 px-4 text-xs font-bold font-mono tracking-widest focus:ring-primary outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Port (Default: 9100)</label>
                                    <input
                                        type="number"
                                        value={manualPort}
                                        onChange={(e) => setManualPort(e.target.value)}
                                        placeholder="9100"
                                        className="glass-input w-full h-12 px-4 text-xs font-bold font-mono focus:ring-primary outline-none"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSaveNetwork}
                                        disabled={!manualIp}
                                        className="flex-1 h-12 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        <Check className="w-4 h-4 inline mr-2" /> Save Printer
                                    </button>
                                    <button
                                        onClick={handleTestNetwork}
                                        disabled={!networkPrinter || testing}
                                        className="h-12 px-4 bg-secondary text-foreground rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-primary/20 transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <TestTube className="w-4 h-4" /> {testing ? '...' : 'Test'}
                                    </button>
                                </div>
                                {networkPrinter && (
                                    <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <Wifi className="w-5 h-5 text-primary" />
                                                <div className="text-left">
                                                    <p className="text-[10px] font-black uppercase">{networkPrinter.name}</p>
                                                    <p className="text-[8px] font-bold text-muted-foreground">{networkPrinter.address}:{networkPrinter.port || 9100}</p>
                                                </div>
                                            </div>
                                            <Check className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleCheckConnection}
                                                disabled={checkingConnection}
                                                className="flex-1 h-8 bg-secondary/50 rounded-lg text-[8px] font-black uppercase tracking-wider hover:bg-secondary transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                                            >
                                                <Plug className="w-3 h-3" />
                                                {checkingConnection ? 'Checking...' : 'Check Connection'}
                                            </button>
                                        </div>
                                        {connectionResult && (
                                            <div className={`mt-2 px-3 py-2 rounded-lg text-[9px] font-bold flex items-center gap-2 ${connectionResult.reachable ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                                                {connectionResult.reachable ? (
                                                    <>Printer reachable in {connectionResult.connectTimeMs}ms</>
                                                ) : (
                                                    <>{connectionResult.error}</>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : activeTab === 'usb' && !isElectron ? (
                            <div className="space-y-4 animate-in slide-in-from-bottom-4">
                                <button
                                    onClick={async () => {
                                        const p = await requestWebUsbPrinter();
                                        if (p) {
                                            setPrinters([p]);
                                            setDefaultPrinter(p.name);
                                            toast.success(`USB Printer Connected: ${p.name}`);
                                        }
                                    }}
                                    className="w-full h-20 bg-primary/10 border-2 border-dashed border-primary/30 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-primary/20 transition-all text-primary"
                                >
                                    <Cable className="w-6 h-6" />
                                    <span className="text-[10px] font-black uppercase">Pair New USB Printer</span>
                                </button>
                                {defaultPrinter && (
                                    <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Cable className="w-5 h-5 text-primary" />
                                            <div className="text-left">
                                                <p className="text-[10px] font-black uppercase">Active USB Device</p>
                                                <p className="text-[8px] font-bold text-muted-foreground">{defaultPrinter}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleTestUsb}
                                            disabled={testing}
                                            className="px-3 py-2 bg-primary text-white rounded-lg text-[8px] font-black uppercase hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-1"
                                        >
                                            <TestTube className="w-3 h-3" /> Test
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : activeTab === 'bluetooth' ? (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Discovered Bluetooth Printers</label>
                                    <button
                                        onClick={handleDiscover}
                                        disabled={loading}
                                        className="p-1 hover:bg-primary/10 rounded-lg text-primary transition-all disabled:opacity-50"
                                    >
                                        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>

                                {printers.length === 0 && !isMobile ? (
                                    <div className="p-8 rounded-2xl border-2 border-dashed border-border text-center opacity-50">
                                        <Bluetooth className="w-8 h-8 mx-auto mb-2" />
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">No Devices found</p>
                                        <p className="text-[8px] mt-1 italic">Web Bluetooth requires HTTPS</p>
                                        <button
                                            onClick={async () => {
                                                const p = await requestWebBluetoothPrinter();
                                                if (p) {
                                                    setPrinters([p]);
                                                    setBluetoothPrinter(p);
                                                    toast.success(`Bluetooth Printer Linked: ${p.name}`);
                                                }
                                            }}
                                            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-[8px] font-black uppercase shadow-lg shadow-primary/20"
                                        >
                                            Pair Bluetooth Device
                                        </button>
                                    </div>
                                ) : printers.length === 0 ? (
                                    <div className="p-8 rounded-2xl border-2 border-dashed border-border text-center">
                                        <Bluetooth className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Scanning for printers...</p>
                                        <p className="text-[8px] mt-1 italic">Ensure printer is on and discoverable</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {printers.map((p) => (
                                            <button
                                                key={p.address || p.name}
                                                onClick={() => {
                                                    setBluetoothPrinter(p);
                                                    toast.success(`Bluetooth Printer Selected: ${p.name}`);
                                                }}
                                                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${bluetoothPrinter?.name === p.name ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/10' : 'bg-background border-border text-foreground hover:border-primary/50'}`}
                                            >
                                                <div className="flex items-center gap-3 text-left">
                                                    <Bluetooth className="w-4 h-4" />
                                                    <div className="text-left">
                                                        <p className="text-[10px] font-black uppercase truncate max-w-[180px]">{p.name}</p>
                                                        {p.address && <p className="text-[8px] font-bold opacity-60">{p.address}</p>}
                                                    </div>
                                                </div>
                                                {bluetoothPrinter?.name === p.name && <Check className="w-4 h-4" />}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {bluetoothPrinter && (
                                    <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Bluetooth className="w-5 h-5 text-primary" />
                                            <div className="text-left">
                                                <p className="text-[10px] font-black uppercase">Active: {bluetoothPrinter.name}</p>
                                                <p className="text-[8px] font-bold text-muted-foreground">{bluetoothPrinter.address}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleTestBluetooth}
                                            disabled={testing}
                                            className="px-3 py-2 bg-primary text-white rounded-lg text-[8px] font-black uppercase hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-1"
                                        >
                                            <TestTube className="w-3 h-3" /> Test
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">System Printers</label>
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
                                        <Printer className="w-8 h-8 mx-auto mb-2" />
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">No System Printers Found</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {printers.map((p) => (
                                            <button
                                                key={p.name}
                                                onClick={() => setDefaultPrinter(p.name)}
                                                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${defaultPrinter === p.name ? 'bg-primary/10 border-primary text-primary' : 'bg-background border-border text-foreground hover:border-primary/50'}`}
                                            >
                                                <div className="flex items-center gap-3 text-left">
                                                    <Printer className="w-4 h-4" />
                                                    <p className="text-[10px] font-black uppercase">{p.name}</p>
                                                </div>
                                                {defaultPrinter === p.name && <Check className="w-4 h-4" />}
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
