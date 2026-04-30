import { useState, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Camera, X, Barcode as BarcodeIcon, Maximize, Smartphone, Keyboard } from 'lucide-react';
import { BarcodeScanner as NativeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';

interface BarcodeScannerProps {
    onScan: (barcode: string) => void;
    onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState('');
    const [manualCode, setManualCode] = useState('');
    const [mode, setMode] = useState<'camera' | 'manual'>('camera');
    const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
    const isCapacitor = Capacitor.isNativePlatform();

    useEffect(() => {
        if (isCapacitor && mode === 'camera') {
            checkPermissions();
        } else if (mode === 'camera' && scanning) {
            startWebCamera();
        }
        return () => stopWebCamera();
    }, [mode, scanning, selectedDeviceId]);

    const checkPermissions = async () => {
        try {
            const { camera } = await NativeScanner.checkPermissions();
            if (camera !== 'granted') {
                const { camera: newStatus } = await NativeScanner.requestPermissions();
                if (newStatus !== 'granted') {
                    setError('Camera permission denied');
                    setMode('manual');
                }
            }
        } catch (err) {
            console.error('Permission check failed', err);
        }
    };

    const startNativeScan = async () => {
        try {
            // Check if Google Barcode Scanner is available (Android)
            if (Capacitor.getPlatform() === 'android') {
                const { available } = await NativeScanner.isGoogleBarcodeScannerModuleAvailable();
                if (!available) {
                    await NativeScanner.installGoogleBarcodeScannerModule();
                }
            }

            const { barcodes } = await NativeScanner.scan({
                formats: [BarcodeFormat.Ean13, BarcodeFormat.Ean8, BarcodeFormat.Code128, BarcodeFormat.QrCode],
            });

            if (barcodes.length > 0) {
                onScan(barcodes[0].displayValue);
                onClose();
            }
        } catch (err: any) {
            toast.error('Native scanner failed');
            setMode('manual');
        }
    };

    const startWebCamera = async () => {
        try {
            const codeReader = new BrowserMultiFormatReader();
            codeReaderRef.current = codeReader;
            const videoInputDevices = await codeReader.listVideoInputDevices();
            setDevices(videoInputDevices);

            if (videoInputDevices.length === 0) {
                setError('No camera found');
                return;
            }

            let deviceId = selectedDeviceId;
            if (!deviceId) {
                const backCamera = videoInputDevices.find(device =>
                    device.label.toLowerCase().includes('back') ||
                    device.label.toLowerCase().includes('environment')
                );
                deviceId = backCamera ? backCamera.deviceId : videoInputDevices[0].deviceId;
                setSelectedDeviceId(deviceId);
            }

            await codeReader.decodeFromVideoDevice(
                deviceId,
                videoRef.current!,
                (result) => {
                    if (result) {
                        onScan(result.getText());
                        stopWebCamera();
                        onClose();
                    }
                }
            );
        } catch (err: any) {
            setError(err.message || 'Failed to start camera');
        }
    };

    const stopWebCamera = () => {
        if (codeReaderRef.current) {
            codeReaderRef.current.reset();
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualCode.trim()) {
            onScan(manualCode.trim());
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-xl flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
            <div className="glass-card max-w-md w-full p-8 space-y-8 shadow-2xl border-white/20">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                            <BarcodeIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-widest text-foreground">Vision Link</h2>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Optical Data Acquisition</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-secondary/50 rounded-2xl transition-all"><X className="w-5 h-5" /></button>
                </div>

                {/* Mode Selector */}
                <div className="flex p-1.5 bg-secondary/30 rounded-2xl border border-white/5">
                    <button
                        onClick={() => setMode('camera')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'camera' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <Camera className="w-4 h-4" /> Camera
                    </button>
                    <button
                        onClick={() => setMode('manual')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'manual' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <Keyboard className="w-4 h-4" /> Manual
                    </button>
                </div>

                {mode === 'camera' ? (
                    <div className="space-y-6">
                        {isCapacitor ? (
                            <div className="py-12 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95">
                                <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center border-4 border-dashed border-primary/20 animate-spin-slow">
                                    <Smartphone className="w-10 h-10 text-primary" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-black text-foreground uppercase tracking-wider">Ready for Native Scan</h3>
                                    <p className="text-[10px] text-muted-foreground font-bold px-8 leading-relaxed uppercase tracking-tighter">Utilizing system hardware for high-precision decoding</p>
                                </div>
                                <button
                                    onClick={startNativeScan}
                                    className="w-full h-16 bg-primary text-primary-foreground rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    <Maximize className="w-6 h-6" /> OPEN OPTIC SENSOR
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in duration-500">
                                {error && <div className="p-4 bg-destructive/10 text-destructive text-[10px] font-black uppercase rounded-xl border border-destructive/20">{error}</div>}
                                
                                {devices.length > 1 && (
                                    <div className="space-y-2">
                                        <label className="text-[8px] font-black text-muted-foreground uppercase ml-1">Source Node</label>
                                        <select
                                            value={selectedDeviceId}
                                            onChange={(e) => { stopWebCamera(); setSelectedDeviceId(e.target.value); }}
                                            className="glass-input w-full h-12 px-4 text-xs font-bold focus:ring-primary outline-none"
                                        >
                                            {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Generic Node'}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div className="relative aspect-square bg-black rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white/5 group">
                                    <video ref={videoRef} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-64 h-64 border-2 border-primary/40 rounded-3xl relative">
                                            <div className="absolute inset-0 border-4 border-primary rounded-3xl animate-pulse opacity-20" />
                                            <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                                            <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                                            <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                                            <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
                                            <div className="absolute left-4 right-4 top-1/2 h-0.5 bg-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.5)] animate-scan" />
                                        </div>
                                    </div>
                                    {!scanning && (
                                        <button
                                            onClick={() => setScanning(true)}
                                            className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center text-primary font-black uppercase text-xs tracking-widest hover:bg-background/40 transition-all"
                                        >
                                            Initialize Camera
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleManualSubmit} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Serial Identity</label>
                            <input
                                type="text"
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                placeholder="880123456789..."
                                className="glass-input w-full h-16 px-6 text-lg font-black tracking-widest focus:ring-primary outline-none"
                                autoFocus
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!manualCode.trim()}
                            className="w-full h-16 bg-foreground text-background rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                            QUERY DATABASE
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
