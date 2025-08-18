'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { BarcodeScanner } from '@/components/Scanner/Scanner';

interface ScannerContextType {
  isScannerOpen: boolean;
  openScanner: (onScan: (code: string) => void) => void;
  closeScanner: () => void;
  ScannerComponent: ReactNode;
}

const ScannerContext = createContext<ScannerContextType | undefined>(undefined);

export function ScannerProvider({ children }: { children: ReactNode }) {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [onScanCallback, setOnScanCallback] = useState<((code: string) => void) | null>(null);

  const openScanner = useCallback((onScan: (code: string) => void) => {
    setOnScanCallback(() => onScan);
    setIsScannerOpen(true);
  }, []);

  const closeScanner = useCallback(() => {
    setIsScannerOpen(false);
    // Small delay to allow the scanner to fully close before removing the callback
    setTimeout(() => setOnScanCallback(null), 300);
  }, []);

  const handleScan = useCallback((code: string) => {
    if (onScanCallback) {
      onScanCallback(code);
    }
  }, [onScanCallback]);

  const handleError = useCallback((error: Error) => {
    console.error('Scanner error:', error);
    // You could add a toast notification here
  }, []);

  const ScannerComponent = isScannerOpen ? (
    <BarcodeScanner 
      onScan={handleScan}
      onError={handleError}
      onClose={closeScanner}
      showScanner={isScannerOpen}
    />
  ) : null;

  return (
    <ScannerContext.Provider 
      value={{ 
        isScannerOpen, 
        openScanner, 
        closeScanner,
        ScannerComponent
      }}
    >
      {children}
      {ScannerComponent}
    </ScannerContext.Provider>
  );
}

export function useScanner() {
  const context = useContext(ScannerContext);
  if (context === undefined) {
    throw new Error('useScanner must be used within a ScannerProvider');
  }
  return context;
}
