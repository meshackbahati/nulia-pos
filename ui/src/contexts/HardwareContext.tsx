import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { BleClient } from '@capacitor-community/bluetooth-le';
import EscPosEncoder from 'esc-pos-encoder';
import toast from 'react-hot-toast';
import { printViaTcp } from '../plugins/tcp-printer';

interface PrinterDevice {
    name: string;
    address?: string;
    port?: number;
    type: 'usb' | 'bluetooth' | 'network';
    displayName?: string;
}

interface ReceiptData {
    companyName: string;
    receiptId: string;
    items: Array<{ name: string; quantity: number; price: number; total: number }>;
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod: string;
    date: string;
    cashierName?: string;
}

export type PaperSize = '58mm' | '78mm' | '80mm';

export function paperSizeWidth(size: PaperSize): number {
    if (size === '58mm') return 58;
    if (size === '78mm') return 78;
    return 80;
}

export function paperSizeChars(size: PaperSize): number {
    if (size === '58mm') return 32;
    if (size === '78mm') return 44;
    return 46;
}

interface HardwareContextType {
    defaultPrinter: string | null;
    bluetoothPrinter: PrinterDevice | null;
    networkPrinter: PrinterDevice | null;
    paperSize: PaperSize;
    isElectron: boolean;
    isMobile: boolean;
    handheldMode: boolean;
    setDefaultPrinter: (name: string) => void;
    setBluetoothPrinter: (printer: PrinterDevice | null) => void;
    setNetworkPrinter: (printer: PrinterDevice | null) => void;
    setPaperSize: (size: PaperSize) => void;
    setHandheldMode: (enabled: boolean) => void;
    discoverPrinters: () => Promise<PrinterDevice[]>;
    requestWebUsbPrinter: () => Promise<PrinterDevice | null>;
    requestWebBluetoothPrinter: () => Promise<PrinterDevice | null>;
    printToWebDevice: (html: string) => Promise<{ success: boolean; error?: string }>;
    printReceipt: (receiptData: ReceiptData) => Promise<{ success: boolean; error?: string }>;
    testPrinter: (type: 'network' | 'bluetooth' | 'usb', address?: string, port?: number) => Promise<boolean>;
    generateEscPosData: (receiptData: ReceiptData) => Promise<string>;
}

const HardwareContext = createContext<HardwareContextType | undefined>(undefined);

function generateEscPosBytes(receiptData: ReceiptData, _paperSize: PaperSize): Uint8Array {
    const encoder = new EscPosEncoder();

    encoder.initialize();
    encoder.align('center');
    encoder.size(1, 1);
    encoder.font('A');

    encoder.bold(true);
    encoder.text(receiptData.companyName);
    encoder.newline();

    encoder.bold(false);
    encoder.text('OFFICIAL TRANSACTION RECORD');
    encoder.newline();
    encoder.newline();

    encoder.align('left');
    encoder.bold(true);
    if (receiptData.cashierName) {
        encoder.text(`Cashier: ${receiptData.cashierName}`);
        encoder.newline();
    }
    encoder.text(`Receipt: ${receiptData.receiptId}`);
    encoder.newline();
    encoder.text(`Date: ${receiptData.date}`);
    encoder.newline();
    encoder.text(`Method: ${receiptData.paymentMethod.toUpperCase()}`);
    encoder.newline();
    encoder.newline();

    encoder.bold(true);
    encoder.text('--------------------------------');
    encoder.newline();
    encoder.text('DESCRIPTION');
    encoder.text('        TOTAL');
    encoder.newline();
    encoder.text('--------------------------------');
    encoder.newline();
    encoder.bold(false);

    for (const item of receiptData.items) {
        const name = item.name.length > 22 ? item.name.substring(0, 19) + '...' : item.name;
        const line = `${item.quantity}x ${name}`;
        const priceStr = `${item.total.toFixed(2)}`;
        const padding = Math.max(1, 32 - line.length - priceStr.length);
        encoder.text(line + ' '.repeat(padding) + priceStr);
        encoder.newline();
    }

    encoder.newline();
    encoder.text('--------------------------------');
    encoder.newline();

    encoder.align('right');
    encoder.text(`SUBTOTAL: ${receiptData.subtotal.toFixed(2)}`);
    encoder.newline();
    encoder.text(`TAX: ${receiptData.tax.toFixed(2)}`);
    encoder.newline();

    encoder.bold(true);
    encoder.text(`TOTAL: ${receiptData.total.toFixed(2)}`);
    encoder.newline();
    encoder.bold(false);

    encoder.newline();
    encoder.align('center');
    encoder.text('Thank you for visiting!');
    encoder.newline();
    encoder.text(receiptData.companyName);
    encoder.newline();
    encoder.newline();
    encoder.newline();

    encoder.cut('partial');

    return encoder.encode();
}

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
    const [paperSize, setPaperSizeState] = useState<PaperSize>(
        (localStorage.getItem('receiptPaperSize') as PaperSize) || '80mm'
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

    const setPaperSize = (size: PaperSize) => {
        setPaperSizeState(size);
        localStorage.setItem('receiptPaperSize', size);
    };

    const setHandheldMode = (enabled: boolean) => {
        setHandheldModeState(enabled);
        localStorage.setItem('handheldMode', String(enabled));
    };

    const generateEscPosData = useCallback(async (receiptData: ReceiptData): Promise<string> => {
        const bytes = generateEscPosBytes(receiptData, paperSize);
        const uint8 = new Uint8Array(bytes);
        let binary = '';
        for (let i = 0; i < uint8.length; i++) {
            binary += String.fromCharCode(uint8[i]);
        }
        return btoa(binary);
    }, [paperSize]);

    const isPrinterName = (name: string) => {
        const lower = name.toLowerCase();
        return lower.includes('printer') || lower.includes('pos') || lower.includes('thermal') || lower.includes('xprinter') || lower.includes('receipt') || lower.includes('star') || lower.includes('epson') || lower.includes('bixolon') || lower.includes('zjiang');
    };

    const discoverPrinters = async (): Promise<PrinterDevice[]> => {
        const devices: PrinterDevice[] = [];

        if (isElectron) {
            try {
                const list = await (window as any).electronAPI.getPrinters();
                list.map((p: any) => devices.push({
                    name: p.name,
                    type: 'usb' as const,
                    displayName: p.name
                }));
            } catch (err) {
                console.error('Electron system printer discovery failed:', err);
            }
        }

        if (isElectron || !isMobile) {
            try {
                if ((navigator as any).bluetooth && typeof (navigator as any).bluetooth.getDevices === 'function') {
                    const paired = await (navigator as any).bluetooth.getDevices();
                    for (const d of paired) {
                        if (isPrinterName(d.name || '')) {
                            devices.push({
                                name: d.name || 'BLE Printer',
                                address: d.id,
                                type: 'bluetooth',
                                displayName: d.name
                            });
                        }
                    }
                }
            } catch (err) {
                console.warn('Web Bluetooth getDevices failed:', err);
            }
        }

        if (isMobile) {
            try {
                await BleClient.requestLEScan({}, (result) => {
                    const name = result.device.name || '';
                    if (isPrinterName(name) && !devices.find(d => d.address === result.device.deviceId)) {
                        devices.push({
                            name,
                            address: result.device.deviceId,
                            type: 'bluetooth',
                            displayName: name
                        });
                    }
                });

                await new Promise(resolve => setTimeout(resolve, 5000));
                await BleClient.stopLEScan();
            } catch (err) {
                console.warn('BLE scan failed:', err);
            }
        }

        return Array.from(new Map(devices.map(d => [d.address || d.name, d])).values());
    };

    const requestWebUsbPrinter = async (): Promise<PrinterDevice | null> => {
        if (!(navigator as any).usb) {
            toast.error('WebUSB not supported in this browser');
            return null;
        }
        try {
            const device = await (navigator as any).usb.requestDevice({ filters: [] });
            const p: PrinterDevice = {
                name: device.productName || 'USB Printer',
                address: device.serialNumber,
                type: 'usb',
                displayName: device.productName
            };
            return p;
        } catch (err) {
            console.error('WebUSB request failed:', err);
            return null;
        }
    };

    const requestWebBluetoothPrinter = async (): Promise<PrinterDevice | null> => {
        if (!(navigator as any).bluetooth) {
            toast.error('Web Bluetooth not supported in this browser');
            return null;
        }
        try {
            const device = await (navigator as any).bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
            });
            const p: PrinterDevice = {
                name: device.name || 'BT Printer',
                address: device.id,
                type: 'bluetooth',
                displayName: device.name
            };
            return p;
        } catch (err) {
            console.error('Web Bluetooth request failed:', err);
            return null;
        }
    };

    const printReceipt = async (receiptData: ReceiptData): Promise<{ success: boolean; error?: string }> => {
        try {
            const escPosBase64 = await generateEscPosData(receiptData);

            if (networkPrinter) {
                return await printViaNetwork(networkPrinter.address!, networkPrinter.port || 9100, escPosBase64);
            }

            if (bluetoothPrinter) {
                return await printViaBluetooth(bluetoothPrinter, escPosBase64);
            }

            if (defaultPrinter) {
                if ((navigator as any).usb) {
                    return await printViaUsb(defaultPrinter, escPosBase64);
                }
                return { success: false, error: 'No USB printer available' };
            }

            return { success: false, error: 'No printer configured. Go to Settings > Printer Setup.' };
        } catch (err: any) {
            console.error('Print failed:', err);
            return { success: false, error: err.message };
        }
    };

    const printViaNetwork = async (ip: string, port: number, data: string): Promise<{ success: boolean; error?: string }> => {
        if (isMobile) {
            return await printViaTcp({ ip, data, port });
        }
        return { success: false, error: 'Network printing requires the mobile app or Electron. Use a configured USB/BLE printer instead.' };
    };

    const printViaBluetooth = async (printer: PrinterDevice, data: string): Promise<{ success: boolean; error?: string }> => {
        try {
            if (isMobile) {
                const bytes = base64ToBytes(data);
                await BleClient.write(
                    printer.address!,
                    '000018f0-0000-1000-8000-00805f9b34fb',
                    '00002af1-0000-1000-8000-00805f9b34fb',
                    new DataView(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
                );
                return { success: true };
            }

            if ((navigator as any).bluetooth) {
                const devices = await (navigator as any).bluetooth.getDevices();
                const device = devices.find((d: any) => d.id === printer.address);
                if (!device) throw new Error('Bluetooth device not found');

                if (!device.gatt.connected) await device.gatt.connect();
                const service = await device.gatt.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
                const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

                await characteristic.writeValue(base64ToBytes(data));
                return { success: true };
            }

            return { success: false, error: 'Bluetooth not available' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const printViaUsb = async (printerName: string, data: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const devices = await (navigator as any).usb.getDevices();
            const device = devices.find((d: any) => d.productName === printerName);
            if (!device) throw new Error('USB device not found');

            await device.open();
            await device.selectConfiguration(1);
            await device.claimInterface(0);

            await device.transferOut(1, base64ToBytes(data));
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const testPrinter = async (type: 'network' | 'bluetooth' | 'usb', address?: string, port?: number): Promise<boolean> => {
        const testData: ReceiptData = {
            companyName: 'TEST PRINT',
            receiptId: 'TEST-001',
            items: [{ name: 'Test Print', quantity: 1, price: 0, total: 0 }],
            subtotal: 0,
            tax: 0,
            total: 0,
            paymentMethod: 'test',
            date: new Date().toLocaleString(),
            cashierName: 'System Test'
        };

        const escPosBase64 = await generateEscPosData(testData);

        let result: { success: boolean; error?: string };

        if (type === 'network' && address) {
            result = await printViaNetwork(address, port || 9100, escPosBase64);
        } else if (type === 'bluetooth') {
            if (bluetoothPrinter) {
                result = await printViaBluetooth(bluetoothPrinter, escPosBase64);
            } else {
                result = { success: false, error: 'No bluetooth printer configured' };
            }
        } else if (type === 'usb') {
            if (defaultPrinter) {
                result = await printViaUsb(defaultPrinter, escPosBase64);
            } else {
                result = { success: false, error: 'No USB printer configured' };
            }
        } else {
            result = { success: false, error: 'Invalid printer type' };
        }

        return result.success;
    };

    const printToWebDevice = async (html: string): Promise<{ success: boolean; error?: string }> => {
        try {
            if (bluetoothPrinter && (navigator as any).bluetooth) {
                const devices = await (navigator as any).bluetooth.getDevices();
                const device = devices.find((d: any) => d.id === bluetoothPrinter.address);
                if (!device) throw new Error('Bluetooth device not found');

                if (!device.gatt.connected) await device.gatt.connect();
                const service = await device.gatt.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
                const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

                await characteristic.writeValue(new TextEncoder().encode('\x1b\x40\x1b\x61\x01RECEIPT\n\n' + html.replace(/<[^>]*>/g, '') + '\n\n\n\n'));
                return { success: true };
            }

            if (defaultPrinter && (navigator as any).usb && !isElectron) {
                const devices = await (navigator as any).usb.getDevices();
                const device = devices.find((d: any) => d.productName === defaultPrinter);
                if (!device) throw new Error('USB device not found');

                await device.open();
                await device.selectConfiguration(1);
                await device.claimInterface(0);

                await device.transferOut(1, new TextEncoder().encode('\x1b\x40\x1b\x61\x01RECEIPT\n\n' + html.replace(/<[^>]*>/g, '') + '\n\n\n\n'));
                return { success: true };
            }

            return { success: false, error: 'No web-paired printer available' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
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
            discoverPrinters,
            requestWebUsbPrinter,
            requestWebBluetoothPrinter,
            printToWebDevice,
            printReceipt,
            testPrinter,
            generateEscPosData
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

function base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
