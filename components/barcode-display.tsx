"use client"

import React, { useState } from 'react';
import JsBarcodeComponent from './JsBarcode';
import { Button } from '@/components/ui/button';
import { Printer, Settings } from 'lucide-react';
import { BarcodeSettings } from './barcode/BarcodeSettings';
import { PAPER_SIZES, mmToPx } from '@/config/barcode-print';

interface BarcodeDisplayProps {
  product: {
    name: string;
    price: number;
    barcode: string;
    quantity: number;
    currency?: string;
  };
}

type BarcodeSettingsType = {
  paperSize: typeof PAPER_SIZES[0];
  customWidth: number;
  customHeight: number;
  copiesPerPage: number;
  showPrice: boolean;
  showName: boolean;
};

// Styling for the print layout with page breaks and proper spacing
const printStyles = `
  /* Screen styles */
  .preview-container {
    max-height: 60vh;
    overflow-y: auto;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 1rem;
    margin: 1rem 0;
  }

  .barcode-grid {
    display: grid;
    gap: 0.5rem;
    padding: 0.5rem;
  }

  .barcode-item {
    border: 1px solid #e2e8f0;
    padding: 0.5rem;
    border-radius: 0.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: white;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .barcode-item p {
    margin: 0.15rem 0;
    font-size: 0.75rem;
    line-height: 1.1;
    text-align: center;
    word-break: break-word;
    max-width: 100%;
  }

  /* Print styles */
  @page {
    size: 8.5in 11in; /* Letter size */
    margin: 0.5cm;
  }

  @media print {
    body * {
      visibility: hidden;
    }
    
    .printable-area, .printable-area * {
      visibility: visible;
    }
    
    .printable-area {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      padding: 0;
      margin: 0;
    }
    
    .barcode-page {
      page-break-after: always;
      page-break-inside: avoid;
      height: 100%;
      width: 100%;
      padding: 0.5cm;
      box-sizing: border-box;
    }
    
    .barcode-page:last-child {
      page-break-after: auto;
    }
    
    .barcode-grid {
      display: grid;
      gap: 0.5cm;
      width: 100%;
      height: 100%;
      page-break-inside: avoid;
    }
    
    .barcode-item {
      border: 1px solid #eee;
      padding: 0.25cm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      height: 100%;
      box-sizing: border-box;
      page-break-inside: avoid;
      break-inside: avoid;
      background: white;
    }
    
    .barcode-item p {
      margin: 0.1cm 0;
      font-size: 10px;
      line-height: 1.1;
    }
    
    .no-print, .preview-container {
      display: none !important;
    }
  }
`;

const BarcodeDisplay: React.FC<BarcodeDisplayProps> = ({ product }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<BarcodeSettingsType>({
    paperSize: PAPER_SIZES[0],
    customWidth: 50,
    customHeight: 30,
    copiesPerPage: 1,
    showPrice: true,
    showName: true
  });

  if (!product) return null;

  // Calculate dimensions based on selected paper size
  const currentSize = settings.paperSize.id === 'custom'
    ? { 
        ...settings.paperSize, 
        width: settings.customWidth, 
        height: settings.customHeight,
        barcodeWidth: 0.8,
        barcodeHeight: settings.customHeight * 0.3
      }
    : settings.paperSize;

  // Calculate layout
  const mmToInches = (mm: number) => mm / 25.4;
  const pageWidthInches = 8.5; // A4 width in inches
  const pageHeightInches = 11; // A4 height in inches
  const marginInches = 0.2; // 0.2 inches margin
  
  const barcodesPerRow = Math.max(1, Math.floor(
    (pageWidthInches * 25.4 - marginInches * 25.4 * 2) / currentSize.width
  ));
  
  const barcodesPerColumn = Math.max(1, Math.floor(
    (pageHeightInches * 25.4 - marginInches * 25.4 * 2) / currentSize.height
  ));
  
  const barcodesPerPage = barcodesPerRow * barcodesPerColumn * settings.copiesPerPage;
  const totalPages = Math.ceil(product.quantity / barcodesPerPage);
  
  // Create pages with barcodes
  const pages = Array.from({ length: totalPages }, (_, pageIndex) => {
    const start = pageIndex * barcodesPerPage;
    const end = Math.min(start + barcodesPerPage, product.quantity);
    return Array.from({ length: end - start }, (_, i) => start + i);
  });

  const handlePrint = () => {
    const printableArea = document.querySelector('.printable-area') as HTMLElement;
    if (printableArea) {
      printableArea.style.display = 'block';
      setTimeout(() => {
        window.print();
        setTimeout(() => {
          if (printableArea) printableArea.style.display = 'none';
        }, 100);
      }, 100);
    } else {
      window.print();
    }
  };

  const handleSettingsChange = (updates: Partial<BarcodeSettingsType>) => {
    setSettings(prev => ({
      ...prev,
      ...updates
    }));
  };

  // Calculate preview grid columns based on available width
  const previewColumns = Math.max(1, Math.min(4, Math.floor(window.innerWidth / 200)));
  const previewCount = Math.min(12, product.quantity);

  return (
    <div>
      <style>{printStyles}</style>
      
      {/* Settings Panel */}
      {isSettingsOpen && (
        <BarcodeSettings 
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
      
      <div className="flex justify-between items-center mb-4 no-print">
        <h2 className="text-lg font-bold">Print Barcode Labels for: {product.name}</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Layout Settings
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print {product.quantity} Labels
          </Button>
        </div>
      </div>

      {/* Preview */}
      <div className="no-print">
        <div className="preview-container">
          <p className="text-sm text-muted-foreground mb-2">
            Preview (showing first {previewCount} of {product.quantity} barcodes)
          </p>
          <div 
            className="barcode-grid"
            style={{
              gridTemplateColumns: `repeat(${previewColumns}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: previewCount }, (_, index) => (
              <div 
                key={`preview-${index}`} 
                className="barcode-item"
                style={{
                  minHeight: `${mmToPx(currentSize.height)}px`,
                }}
              >
                {settings.showName && (
                  <p className="font-bold text-sm truncate w-full">
                    {product.name}
                  </p>
                )}
                <JsBarcodeComponent
                  value={product.barcode}
                  options={{
                    width: currentSize.barcodeWidth || 0.8,
                    height: currentSize.barcodeHeight || 20,
                    fontSize: Math.max(8, (currentSize.height || 30) * 0.25),
                    margin: 2,
                    displayValue: true,
                  }}
                />
                {settings.showPrice && (
                  <p className="font-semibold text-xs mt-1">
                    {new Intl.NumberFormat("en-UG", {
                      style: "currency",
                      currency: product.currency || "UGX",
                    }).format(product.price)}
                  </p>
                )}
              </div>
            ))}
            {product.quantity > previewCount && (
              <div className="barcode-item flex items-center justify-center bg-gray-50">
                <p className="text-sm text-muted-foreground text-center">
                  + {product.quantity - previewCount} more barcodes will be included in print
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Printable Area (hidden until print) */}
      <div className="printable-area" style={{ display: 'none' }}>
        {pages.map((pageBarcodes, pageIndex) => (
          <div key={`page-${pageIndex}`} className="barcode-page">
            <div 
              className="barcode-grid"
              style={{
                gridTemplateColumns: `repeat(${barcodesPerRow}, minmax(0, 1fr))`,
                gridAutoRows: `${mmToPx(currentSize.height)}px`,
              }}
            >
              {pageBarcodes.map((barcodeIndex) => (
                <div key={`print-${barcodeIndex}`} className="barcode-item">
                  {settings.showName && (
                    <p className="font-bold text-sm">
                      {product.name}
                    </p>
                  )}
                  <JsBarcodeComponent
                    value={product.barcode}
                    options={{
                      width: currentSize.barcodeWidth || 0.8,
                      height: currentSize.barcodeHeight || 20,
                      fontSize: Math.max(8, (currentSize.height || 30) * 0.25),
                      margin: 2,
                      displayValue: true,
                    }}
                  />
                  {settings.showPrice && (
                    <p className="font-semibold text-xs mt-1">
                      {new Intl.NumberFormat("en-UG", {
                        style: "currency",
                        currency: product.currency || "UGX",
                      }).format(product.price)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BarcodeDisplay;
