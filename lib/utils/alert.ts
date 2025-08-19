'use client';

import { alert as showAlert, confirm as showConfirm, AlertProvider } from '@/components/ui/alert-dialog';

export { AlertProvider };

// Re-export the alert and confirm functions for easy importing
export const alert = showAlert;
export const confirm = showConfirm;

// Add a global alert function that can be used anywhere
if (typeof window !== 'undefined') {
  // @ts-ignore - Adding to window for global access
  window.showAlert = showAlert;
  // @ts-ignore
  window.showConfirm = showConfirm;
  
    // Store original functions
  const originalAlert = window.alert;
  const originalConfirm = window.confirm;
  
  // Override the native alert function
  window.alert = (message?: string): void => {
    if (message) {
      showAlert({
        title: 'Alert',
        description: String(message),
      });
    }
  };
  
  // Override the native confirm function
  window.confirm = (message?: string): boolean => {
    if (!message) return false;
    
    let confirmed = false;
    let resolved = false;
    
    // Show the confirm dialog
    showConfirm({
      title: 'Confirm',
      description: message,
      onConfirm: () => {
        confirmed = true;
        resolved = true;
      },
      onCancel: () => {
        confirmed = false;
        resolved = true;
      },
    });
    
    // Return the default value (will be updated when user responds)
    return confirmed;
  };
}

// Helper function for success messages
export const success = (message: string, options: { title?: string; onConfirm?: () => void } = {}) => {
  return showAlert({
    title: options.title || 'Success',
    description: message,
    variant: 'success',
    onConfirm: options.onConfirm,
  });
};

// Helper function for error messages
export const error = (message: string, options: { title?: string; onConfirm?: () => void } = {}) => {
  return showAlert({
    title: options.title || 'Error',
    description: message,
    variant: 'destructive',
    onConfirm: options.onConfirm,
  });
};

// Helper function for warning messages
export const warning = (message: string, options: { title?: string; onConfirm?: () => void } = {}) => {
  return showAlert({
    title: options.title || 'Warning',
    description: message,
    variant: 'warning',
    onConfirm: options.onConfirm,
  });
};

// Helper function for info messages
export const info = (message: string, options: { title?: string; onConfirm?: () => void } = {}) => {
  return showAlert({
    title: options.title || 'Information',
    description: message,
    variant: 'default',
    onConfirm: options.onConfirm,
  });
};
