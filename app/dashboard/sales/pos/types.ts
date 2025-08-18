// Base product type from the database
export interface Product {
  id: string;
  name: string;
  description?: string | null;
  sku?: string | null;
  barcode_data?: string | null;
  price: number;
  cost_price?: number | null;
  quantity: number;
  category_id?: string | null;
  supplier_id?: string | null;
  image_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Cart item type that includes the product and quantity
export interface CartItem {
  product: Product;
  quantity: number;
}

// Payment method type
export type PaymentMethod = 'cash' | 'card' | 'mobile_money';

// Cart summary type
export interface CartSummary {
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
}

// Sales transaction type
export interface SaleTransaction {
  id: string;
  invoice_number: string;
  customer_name?: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: 'pending' | 'completed' | 'refunded' | 'partially_refunded';
  status: 'draft' | 'completed' | 'cancelled';
  notes?: string | null;
  created_at: string;
  updated_at: string;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

// Product category type
export interface ProductCategory {
  id: string;
  name: string;
  description?: string | null;
  parent_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Barcode scan result
export interface BarcodeScanResult {
  code: string;
  type?: string;
  timestamp: number;
}

// Scanner settings
export interface ScannerSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  continuousScan: boolean;
  autoFocus: boolean;
  torchEnabled: boolean;
  scannerType: 'camera' | 'bluetooth' | 'usb' | 'keyboard';
}

// Default scanner settings
export const DEFAULT_SCANNER_SETTINGS: ScannerSettings = {
  soundEnabled: true,
  vibrationEnabled: true,
  continuousScan: false,
  autoFocus: true,
  torchEnabled: false,
  scannerType: 'camera',
};

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  success: boolean;
}

// Search parameters for products
export interface ProductSearchParams {
  query?: string;
  categoryId?: string;
  inStockOnly?: boolean;
  sortBy?: 'name' | 'price' | 'quantity' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
