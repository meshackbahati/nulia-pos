// Paper size presets (width x height in mm)
export const PAPER_SIZES = [
  { id: 'ticker', name: 'Ticker Tape (100x30mm)', width: 100, height: 30, barcodeWidth: 0.8, barcodeHeight: 15 },
  { id: 'small', name: 'Small (50x30mm)', width: 50, height: 30, barcodeWidth: 0.6, barcodeHeight: 12 },
  { id: 'a8', name: 'A8 (52x74mm)', width: 52, height: 74, barcodeWidth: 1, barcodeHeight: 25 },
  { id: 'a7', name: 'A7 (74x105mm)', width: 74, height: 105, barcodeWidth: 1.2, barcodeHeight: 35 },
  { id: 'a6', name: 'A6 (105x148mm)', width: 105, height: 148, barcodeWidth: 1.5, barcodeHeight: 50 },
  { id: 'a5', name: 'A5 (148x210mm)', width: 148, height: 210, barcodeWidth: 2, barcodeHeight: 60 },
  { id: 'custom', name: 'Custom', width: 0, height: 0, barcodeWidth: 1, barcodeHeight: 30 },
];

// Default barcode settings
export const DEFAULT_BARCODE_OPTIONS = {
  format: 'CODE128',
  width: 1.5,
  height: 50,
  displayValue: true,
  margin: 5,
  fontSize: 10,
  background: '#ffffff',
  lineColor: '#000000',
};

// Convert mm to pixels (1mm = 3.78px at 96dpi)
export const mmToPx = (mm: number) => mm * 3.78;
