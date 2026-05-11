import { useState, useEffect } from 'react';
import { Printer, RefreshCw, Check, X, Wifi, Bluetooth, Cable } from 'lucide-react';
import toast from 'react-hot-toast';

interface Device {
    name: string;
    displayName?: string;
    status?: string;
}

interface PrinterSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PrinterSetupModal({ isOpen, onClose }: PrinterSetupModalProps) {
    const [printers, setPrinters] = useState<Device[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedPrinter, setSelectedPrinter] = useState(localStorage.getItem('defaultPrinter') || '');
    const [paperSize, setPaperSize] = useState(localStorage.getItem('receiptPaperSize') || '80mm');
    const isElectron = (window as any).electronAPI !== undefined;

    useEffect(() => {
        if (isOpen && isElectron) {
            discoverPrinters();
        }
    }, [isOpen, isElectron]);

    const discoverPrinters = async () => {
        setLoading(true);
        try {
            const list = await (window as any).electronAPI.getPrinters();
            setPrinters(list);

            // Auto-select first thermal printer if none selected
            if (!selectedPrinter) {
                const thermal = list.find((p: Device) =>
                    p.name.toLowerCase().includes('thermal') ||
                    p.name.toLowerCase().includes('pos') ||
                    p.name.toLowerCase().includes('58mm') ||
                    p.name.toLowerCase().includes('80mm')
                );
                if (thermal) setSelectedPrinter(thermal.name);
            }
        } catch (err) {
            toast.error('Failed to discover printers');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = () => {
        localStorage.setItem('defaultPrinter', selectedPrinter);
        localStorage.setItem('receiptPaperSize', paperSize);
        toast.success('Printer configuration saved');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-xl flex items-center justify-center z-[300] p-4 animate-in fade-in duration-300">
            <div className="glass-card max-w-md w-full p-8 shadow-2xl border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />

                <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                            <Printer className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-widest text-foreground">Printer Setup</h2>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Wired & Wireless Discovery</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-secondary/50 rounded-2xl transition-all"><X className="w-5 h-5" /></button>
                </div>

                <div className="space-y-6 relative z-10">
                    {/* Discovery Status */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="p-3 rounded-xl bg-secondary/30 border border-white/5 flex flex-col items-center gap-1">
                            <Cable className="w-4 h-4 text-blue-500" />
                            <span className="text-[8px] font-black uppercase">USB/Serial</span>
                        </div>
                        <div className="p-3 rounded-xl bg-secondary/30 border border-white/5 flex flex-col items-center gap-1">
                            <Wifi className="w-4 h-4 text-emerald-500" />
                            <span className="text-[8px] font-black uppercase">Network/Wi-Fi</span>
                        </div>
                        <div className="p-3 rounded-xl bg-secondary/30 border border-white/5 flex flex-col items-center gap-1">
                            <Bluetooth className="w-4 h-4 text-primary" />
                            <span className="text-[8px] font-black uppercase">Bluetooth</span>
                        </div>
                    </div>

                    {/* Printer List */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Available Devices</label>
                            {isElectron && (
                                <button
                                    onClick={discoverPrinters}
                                    disabled={loading}
                                    className="p-1 hover:bg-primary/10 rounded-lg text-primary transition-all disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                                </button>
                            )}
                        </div>

                        {!isElectron ? (
                            <div className="p-6 rounded-2xl border-2 border-dashed border-border text-center opacity-50">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase">System Print Enabled</p>
                                <p className="text-[8px] mt-1 italic">Use standard print dialog for mobile/web</p>
                            </div>
                        ) : printers.length === 0 ? (
                            <div className="p-6 rounded-2xl border-2 border-dashed border-border text-center opacity-50">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase">No Printers Found</p>
                                <p className="text-[8px] mt-1 italic">Ensure printer is connected and installed</p>
                            </div>
                        ) : (
                            <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {printers.map((p) => (
                                    <button
                                        key={p.name}
                                        onClick={() => setSelectedPrinter(p.name)}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${selectedPrinter === p.name ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/10' : 'bg-background border-border text-foreground hover:border-primary/50'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Printer className="w-4 h-4" />
                                            <span className="text-[10px] font-bold truncate max-w-[200px]">{p.name}</span>
                                        </div>
                                        {selectedPrinter === p.name && <Check className="w-4 h-4" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Paper Size */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Paper Width</label>
                        <div className="grid grid-cols-2 gap-3">
                            {['58mm', '80mm'].map(size => (
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

                    <div className="pt-4 border-t border-white/5 space-y-3">
                        <button
                            onClick={handleSave}
                            className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            Confirm Connection
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full h-12 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Skip for Now (Optional)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
