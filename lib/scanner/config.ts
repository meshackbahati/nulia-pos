import { z } from "zod";
import { BarcodeFormat } from "@/lib/barcode-utils";

// Environment variables schema for scanner configuration
export const scannerEnvSchema = z.object({
  // Network scanner configuration
  NETWORK_SCANNER_ENABLED: z.boolean().default(false),
  NETWORK_SCANNER_PORT: z.number().default(8080),
  NETWORK_SCANNER_SECRET: z.string().optional(),
  
  // USB scanner configuration
  USB_SCANNER_ENABLED: z.boolean().default(false),
  USB_SCANNER_VENDOR_ID: z.string().optional(),
  USB_SCANNER_PRODUCT_ID: z.string().optional(),
  
  // M-Pesa configuration
  MPESA_CONSUMER_KEY: z.string().optional(),
  MPESA_CONSUMER_SECRET: z.string().optional(),
  MPESA_PASSKEY: z.string().optional(),
  MPESA_SHORTCODE: z.string().optional(),
  MPESA_INITIATOR_NAME: z.string().optional(),
  MPESA_SECURITY_CREDENTIAL: z.string().optional(),
  MPESA_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),
  
  // General settings
  SCANNER_SOUND_ENABLED: z.boolean().default(true),
  SCANNER_VIBRATE_ON_SCAN: z.boolean().default(true),
  SCANNER_DEBUG_MODE: z.boolean().default(false),
});

export type ScannerEnvConfig = z.infer<typeof scannerEnvSchema>;

// Default scanner configuration
export const defaultScannerConfig: ScannerEnvConfig = {
  NETWORK_SCANNER_ENABLED: false,
  NETWORK_SCANNER_PORT: 8080,
  USB_SCANNER_ENABLED: false,
  SCANNER_SOUND_ENABLED: true,
  SCANNER_VIBRATE_ON_SCAN: true,
  SCANNER_DEBUG_MODE: false,
  MPESA_ENVIRONMENT: "sandbox",
};

// Supported barcode formats for scanning
export const SUPPORTED_FORMATS: BarcodeFormat[] = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "itf",
  "qr_code"
];

// Network scanner app recommendations
export const NETWORK_SCANNER_APPS = [
  {
    name: "Barcode to PC",
    platforms: ["android", "ios"],
    description: "Turns your phone into a wireless barcode scanner",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.eme.barcode.pc",
    appStoreUrl: "https://apps.apple.com/app/barcode-to-pc-wireless/id1179750280"
  },
  {
    name: "Barcode Scanner to PC",
    platforms: ["android"],
    description: "Simple wireless barcode scanner for PC",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.silentlexx.barcodescannerforpc"
  }
];

// USB scanner setup instructions
export const USB_SCANNER_SETUP = {
  windows: [
    "Connect the USB barcode scanner to your computer",
    "Wait for Windows to install the drivers automatically",
    "Open Notepad and scan a barcode to test"
  ],
  macos: [
    "Connect the USB barcode scanner to your Mac",
    "The scanner should be recognized as a keyboard input device",
    "Open TextEdit and scan a barcode to test"
  ],
  linux: [
    "Connect the USB barcode scanner to your computer",
    "Most scanners work as keyboard input devices",
    "Open a text editor and scan a barcode to test"
  ]
};

// Helper function to validate environment variables
export function getValidatedConfig(env: Record<string, any>): ScannerEnvConfig {
  try {
    return scannerEnvSchema.parse(env);
  } catch (error) {
    console.error("Invalid scanner configuration:", error);
    return defaultScannerConfig;
  }
}
