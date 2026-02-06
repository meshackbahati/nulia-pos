import { useState, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { Camera, X, Barcode as BarcodeIcon } from 'lucide-react';

interface BarcodeScannerProps {
    onScan: (barcode: string) => void;
    onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState('');
    const [manualCode, setManualCode] = useState('');
    const [useCamera, setUseCamera] = useState(true);
    const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

    useEffect(() => {
        if (useCamera && scanning) {
            startCamera();
        }

        return () => {
            stopCamera();
        };
    }, [useCamera, scanning]);

    const startCamera = async () => {
        try {
            const codeReader = new BrowserMultiFormatReader();
            codeReaderRef.current = codeReader;

            const videoInputDevices = await codeReader.listVideoInputDevices();

            if (videoInputDevices.length === 0) {
                setError('No camera found');
                return;
            }

            const selectedDeviceId = videoInputDevices[0].deviceId;

            codeReader.decodeFromVideoDevice(
                selectedDeviceId,
                videoRef.current!,
                (result, error) => {
                    if (result) {
                        onScan(result.getText());
                        stopCamera();
                        onClose();
                    }
                    if (error && !(error instanceof NotFoundException)) {
                        console.error('Scanner error:', error);
                    }
                }
            );
        } catch (err: any) {
            setError(err.message || 'Failed to start camera');
            console.error('Camera error:', err);
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <BarcodeIcon className="w-6 h-6" />
                        Scan Barcode
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Mode Toggle */}
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => {
                            setUseCamera(true);
                            setScanning(true);
                        }}
                        className={`flex-1 py-2 px-4 rounded-lg transition-all ${useCamera
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        <Camera className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-sm">Camera</span>
                    </button>
                    <button
                        onClick={() => {
                            setUseCamera(false);
                            stopCamera();
                        }}
                        className={`flex-1 py-2 px-4 rounded-lg transition-all ${!useCamera
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        <BarcodeIcon className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-sm">Manual</span>
                    </button>
                </div>

                {/* Camera Scanner */}
                {useCamera ? (
                    <div>
                        {error ? (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                                <p className="text-red-700 text-sm">{error}</p>
                            </div>
                        ) : null}

                        <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4">
                            <video
                                ref={videoRef}
                                className="w-full h-full object-cover"
                                autoPlay
                                playsInline
                                muted
                            />
                            <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none">
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3/4 h-1/3 border-2 border-white/50"></div>
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
