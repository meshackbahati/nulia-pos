// Error tracking and reporting utility

type ErrorContext = {
  componentStack?: string;
  timestamp?: number;
  userInfo?: Record<string, any>;
  [key: string]: any;
};

class ErrorTracker {
  private static instance: ErrorTracker;
  private listeners: Array<(error: Error, context: ErrorContext) => void> = [];
  private errorQueue: Array<{ error: Error; context: ErrorContext }> = [];
  private isProcessing = false;
  
  private constructor() {
    // Set up global error handlers
    if (typeof window !== 'undefined') {
      // Handle uncaught errors
      window.addEventListener('error', (event) => {
        this.captureError(event.error || new Error(event.message), {
          type: 'uncaught',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        });
      });
      
      // Handle unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason;
        this.captureError(error instanceof Error ? error : new Error(String(error)), {
          type: 'unhandledrejection',
        });
      });
    }
  }
  
  public static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }
  
  /**
   * Add an error listener
   */
  public addListener(listener: (error: Error, context: ErrorContext) => void): () => void {
    this.listeners.push(listener);
    
    // Process any queued errors
    this.processQueue();
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  /**
   * Capture an error and notify listeners
   */
  public captureError(error: Error, context: ErrorContext = {}): void {
    // Ensure we have a proper error object
    const normalizedError = this.normalizeError(error);
    
    // Add timestamp if not provided
    const errorContext: ErrorContext = {
      timestamp: Date.now(),
      ...context,
    };
    
    // If we have listeners, notify them immediately
    if (this.listeners.length > 0) {
      this.notifyListeners(normalizedError, errorContext);
    } else {
      // Otherwise, queue the error for later
      this.errorQueue.push({
        error: normalizedError,
        context: errorContext,
      });
    }
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Captured error:', normalizedError, errorContext);
    }
  }
  
  /**
   * Notify all listeners about an error
   */
  private notifyListeners(error: Error, context: ErrorContext): void {
    for (const listener of this.listeners) {
      try {
        listener(error, context);
      } catch (e) {
        console.error('Error in error listener:', e);
      }
    }
  }
  
  /**
   * Process any queued errors
   */
  private processQueue(): void {
    if (this.isProcessing || this.errorQueue.length === 0) return;
    
    this.isProcessing = true;
    
    // Process all queued errors
    while (this.errorQueue.length > 0) {
      const { error, context } = this.errorQueue.shift()!;
      this.notifyListeners(error, context);
    }
    
    this.isProcessing = false;
  }
  
  /**
   * Normalize different error types into a consistent format
   */
  private normalizeError(error: Error | string | unknown): Error {
    if (error instanceof Error) return error;
    if (typeof error === 'string') return new Error(error);
    return new Error(String(error));
  }
}

// Export a singleton instance
export const errorTracker = ErrorTracker.getInstance();

/**
 * Helper function to capture errors with context
 */
export function captureError(error: unknown, context: ErrorContext = {}): void {
  errorTracker.captureError(
    error instanceof Error ? error : new Error(String(error)),
    context
  );
}

/**
 * Create a scoped error tracker for a specific component or module
 */
export function createScopedTracker(scope: string) {
  return {
    capture: (error: unknown, context: ErrorContext = {}) => {
      errorTracker.captureError(
        error instanceof Error ? error : new Error(String(error)),
        { ...context, scope }
      );
    },
  };
}

// Set up default error reporting to the monitoring system
errorTracker.addListener((error, context) => {
  // In a real app, you would send this to your error tracking service
  // For example: Sentry.captureException(error, { extra: context });
  
  // For now, we'll just log to the console
  console.error('Error reported:', error, context);
  
  // You could also send to an API endpoint
  if (typeof window !== 'undefined' && navigator.onLine) {
    const endpoint = '/api/monitoring/errors';
    const payload = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...context,
    };
    
    // Use sendBeacon for reliability, falls back to fetch
    const blob = new Blob([JSON.stringify(payload)], {
      type: 'application/json',
    });
    
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, blob);
    } else {
      fetch(endpoint, {
        method: 'POST',
        body: blob,
        keepalive: true,
      }).catch(() => {
        // If the request fails, we'll just log it
        console.warn('Failed to report error to server');
      });
    }
  }
});
