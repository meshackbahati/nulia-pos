'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { scannerService, scannerEvents } from '@/lib/scanner/scanner-service';
import { BarcodeScanResult, BarcodeSource } from '@/lib/barcode-utils';
import { toast } from '@/components/ui/use-toast';

interface UseScannerOptions {
  /** Callback when a barcode is scanned */
  onScan?: (result: BarcodeScanResult) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
  /** Enable/disable scanner sounds */
  soundEnabled?: boolean;
  /** Enable/disable haptic feedback */
  hapticFeedback?: boolean;
  /** Show toast notifications */
  showNotifications?: boolean;
  /** Auto-connect to available scanners */
  autoConnect?: boolean;
}

export function useScanner({
  onScan,
  onError,
  soundEnabled = true,
  hapticFeedback = true,
  showNotifications = true,
  autoConnect = true,
}: UseScannerOptions = {}) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [activeScanners, setActiveScanners] = useState<BarcodeSource[]>([]);
  const [lastScan, setLastScan] = useState<BarcodeScanResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);

  // Handle scan results
  const handleScan = useCallback((result: BarcodeScanResult) => {
    if (!isMounted.current) return;
    
    setLastScan(result);
    setError(null);
    
    // Play scan sound if enabled
    if (soundEnabled) {
      playScanSound();
    }
    
    // Call the provided onScan callback
    if (onScan) {
      onScan(result);
    }
    
    // Show toast notification
    if (showNotifications) {
      toast({
        title: 'Scanned',
        description: `Scanned: ${result.code} (${result.format})`,
        variant: 'default',
      });
    }
  }, [onScan, showNotifications, soundEnabled]);

  // Handle errors
  const handleError = useCallback((error: Error) => {
    if (!isMounted.current) return;
    
    console.error('Scanner error:', error);
    setError(error);
    
    // Call the provided onError callback
    if (onError) {
      onError(error);
    }
    
    // Show error toast
    if (showNotifications) {
      toast({
        title: 'Scanner Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [onError, showNotifications]);

  // Initialize the scanner service
  const initialize = useCallback(async () => {
    try {
      setIsScanning(true);
      await scannerService.initialize();
      setIsInitialized(true);
      
      // Set up event listeners
      scannerEvents.on('scan', handleScan);
      scannerEvents.on('error', handleError);
      scannerEvents.on('connect', (source: BarcodeSource) => {
        setActiveScanners(prev => [...new Set([...prev, source])]);
      });
      scannerEvents.on('disconnect', (source: BarcodeSource) => {
        setActiveScanners(prev => prev.filter(s => s !== source));
      });
      
      return () => {
        scannerEvents.off('scan', handleScan);
        scannerEvents.off('error', handleError);
      };
    } catch (error) {
      handleError(error as Error);
      throw error;
    } finally {
      if (isMounted.current) {
        setIsScanning(false);
      }
    }
  }, [handleScan, handleError]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      scannerEvents.off('scan', handleScan);
      scannerEvents.off('error', handleError);
    };
  }, [handleScan, handleError]);

  // Auto-connect if enabled
  useEffect(() => {
    if (autoConnect && !isInitialized) {
      initialize().catch(console.error);
    }
  }, [autoConnect, initialize, isInitialized]);

  // Manual scan function
  const manualScan = useCallback((barcode: string, source: BarcodeSource = 'manual') => {
    scannerService.manualScan(barcode);
  }, []);

  return {
    // State
    isInitialized,
    isScanning,
    activeScanners,
    lastScan,
    error,
    
    // Methods
    initialize,
    manualScan,
    startScanning: () => setIsScanning(true),
    stopScanning: () => setIsScanning(false),
  };
}

// Play a scan sound
export function playScanSound() {
  try {
    const audio = new Audio('/sounds/scan-beep.mp3');
    audio.play().catch(() => {
      // Fallback to simple beep if audio file fails
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 1000;
      gainNode.gain.value = 0.1;
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.start();
      setTimeout(() => oscillator.stop(), 100);
    });
  } catch (error) {
    console.error('Failed to play scan sound:', error);
  }
}

// Hook for manual scanning
export function useManualScanner(onScan?: (result: BarcodeScanResult) => void) {
  const [lastScan, setLastScan] = useState<BarcodeScanResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  const scan = useCallback((barcode: string, source: BarcodeSource = 'manual') => {
    try {
      const result = {
        code: barcode.trim(),
        format: 'unknown' as const,
        timestamp: Date.now(),
        isValid: true,
        source,
        rawData: {},
      };
      
      setLastScan(result);
      setError(null);
      
      if (onScan) {
        onScan(result);
      }
      
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to process barcode');
      setError(err);
      throw err;
    }
  }, [onScan]);
  
  return { scan, lastScan, error };
}
