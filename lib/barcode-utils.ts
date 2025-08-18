/**
 * Enhanced barcode utility functions with TypeScript types and validation
 */

import { 
  BarcodeFormat, 
  BARCODE_FORMATS, 
  BarcodeFormatConfig,
  BARCODE_FORMAT_CONFIGS,
  isValidBarcodeFormat as isValidBarcodeFormatBase,
  getBarcodeFormatConfig as getBarcodeFormatConfigBase
} from './barcode-types';

// Extended type definitions
export type BarcodeSource = 'camera' | 'usb' | 'network' | 'manual';

export type { 
  BarcodeFormat, 
  BarcodeFormatConfig 
};

export interface BarcodeValidationResult {
  isValid: boolean;
  format: BarcodeFormat | null;
  normalizedValue: string;
  error?: string;
  checksumValid?: boolean;
  lengthValid?: boolean;
  charactersValid?: boolean;
}

export interface BarcodeScanResult {
  code: string;
  format: BarcodeFormat;
  timestamp: number;
  isValid: boolean;
  source: BarcodeSource;
  validation?: BarcodeValidationResult;
  rawData?: any;
}

/**
 * Detect barcode format from value
 */
function detectBarcodeFormat(value: string): BarcodeFormat | null {
  if (!value) return null;
  
  // Try to detect format based on length and pattern
  for (const format of Object.keys(BARCODE_FORMAT_CONFIGS) as BarcodeFormat[]) {
    const config = BARCODE_FORMAT_CONFIGS[format];
    if (value.length >= config.minLength && 
        value.length <= config.maxLength && 
        config.pattern.test(value)) {
      return format;
    }
  }
  
  return 'unknown';
}

/**
 * Enhanced barcode validation with detailed results
 */
export function validateBarcode(
  value: string, 
  format?: BarcodeFormat
): BarcodeValidationResult {
  if (!value) {
    return {
      isValid: false,
      format: null,
      normalizedValue: '',
      error: 'Barcode value is empty'
    };
  }

  const normalizedValue = value.trim();
  
  // Basic format validation
  if (format && !isValidBarcodeFormatBase(format)) {
    return {
      isValid: false,
      format: null,
      normalizedValue,
      error: `Invalid barcode format: ${format}`
    };
  }

  // Detect format if not provided
  const detectedFormat = format || detectBarcodeFormat(normalizedValue) || 'unknown';
  
  // Get format config
  const formatConfig = getBarcodeFormatConfigBase(detectedFormat);
  
  // Validate against format if known
  const { minLength, maxLength, pattern, checksum } = formatConfig;
  const length = normalizedValue.length;
  const lengthValid = length >= minLength && length <= maxLength;
  const charactersValid = pattern.test(normalizedValue);
  const checksumValid = checksum ? checksum(normalizedValue) : true;
  
  return {
    isValid: lengthValid && charactersValid && checksumValid,
    format: detectedFormat,
    normalizedValue,
    checksumValid,
    lengthValid,
    charactersValid,
    error: !lengthValid ? `Invalid length for ${formatConfig.name}` : 
           !charactersValid ? `Invalid characters for ${formatConfig.name}` :
           !checksumValid ? 'Invalid checksum' : undefined
  };
}

/**
 * Create a scan result object
 */
export function createScanResult(
  code: string, 
  source: BarcodeSource = 'manual',
  format?: BarcodeFormat
): BarcodeScanResult {
  const validation = validateBarcode(code, format);
  return {
    code,
    format: validation.format || 'unknown',
    timestamp: Date.now(),
    isValid: validation.isValid,
    source,
    validation,
    rawData: {}
  };
}

/**
 * Check if a barcode format is valid
 */
export function isValidBarcodeFormat(format: string): format is BarcodeFormat {
  return (BARCODE_FORMATS as readonly string[]).includes(format);
}

/**
 * Get barcode format configuration
 */
export function getBarcodeFormatConfig(format: BarcodeFormat) {
  return BARCODE_FORMAT_CONFIGS[format];
}

// Re-export format configurations
export { BARCODE_FORMAT_CONFIGS };
