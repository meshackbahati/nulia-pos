import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { createScanResult, BarcodeScanResult, BarcodeSource } from '@/lib/barcode-utils';
import { ScannerEnvConfig, SUPPORTED_FORMATS } from './config';
import { captureError } from '@/lib/error-handling/errorTracker';

type ScannerType = 'network' | 'usb' | 'camera' | 'manual';

interface ScannerEvent {
  scan: (result: BarcodeScanResult) => void;
  error: (error: Error) => void;
  connect: (scannerType: ScannerType) => void;
  disconnect: (scannerType: ScannerType) => void;
}

export class ScannerService extends EventEmitter {
  private static instance: ScannerService;
  private wsServer: WebSocket.Server | null = null;
  private config: ScannerEnvConfig;
  private isInitialized = false;
  private activeScanners = new Set<ScannerType>();
  private lastScannedCode: string | null = null;
  private lastScanTime = 0;
  private duplicateWindow: number;

  private constructor(config: ScannerEnvConfig) {
    super();
    this.config = config;
    this.duplicateWindow = 2000; // 2 seconds
  }

  public static getInstance(config: ScannerEnvConfig): ScannerService {
    if (!ScannerService.instance) {
      ScannerService.instance = new ScannerService(config);
    }
    return ScannerService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (this.config.NETWORK_SCANNER_ENABLED) {
        await this.initializeNetworkScanner();
      }

      if (this.config.USB_SCANNER_ENABLED) {
        await this.initializeUsbScanner();
      }

      this.isInitialized = true;
      console.log('Scanner service initialized');
    } catch (error) {
      captureError(error as Error, { context: 'ScannerService.initialize' });
      throw error;
    }
  }

  private async initializeNetworkScanner(): Promise<void> {
    if (this.wsServer) return;

    try {
      this.wsServer = new WebSocket.Server({
        port: this.config.NETWORK_SCANNER_PORT,
        verifyClient: this.verifyClient.bind(this)
      });

      this.wsServer.on('connection', (ws) => {
        console.log('Network scanner connected');
        this.activeScanners.add('network');
        this.emit('connect', 'network');

        ws.on('message', (data) => this.handleScan(data.toString(), 'network'));
        
        ws.on('close', () => {
          console.log('Network scanner disconnected');
          this.activeScanners.delete('network');
          this.emit('disconnect', 'network');
        });
      });

      console.log(`Network scanner listening on port ${this.config.NETWORK_SCANNER_PORT}`);
    } catch (error) {
      captureError(error as Error, { context: 'initializeNetworkScanner' });
      throw new Error('Failed to initialize network scanner');
    }
  }

  private async initializeUsbScanner(): Promise<void> {
    try {
      if (typeof window === 'undefined') return;
      
      // Request USB device access
      const device = await navigator.usb.requestDevice({
        filters: [
          { classCode: 0x03 }, // HID class
          { classCode: 0x08 }  // Mass storage class (some scanners use this)
        ]
      });

      await device.open();
      this.activeScanners.add('usb');
      this.emit('connect', 'usb');

      // Set up event listeners for USB input
      device.addEventListener('inputreport', (event) => {
        const data = new Uint8Array((event as any).data.buffer);
        const barcode = this.decodeUsbInput(data);
        if (barcode) {
          this.handleScan(barcode, 'usb');
        }
      });

      console.log('USB scanner connected:', device.productName);
    } catch (error) {
      if ((error as Error).name !== 'NotFoundError') {
        captureError(error as Error, { context: 'initializeUsbScanner' });
        throw new Error('Failed to initialize USB scanner');
      }
    }
  }

  private verifyClient(info: { origin: string; secure: boolean; req: any }): boolean {
    if (!this.config.NETWORK_SCANNER_SECRET) return true;
    
    const token = info.req.headers['x-scanner-token'];
    return token === this.config.NETWORK_SCANNER_SECRET;
  }

  private decodeUsbInput(data: Uint8Array): string | null {
    // Convert USB HID data to string (implementation depends on scanner model)
    // This is a basic implementation that may need adjustment for specific scanners
    try {
      // Skip non-printable characters and convert to string
      const chars = Array.from(data)
        .filter(byte => byte >= 32 && byte <= 126) // Only printable ASCII
        .map(byte => String.fromCharCode(byte));
      
      return chars.join('').trim() || null;
    } catch (error) {
      captureError(error as Error, { context: 'decodeUsbInput' });
      return null;
    }
  }

  private handleScan(barcode: string, source: BarcodeSource): void {
    const now = Date.now();
    
    // Skip if this is a duplicate scan within the duplicate window
    if (barcode === this.lastScannedCode && (now - this.lastScanTime) < this.duplicateWindow) {
      return;
    }

    this.lastScannedCode = barcode;
    this.lastScanTime = now;

    // Create scan result
    const result = createScanResult(barcode, source);
    
    // Emit scan event
    this.emit('scan', result);

    // Provide haptic feedback if enabled
    if (this.config.SCANNER_VIBRATE_ON_SCAN && 'vibrate' in navigator) {
      navigator.vibrate(100);
    }
  }

  public manualScan(barcode: string): void {
    this.handleScan(barcode, 'manual');
  }

  public getActiveScanners(): ScannerType[] {
    return Array.from(this.activeScanners);
  }

  public async cleanup(): Promise<void> {
    if (this.wsServer) {
      this.wsServer.close();
      this.wsServer = null;
    }
    
    this.activeScanners.clear();
    this.isInitialized = false;
  }
}

// Export a singleton instance
export const scannerService = ScannerService.getInstance(
  require('@/lib/scanner/config').defaultScannerConfig
);

// Type-safe event emitter
interface ScannerEvent {
  scan: (result: BarcodeScanResult) => void;
  error: (error: Error) => void;
  connect: (scannerType: ScannerType) => void;
  disconnect: (scannerType: ScannerType) => void;
}

type ScannerEventEmitter = {
  on<E extends keyof ScannerEvent>(
    event: E,
    listener: ScannerEvent[E]
  ): void;
  off<E extends keyof ScannerEvent>(
    event: E,
    listener: ScannerEvent[E]
  ): void;
  emit<E extends keyof ScannerEvent>(
    event: E,
    ...args: Parameters<ScannerEvent[E]>
  ): boolean;
};

export const scannerEvents = new EventEmitter() as ScannerEventEmitter;
