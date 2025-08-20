import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function hasPermission(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = {
    manager: 2,
    salesperson: 1,
  }

  return (
    roleHierarchy[userRole as keyof typeof roleHierarchy] >= roleHierarchy[requiredRole as keyof typeof roleHierarchy]
  )
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function formatCurrency(amount: number, currency: string = 'USD') {
  if (!currency) {
    console.warn('No currency provided, defaulting to USD');
    currency = 'USD';
  }
  
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: 'USD',
    }).format(amount);
  }
}
