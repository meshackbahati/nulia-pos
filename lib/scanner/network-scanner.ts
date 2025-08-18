import { BarcodeFormat } from '@/lib/barcode';

export interface NetworkScannerConfig {
  host: string;
  port: number;
  delimiter?: string;
  timeout?: number;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export class NetworkScanner {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private config: Required<NetworkScannerConfig>;
  private listeners: Array<(data: string, format: BarcodeFormat) => void> = [];
  private errorListeners: Array<(error: Error) => void> = [];
  private isConnected = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(config: NetworkScannerConfig) {
    this.config = {
      delimiter: '\r\n', // Common barcode scanner delimiter
      timeout: 5000,
      autoReconnect: true,
      reconnectInterval: 3000,
      ...config,
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = `ws://${this.config.host}:${this.config.port}`;
        this.socket = new WebSocket(url);

        const connectTimeout = setTimeout(() => {
          this.handleError(new Error('Connection timeout'));
          reject(new Error('Connection timeout'));
        }, this.config.timeout);

        this.socket.onopen = () => {
          clearTimeout(connectTimeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          console.log('Network scanner connected');
          resolve();
        };

        this.socket.onmessage = (event) => {
          const data = event.data.trim();
          if (data) {
            // Try to determine barcode format
            const format = this.detectBarcodeFormat(data);
            this.listeners.forEach(callback => callback(data, format));
          }
        };

        this.socket.onclose = () => {
          this.isConnected = false;
          console.log('Network scanner disconnected');
          this.handleReconnect();
        };

        this.socket.onerror = (error) => {
          clearTimeout(connectTimeout);
          this.handleError(new Error(`Network scanner error: ${error}`));
          reject(error);
        };
      } catch (error) {
        this.handleError(error instanceof Error ? error : new Error(String(error)));
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.isConnected = false;
  }

  onScan(callback: (data: string, format: BarcodeFormat) => void): void {
    this.listeners.push(callback);
  }

  onError(callback: (error: Error) => void): void {
    this.errorListeners.push(callback);
  }

  removeListener(callback: (data: string, format: BarcodeFormat) => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  private handleReconnect(): void {
    if (!this.config.autoReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.handleError(new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(() => {
        // Connection failed, will retry if needed
      });
    }, this.config.reconnectInterval);
  }

  private handleError(error: Error): void {
    console.error('Network scanner error:', error);
    this.errorListeners.forEach(callback => callback(error));
  }

  private detectBarcodeFormat(data: string): BarcodeFormat {
    // Simple format detection based on common patterns
    if (/^\d{12,14}$/.test(data)) return 'ean_13';
    if (/^\d{7,8}$/.test(data)) return 'ean_8';
    if (/^\d{12,13}$/.test(data)) return 'upc_a';
    if (/^[0-9A-Za-z]+$/.test(data)) return 'code_128';
    if (/^[0-9A-Z\-\$\.\/\+\%\s]+$/.test(data)) return 'code_39';
    return 'unknown';
  }

  get isActive(): boolean {
    return this.isConnected && this.socket?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const networkScanner = new NetworkScanner({
  host: process.env.NEXT_PUBLIC_SCANNER_HOST || 'localhost',
  port: parseInt(process.env.NEXT_PUBLIC_SCANNER_PORT || '8080', 10),
});
