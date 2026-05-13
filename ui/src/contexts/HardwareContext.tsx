import React, { createContext, useContext, useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { BleClient } from '@capacitor-community/bluetooth-le';
import toast from 'react-hot-toast';

interface PrinterDevice {
    name: string;
    address?: string; // MAC or IP
    type: 'usb' | 'bluetooth' | 'network';
    displayName?: string;
}

interface HardwareContextType {
    defaultPrinter: string | null;
    bluetoothPrinter: PrinterDevice | null;
    networkPrinter: PrinterDevice | null;
    paperSize: '58mm' | '80mm';
    isElectron: boolean;
    isMobile: boolean;
    handheldMode: boolean;
    setDefaultPrinter: (name: string) => void;
    setBluetoothPrinter: (printer: PrinterDevice | null) => void;
    setNetworkPrinter: (printer: PrinterDevice | null) => void;
    setPaperSize: (size: '58mm' | '80mm') => void;
    setHandheldMode: (enabled: boolean) => void;
    discoverPrinters: () => Promise<PrinterDevice[]>;
}

const HardwareContext = createContext<HardwareContextType | undefined>(undefined);

export function HardwareProvider({ children }: { children: React.ReactNode }) {
    const isElectron = !!(window as any).electronAPI;
    const isMobile = Capacitor.isNativePlatform();

    const [defaultPrinter, setDefaultPrinterState] = useState<string | null>(localStorage.getItem('defaultPrinter'));
    const [bluetoothPrinter, setBluetoothPrinterState] = useState<PrinterDevice | null>(() => {
        const saved = localStorage.getItem('bluetoothPrinter');
        return saved ? JSON.parse(saved) : null;
    });
    const [networkPrinter, setNetworkPrinterState] = useState<PrinterDevice | null>(() => {
        const saved = localStorage.getItem('networkPrinter');
        return saved ? JSON.parse(saved) : null;
    });
    const [paperSize, setPaperSizeState] = useState<'58mm' | '80mm'>(
        (localStorage.getItem('receiptPaperSize') as '58mm' | '80mm') || '80mm'
    );
    const [handheldMode, setHandheldModeState] = useState<boolean>(
        localStorage.getItem('handheldMode') === 'true'
    );

    useEffect(() => {
        if (isMobile) {
            BleClient.initialize().catch(err => console.warn('BLE not available:', err));
        }
    }, [isMobile]);

    const setDefaultPrinter = (name: string) => {
        setDefaultPrinterState(name);
        localStorage.setItem('defaultPrinter', name);
    };

    const setBluetoothPrinter = (printer: PrinterDevice | null) => {
        setBluetoothPrinterState(printer);
        if (printer) localStorage.setItem('bluetoothPrinter', JSON.stringify(printer));
        else localStorage.removeItem('bluetoothPrinter');
    };

    const setNetworkPrinter = (printer: PrinterDevice | null) => {
        setNetworkPrinterState(printer);
        if (printer) localStorage.setItem('networkPrinter', JSON.stringify(printer));
        else localStorage.removeItem('networkPrinter');
    };

    const setPaperSize = (size: '58mm' | '80mm') => {
        setPaperSizeState(size);
        localStorage.setItem('receiptPaperSize', size);
    };

    const setHandheldMode = (enabled: boolean) => {
        setHandheldModeState(enabled);
        localStorage.setItem('handheldMode', String(enabled));
    };

    const discoverPrinters = async (): Promise<PrinterDevice[]> => {
        if (isElectron) {
            try {
                const list = await (window as any).electronAPI.getPrinters();
                return list.map((p: any) => ({
                    name: p.name,
                    type: 'usb',
                    displayName: p.name
                }));
            } catch (err) {
                console.error('Electron printer discovery failed:', err);
                return [];
            }
        }
        
        if (isMobile) {
            try {
                const devices: PrinterDevice[] = [];
                
                // Scan for Bluetooth Thermal Printers
                await BleClient.requestLEScan(
                    {
                        // Some common printer service UUIDs if known, else scan all
                        // services: ['000018f0-0000-1000-8000-00805f9b34fb'] 
                    },
                    (result) => {
                        if (result.device.name?.toLowerCase().includes('printer') || 
                            result.device.name?.toLowerCase().includes('pos')) {
                            devices.push({
                                name: result.device.name,
                                address: result.device.deviceId,
                                type: 'bluetooth',
                                displayName: result.device.name
                            });
                        }
                    }
                );

                // Stop scan after 5 seconds
                await new Promise(resolve => setTimeout(resolve, 5000));
                await BleClient.stopLEScan();
                
                return Array.from(new Map(devices.map(d => [d.address, d])).values());
            } catch (err) {
                console.error('Mobile printer discovery failed:', err);
                toast.error('Bluetooth Scan failed');
                return [];
            }
        }

        return [];
    };

    return (
        <HardwareContext.Provider value={{
            defaultPrinter,
            bluetoothPrinter,
            networkPrinter,
            paperSize,
            isElectron,
            isMobile,
            handheldMode,
            setDefaultPrinter,
            setBluetoothPrinter,
            setNetworkPrinter,
            setPaperSize,
            setHandheldMode,
            discoverPrinters
        }}>
            {children}
        </HardwareContext.Provider>
    );
}

export function useHardware() {
    const context = useContext(HardwareContext);
    if (context === undefined) {
        throw new Error('useHardware must be used within a HardwareProvider');
    }
    return context;
}
