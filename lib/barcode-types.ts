/**
 * Barcode format types and utilities
 */

export type BarcodeFormat = 
  | 'ean_13' 
  | 'ean_8' 
  | 'upc_a' 
  | 'upc_e' 
  | 'code_128' 
  | 'code_39' 
  | 'itf' 
  | 'qr_code' 
  | 'code_93' 
  | 'codabar' 
  | 'data_matrix' 
  | 'pdf417'
  | 'unknown';

export const BARCODE_FORMATS = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'itf',
  'qr_code',
  'code_93',
  'codabar',
  'data_matrix',
  'pdf417',
  'unknown'
] as const;

export function isValidBarcodeFormat(format: string): format is BarcodeFormat {
  return (BARCODE_FORMATS as readonly string[]).includes(format);
}

export interface BarcodeFormatConfig {
  name: string;
  minLength: number;
  maxLength: number;
  pattern: RegExp;
  checksum?: (code: string) => boolean;
}

export const BARCODE_FORMAT_CONFIGS: Record<BarcodeFormat, BarcodeFormatConfig> = {
  'ean_13': {
    name: 'EAN-13',
    minLength: 13,
    maxLength: 13,
    pattern: /^\d{13}$/,
    checksum: ean13Checksum
  },
  'ean_8': {
    name: 'EAN-8',
    minLength: 8,
    maxLength: 8,
    pattern: /^\d{8}$/,
    checksum: ean8Checksum
  },
  'upc_a': {
    name: 'UPC-A',
    minLength: 12,
    maxLength: 12,
    pattern: /^\d{12}$/,
    checksum: upcChecksum
  },
  'upc_e': {
    name: 'UPC-E',
    minLength: 8,
    maxLength: 8,
    pattern: /^[0-9]{8}$/
  },
  'code_128': {
    name: 'Code 128',
    minLength: 1,
    maxLength: 255,
    pattern: /^[\x00-\x7F]+$/
  },
  'code_39': {
    name: 'Code 39',
    minLength: 1,
    maxLength: 255,
    pattern: /^[0-9A-Z\-\ \.\$\/\+\%]+$/
  },
  'itf': {
    name: 'ITF-14',
    minLength: 14,
    maxLength: 14,
    pattern: /^\d{14}$/,
    checksum: itf14Checksum
  },
  'qr_code': {
    name: 'QR Code',
    minLength: 1,
    maxLength: 7089, // Maximum for QR Code 40-L
    pattern: /^[\x00-\x7F\x80-\xFF]+$/
  },
  'code_93': {
    name: 'Code 93',
    minLength: 1,
    maxLength: 255,
    pattern: /^[0-9A-Z\-\ \.\$\/\+\%]+$/
  },
  'codabar': {
    name: 'Codabar',
    minLength: 1,
    maxLength: 255,
    pattern: /^[0-9\-\$\(\)\.\/\+\:]+$/
  },
  'data_matrix': {
    name: 'Data Matrix',
    minLength: 1,
    maxLength: 3116, // Maximum for Data Matrix 144x144
    pattern: /^[\x00-\x7F\x80-\xFF]+$/
  },
  'pdf417': {
    name: 'PDF417',
    minLength: 1,
    maxLength: 1850, // Maximum for PDF417
    pattern: /^[\x00-\x7F\x80-\xFF]+$/
  },
  'unknown': {
    name: 'Unknown',
    minLength: 1,
    maxLength: 255,
    pattern: /^.+$/
  }
};

// Checksum validation functions
function ean13Checksum(code: string): boolean {
  if (code.length !== 13) return false;
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i], 10);
    sum += (i % 2 === 0) ? digit : digit * 3;
  }
  
  const checksum = (10 - (sum % 10)) % 10;
  return checksum === parseInt(code[12], 10);
}

function ean8Checksum(code: string): boolean {
  if (code.length !== 8) return false;
  
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const digit = parseInt(code[i], 10);
    sum += (i % 2 === 0) ? digit * 3 : digit;
  }
  
  const checksum = (10 - (sum % 10)) % 10;
  return checksum === parseInt(code[7], 10);
}

function upcChecksum(code: string): boolean {
  if (code.length !== 12) return false;
  return ean13Checksum('0' + code);
}

function itf14Checksum(code: string): boolean {
  if (code.length !== 14) return false;
  
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const digit = parseInt(code[i], 10);
    sum += (i % 2 === 0) ? digit * 3 : digit;
  }
  
  const checksum = (10 - (sum % 10)) % 10;
  return checksum === parseInt(code[13], 10);
}

export function getBarcodeFormatConfig(format: BarcodeFormat) {
  return BARCODE_FORMAT_CONFIGS[format] || BARCODE_FORMAT_CONFIGS.unknown;
}
