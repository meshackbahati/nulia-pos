import { useState, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Camera, X, Barcode as BarcodeIcon } from 'lucide-react';

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
    const [useCamera, setUseCamera] = useState(true);
    const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
    const [isMobileApp, setIsMobileApp] = useState(false);

    useEffect(() => {
        if ((window as any).RetailProDevice) {
            setIsMobileApp(true);
        }
    }, []);

    useEffect(() => {
        if (useCamera && scanning) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [useCamera, scanning, selectedDeviceId]); // Re-start if device changes

    const startCamera = async () => {
        try {
            const codeReader = new BrowserMultiFormatReader();
            codeReaderRef.current = codeReader;

            const videoInputDevices = await codeReader.listVideoInputDevices();
            setDevices(videoInputDevices);

            if (videoInputDevices.length === 0) {
                setError('No camera found');
                return;
            }

            // Smart Selection: Prefer back camera
            let deviceId = selectedDeviceId;
            if (!deviceId) {
                const backCamera = videoInputDevices.find(device =>
                    device.label.toLowerCase().includes('back') ||
                    device.label.toLowerCase().includes('environment')
                );
                deviceId = backCamera ? backCamera.deviceId : videoInputDevices[0].deviceId;
                setSelectedDeviceId(deviceId); // Set for UI sync
            }

            await codeReader.decodeFromVideoDevice(
                deviceId,
                videoRef.current!,
                (result) => {
                    if (result) {
                        onScan(result.getText());
                        stopCamera();
                        onClose();
                    }
                }
            );
        } catch (err: any) {
            setError(err.message || 'Failed to start camera');
        }
    };

    const stopCamera = () => {
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <BarcodeIcon className="w-6 h-6" />
                        Scan Barcode
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Mode Toggle */}
                <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => { setUseCamera(true); setScanning(true); }}
                        className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${useCamera ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <div className="flex flex-col items-center">
                            <Camera className="w-4 h-4 mb-1" />
                            <span>Camera</span>
                        </div>
                    </button>
                    <button
                        onClick={() => { setUseCamera(false); stopCamera(); }}
                        className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${!useCamera ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <div className="flex flex-col items-center">
                            <BarcodeIcon className="w-4 h-4 mb-1" />
                            <span>Manual Entry</span>
                        </div>
                    </button>
                </div>

                {isMobileApp && (window as any).RetailProDevice && (
                    <div className="mb-4 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
                        <span className="text-[10px] font-bold text-blue-600 uppercase">Device Detected</span>
                        <span className="text-[10px] text-blue-700 font-medium">
                            {(window as any).RetailProDevice.brand} {(window as any).RetailProDevice.modelName}
                        </span>
                    </div>
                )}

                {useCamera ? (
                    <div>
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        {devices.length > 1 && (
                            <div className="mb-3">
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Select Camera</label>
                                <select
                                    value={selectedDeviceId}
                                    onChange={(e) => {
                                        stopCamera();
                                        setSelectedDeviceId(e.target.value);
                                        // Effect will restart camera
                                    }}
                                    className="w-full text-sm border-gray-300 rounded-lg"
                                >
                                    {devices.map(device => (
                                        <option key={device.deviceId} value={device.deviceId}>
                                            {device.label || `Camera ${device.deviceId.slice(0, 5)}...`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-4 ring-1 ring-black/10">
                            <video ref={videoRef} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 border-2 border-blue-500/50 rounded-lg pointer-events-none">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-32 border-2 border-white/80 rounded corner-box shadow-2xl"></div>
                            </div>
                            <div className="absolute bottom-2 left-0 right-0 text-center">
                                <p className="text-white/80 text-xs font-medium bg-black/50 inline-block px-2 py-1 rounded">Align barcode within frame</p>
                            </div>
                        </div>

                        {!scanning && (
                            <button
                                onClick={() => setScanning(true)}
                                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Start Scanning
                            </button>
                        )}
                    </div>
                ) : (
                    // Manual Entry
                    <form onSubmit={handleManualSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Enter Barcode
                            </label>
                            <input
                                type="text"
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                placeholder="Enter barcode number"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                autoFocus
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!manualCode.trim()}
                            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            Search Product
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
