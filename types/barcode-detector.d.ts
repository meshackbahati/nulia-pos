// Type definitions for the Barcode Detection API
// https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API

type BarcodeFormat =
  | 'aztec'
  | 'code_128'
  | 'code_39'
  | 'code_93'
  | 'codabar'
  | 'data_matrix'
  | 'ean_13'
  | 'ean_8'
  | 'itf'
  | 'pdf417'
  | 'qr_code'
  | 'upc_a'
  | 'upc_e';

interface BarcodeDetectorOptions {
  formats?: BarcodeFormat[];
}

interface DetectedBarcode {
  boundingBox: DOMRectReadOnly;
  cornerPoints: { x: number; y: number }[];
  format: BarcodeFormat;
  rawValue: string;
}

declare class BarcodeDetector {
  constructor(barcodeDetectorOptions?: BarcodeDetectorOptions);
  
  static getSupportedFormats(): Promise<BarcodeFormat[]>;
  
  detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

interface Window {
  BarcodeDetector: typeof BarcodeDetector;
}

declare const BarcodeDetector: {
  prototype: BarcodeDetector;
  new(barcodeDetectorOptions?: BarcodeDetectorOptions): BarcodeDetector;
  getSupportedFormats(): Promise<BarcodeFormat[]>;
};
