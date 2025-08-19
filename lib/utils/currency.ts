/**
 * Format currency values consistently across the application
 * All amounts are in KES (Kenyan Shillings)
 */

// Main currency formatter
const formatter = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Format currency with KES symbol
export const formatCurrency = (amount: number): string => {
  return `KES ${amount.toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

// Format currency without symbol (just the number)
export const formatAmount = (amount: number): string => {
  return amount.toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Parse a currency string back to a number
export const parseCurrency = (currencyString: string): number => {
  // Remove all non-numeric characters except decimal point and negative
  const numericString = currencyString.replace(/[^0-9.-]+/g, '');
  return parseFloat(numericString) || 0;
};

/**
 * Format a price with KES symbol
 * Example: KES 1,234.56
 */
export const formatPrice = (amount: number): string => {
  return `KES ${formatAmount(amount)}`;
};

/**
 * Format a range of prices (e.g., for price filters)
 */
export const formatPriceRange = (min: number, max: number): string => {
  return `KES ${formatAmount(min)} - KES ${formatAmount(max)}`;
};

/**
 * Get the currency symbol (KES)
 */
export const getCurrencySymbol = (): string => 'KES';

/**
 * Format inventory value with KES
 */
export const formatInventoryValue = (value: number): string => {
  return `KES ${formatAmount(value)}`;
};

/**
 * Format revenue with KES
 */
export const formatRevenue = (amount: number): string => {
  return `KES ${formatAmount(amount)}`;
};

/**
 * Format order total with KES
 */
export const formatOrderTotal = (amount: number): string => {
  return `KES ${formatAmount(amount)}`;
};
