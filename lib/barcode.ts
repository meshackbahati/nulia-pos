/**
 * Barcode utility functions for validation and formatting
 */

// Supported barcode formats
const SUPPORTED_FORMATS = [
  'code_128',
  'code_39',
  'code_93',
  'codabar',
  'ean_13',
  'ean_8',
  'itf',
  'upc_a',
  'upc_e',
  'qr_code',
  'data_matrix',
  'pdf417',
] as const;

export type BarcodeFormat = (typeof SUPPORTED_FORMATS)[number];

/**
 * Check if barcode format is supported
 */
function isFormatSupported(format: string): format is BarcodeFormat {
  return SUPPORTED_FORMATS.includes(format as BarcodeFormat);
}

/**
 * Validate a barcode value based on its format
 */
export function validateBarcode(value: string, format: BarcodeFormat): boolean {
  if (!value) return false;
  
  switch (format) {
    case 'ean_13':
      return validateEAN13(value);
    case 'ean_8':
      return validateEAN8(value);
    case 'upc_a':
      return validateUPCA(value);
    case 'upc_e':
      return validateUPCE(value);
    case 'code_128':
      return validateCode128(value);
    case 'code_39':
      return validateCode39(value);
    case 'code_93':
      return validateCode93(value);
    case 'itf':
      return validateITF(value);
    case 'codabar':
      return validateCodabar(value);
    default:
      // For formats without specific validation, just check if it's not empty
      return value.trim().length > 0;
  }
}

/**
 * Format a barcode value based on its format
 */
export function formatBarcode(value: string, format: BarcodeFormat): string {
  if (!value) return '';
  
  // Remove any non-digit characters
  const digits = value.replace(/\D/g, '');
  
  switch (format) {
    case 'ean_13':
      return formatEAN13(digits);
    case 'ean_8':
      return formatEAN8(digits);
    case 'upc_a':
      return formatUPCA(digits);
    case 'upc_e':
      return formatUPCE(digits);
    default:
      return value.trim();
  }
}

/**
 * Detect the most likely barcode format from a value
 */
export function detectBarcodeFormat(value: string): BarcodeFormat | null {
  if (!value) return null;
  
  // Remove any non-digit characters for format detection
  const digits = value.replace(/\D/g, '');
  
  // Check EAN-13 (13 digits)
  if (digits.length === 13) {
    return 'ean_13';
  }
  
  // Check EAN-8 (8 digits)
  if (digits.length === 8) {
    return 'ean_8';
  }
  
  // Check UPC-A (12 digits)
  if (digits.length === 12) {
    return 'upc_a';
  }
  
  // Check UPC-E (6-8 digits, typically 8 with number system and check digit)
  if (digits.length >= 6 && digits.length <= 8) {
    return 'upc_e';
  }
  
  // Check Code 128 (variable length, but typically at least 4 characters)
  if (/^[\x00-\x7F]{4,}$/.test(value)) {
    return 'code_128';
  }
  
  // Check Code 39 (starts and ends with *, alphanumeric)
  if (/^\*[A-Z0-9\-\s$%*+\/\.]+\*$/.test(value)) {
    return 'code_39';
  }
  
  // Default to code_128 for unknown formats
  return 'code_128';
}

// EAN-13 validation and formatting
function validateEAN13(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false;
  
  const checkDigit = parseInt(value[12], 10);
  const sum = value
    .substring(0, 12)
    .split('')
    .map((d, i) => parseInt(d, 10) * (i % 2 === 0 ? 1 : 3))
    .reduce((a, b) => a + b, 0);
  
  const calculatedCheckDigit = (10 - (sum % 10)) % 10;
  return checkDigit === calculatedCheckDigit;
}

function formatEAN13(digits: string): string {
  if (digits.length !== 13) return digits;
  return `${digits.substring(0, 1)}-${digits.substring(1, 7)}-${digits.substring(7, 12)}-${digits[12]}`;
}

// EAN-8 validation and formatting
function validateEAN8(value: string): boolean {
  if (!/^\d{8}$/.test(value)) return false;
  
  const checkDigit = parseInt(value[7], 10);
  const sum = value
    .substring(0, 7)
    .split('')
    .map((d, i) => parseInt(d, 10) * (i % 2 === 0 ? 3 : 1))
    .reduce((a, b) => a + b, 0);
  
  const calculatedCheckDigit = (10 - (sum % 10)) % 10;
  return checkDigit === calculatedCheckDigit;
}

function formatEAN8(digits: string): string {
  if (digits.length !== 8) return digits;
  return `${digits.substring(0, 4)}-${digits.substring(4, 8)}`;
}

// UPC-A validation and formatting
function validateUPCA(value: string): boolean {
  if (!/^\d{12}$/.test(value)) return false;
  
  const checkDigit = parseInt(value[11], 10);
  const sum = value
    .substring(0, 11)
    .split('')
    .map((d, i) => parseInt(d, 10) * (i % 2 === 0 ? 3 : 1))
    .reduce((a, b) => a + b, 0);
  
  const calculatedCheckDigit = (10 - (sum % 10)) % 10;
  return checkDigit === calculatedCheckDigit;
}

function formatUPCA(digits: string): string {
  if (digits.length !== 12) return digits;
  return `${digits[0]}-${digits.substring(1, 6)}-${digits.substring(6, 11)}-${digits[11]}`;
}

// UPC-E validation and formatting
function validateUPCE(value: string): boolean {
  // Convert to UPC-A for validation
  if (value.length === 6) {
    // 6-digit UPC-E
    return /^[0-9]{6}$/.test(value);
  } else if (value.length === 8) {
    // 8-digit UPC-E with number system and check digit
    if (!/^[0-9]{8}$/.test(value)) return false;
    
    // Validate check digit
    const checkDigit = parseInt(value[7], 10);
    const sum = value
      .substring(0, 7)
      .split('')
      .map((d, i) => parseInt(d, 10) * (i % 2 === 0 ? 3 : 1))
      .reduce((a, b) => a + b, 0);
    
    const calculatedCheckDigit = (10 - (sum % 10)) % 10;
    return checkDigit === calculatedCheckDigit;
  }
  
  return false;
}

function formatUPCE(digits: string): string {
  if (digits.length === 6) {
    return digits;
  } else if (digits.length === 8) {
    return `${digits[0]}-${digits.substring(1, 7)}-${digits[7]}`;
  }
  return digits;
}

// Code 128 validation
function validateCode128(value: string): boolean {
  // Code 128 can contain any ASCII 0-127 characters
  return /^[\x00-\x7F]{4,}$/.test(value);
}

// Code 39 validation
function validateCode39(value: string): boolean {
  // Code 39 can contain A-Z, 0-9, and -.$/+% and space, starts and ends with *
  return /^\*[A-Z0-9\-\s$%*+\/\.]+\*$/.test(value);
}

// Code 93 validation
function validateCode93(value: string): boolean {
  // Code 93 can contain A-Z, 0-9, -.$/+% and space, starts and ends with *
  return /^[A-Z0-9\-\s$%*+\/\.]+$/.test(value);
}

// ITF (Interleaved 2 of 5) validation
function validateITF(value: string): boolean {
  // ITF can only contain digits and must have an even number of digits
  return /^\d{2,}$/.test(value) && value.length % 2 === 0;
}

// Codabar validation
function validateCodabar(value: string): boolean {
  // Codabar can contain 0-9, -$:/.+ and starts/ends with A-D or a-d
  return /^[A-Da-d][0-9\-\$:/\.+]+[A-Da-d]$/.test(value);
}

/**
 * Generate a random barcode for testing
 */
export function generateRandomBarcode(format: BarcodeFormat = 'code_128'): string {
  const randomDigits = (length: number): string => {
    return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
  };

  switch (format) {
    case 'ean_13':
      // Generate 12 random digits and calculate check digit
      const ean13Base = '2' + randomDigits(11); // Start with 2 for bookland
      const ean13Check = calculateEAN13CheckDigit(ean13Base);
      return ean13Base + ean13Check;
      
    case 'ean_8':
      // Generate 7 random digits and calculate check digit
      const ean8Base = randomDigits(7);
      const ean8Check = calculateEAN8CheckDigit(ean8Base);
      return ean8Base + ean8Check;
      
    case 'upc_a':
      // Generate 11 random digits and calculate check digit
      const upcABase = randomDigits(11);
      const upcACheck = calculateUPCACheckDigit(upcABase);
      return upcABase + upcACheck;
      
    case 'upc_e':
      // Generate 6 random digits for UPC-E
      return randomDigits(6);
      
    case 'code_128':
      // Generate a random Code 128 barcode (alphanumeric, 8-16 chars)
      const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const length = 8 + Math.floor(Math.random() * 9); // 8-16 characters
      return Array.from({ length }, () => 
        chars[Math.floor(Math.random() * chars.length)]
      ).join('');
      
    case 'code_39':
      // Generate a random Code 39 barcode (alphanumeric, 6-12 chars)
      const code39Chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';
      const code39Length = 6 + Math.floor(Math.random() * 7); // 6-12 characters
      const code39Body = Array.from({ length: code39Length }, () => 
        code39Chars[Math.floor(Math.random() * code39Chars.length)]
      ).join('');
      return `*${code39Body}*`;
      
    default:
      // Default to a simple numeric code
      return randomDigits(8);
  }
}

// Helper functions for check digit calculations
function calculateEAN13CheckDigit(base: string): number {
  const sum = base
    .split('')
    .map((d, i) => parseInt(d, 10) * (i % 2 === 0 ? 1 : 3))
    .reduce((a, b) => a + b, 0);
  return (10 - (sum % 10)) % 10;
}

function calculateEAN8CheckDigit(base: string): number {
  const sum = base
    .split('')
    .map((d, i) => parseInt(d, 10) * (i % 2 === 0 ? 3 : 1))
    .reduce((a, b) => a + b, 0);
  return (10 - (sum % 10)) % 10;
}

function calculateUPCACheckDigit(base: string): number {
  const sum = base
    .split('')
    .map((d, i) => parseInt(d, 10) * (i % 2 === 0 ? 3 : 1))
    .reduce((a, b) => a + b, 0);
  return (10 - (sum % 10)) % 10;
}

// Export all barcode formats
export const BARCODE_FORMATS = [...SUPPORTED_FORMATS];
