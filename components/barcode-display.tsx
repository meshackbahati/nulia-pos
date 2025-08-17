"use client"

import React from 'react';
import JsBarcodeComponent from './JsBarcode';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface BarcodeDisplayProps {
  product: {
    name: string;
    price: number;
    barcode: string;
    quantity: number;
    currency?: string;
  };
}

// Basic styling for the print layout
const printStyles = `
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
    }
    .no-print {
      display: none;
    }
    @page {
      size: auto;
      margin: 0.5cm;
    }
  }
`;

const BarcodeDisplay: React.FC<BarcodeDisplayProps> = ({ product }) => {
  if (!product) return null;

  const labels = Array.from({ length: product.quantity }, (_, i) => i);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <style>{printStyles}</style>
      <div className="flex justify-between items-center mb-4 no-print">
        <h2 className="text-lg font-bold">Print Barcode Labels for: {product.name}</h2>
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print {product.quantity} Labels
        </Button>
      </div>
      <div className="printable-area p-4 border rounded-lg">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {labels.map((_, index) => (
            <div key={index} className="border p-2 rounded-md text-center break-words">
              <p className="font-bold text-sm truncate">{product.name}</p>
              <JsBarcodeComponent
                value={product.barcode}
                options={{
                  width: 1.5,
                  height: 40,
                  fontSize: 12,
                  margin: 4,
                }}
              />
              <p className="font-semibold text-xs">
                {new Intl.NumberFormat("en-UG", {
                  style: "currency",
                  currency: product.currency || "UGX",
                }).format(product.price)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BarcodeDisplay;
