import { registerPlugin, Capacitor } from '@capacitor/core';

export interface TcpPrinterPlugin {
    print(options: { ip: string; data: string; port?: number }): Promise<{ success: boolean; error?: string; connectTimeMs?: number; totalTimeMs?: number }>;
    testConnection(options: { ip: string; port?: number }): Promise<{ reachable: boolean; error?: string; connectTimeMs?: number }>;
}

const TcpPrinter = registerPlugin<TcpPrinterPlugin>('TcpPrinter');

export async function printViaTcp(options: { ip: string; data: string; port?: number }): Promise<{ success: boolean; error?: string; connectTimeMs?: number; totalTimeMs?: number }> {
    if (!Capacitor.isNativePlatform()) {
        return { success: false, error: 'TCP printing requires native platform' };
    }
    try {
        return await TcpPrinter.print(options);
    } catch (err: any) {
        return { success: false, error: err.message || 'TCP print failed' };
    }
}

export async function testTcpConnection(ip: string, port: number = 9100): Promise<{ reachable: boolean; error?: string; connectTimeMs?: number }> {
    if (!Capacitor.isNativePlatform()) {
        return { reachable: false, error: 'TCP test requires native platform' };
    }
    try {
        return await TcpPrinter.testConnection({ ip, port });
    } catch (err: any) {
        return { reachable: false, error: err.message || 'Connection test failed' };
    }
}
