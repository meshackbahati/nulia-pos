import React, { useCallback, useEffect } from 'react';
import { useAppStore } from '@/lib/stores/useAppStore';

// Performance metrics collection
type PerformanceMetric = {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
};

const METRICS_BUFFER: PerformanceMetric[] = [];
const MAX_BUFFER_SIZE = 50;
const FLUSH_INTERVAL = 60000; // 1 minute

// Send metrics to the server
const sendMetrics = async (metrics: PerformanceMetric[]) => {
  if (metrics.length === 0) return;

  try {
    // In a real app, you would send this to your monitoring service
    console.debug('Sending metrics:', metrics);
    
    // Example: Send to an API endpoint
    // await fetch('/api/monitoring/metrics', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ metrics }),
    // });
  } catch (error) {
    console.error('Failed to send metrics:', error);
  }
};

// Add a metric to the buffer
const trackMetric = (name: string, value: number, tags?: Record<string, string>) => {
  const metric: PerformanceMetric = {
    name,
    value,
    timestamp: Date.now(),
    tags,
  };

  METRICS_BUFFER.push(metric);

  // If buffer is full, flush it
  if (METRICS_BUFFER.length >= MAX_BUFFER_SIZE) {
    flushMetrics();
  }
};

// Flush metrics to the server
const flushMetrics = () => {
  if (METRICS_BUFFER.length === 0) return;
  
  // Create a copy of the buffer and clear it
  const metricsToSend = [...METRICS_BUFFER];
  METRICS_BUFFER.length = 0;
  
  // Send metrics in the background
  sendMetrics(metricsToSend).catch(console.error);
};

// Track page load performance
const trackPageLoad = () => {
  if (typeof window === 'undefined') return;
  
  // Use the Navigation Timing API to measure page load performance
  window.addEventListener('load', () => {
    setTimeout(() => {
      const [navigationEntry] = performance.getEntriesByType('navigation');
      
      if (navigationEntry) {
        const navEntry = navigationEntry as PerformanceNavigationTiming;
        const { domComplete, loadEventEnd, domContentLoadedEventEnd } = navEntry;
        
        trackMetric('page.load_time', domComplete);
        trackMetric('page.dom_content_loaded', domContentLoadedEventEnd);
        trackMetric('page.full_load', loadEventEnd);
      }
      
      // Track Largest Contentful Paint (LCP)
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      if (lcpEntries.length > 0) {
        const lcp = lcpEntries[lcpEntries.length - 1];
        trackMetric('paint.largest_contentful_paint', lcp.startTime, {
          element: lcp.entryType === 'largest-contentful-paint' ? lcp.url || lcp.id || 'unknown' : 'unknown'
        });
      }
      
      // Track First Input Delay (FID)
      const fidEntries = performance.getEntriesByType('first-input');
      if (fidEntries.length > 0) {
        const fid = fidEntries[0] as PerformanceEventTiming;
        trackMetric('interaction.first_input_delay', fid.processingStart - fid.startTime, {
          eventType: fid.name
        });
      }
      
      // Track Cumulative Layout Shift (CLS)
      const layoutShiftEntries = performance.getEntriesByType('layout-shift');
      if (layoutShiftEntries.length > 0) {
        const cls = layoutShiftEntries.reduce((sum, entry) => {
          const layoutShiftEntry = entry as LayoutShift;
          return layoutShiftEntry.hadRecentInput ? sum : sum + layoutShiftEntry.value;
        }, 0);
        
        trackMetric('layout.cumulative_shift', cls);
      }
    }, 0);
  });
};

// Track API performance
export const trackApiPerformance = (url: string, method: string, duration: number, status: number) => {
  trackMetric('api.request.duration', duration, {
    url,
    method,
    status: status.toString(),
  });
};

// Track user interactions
export const trackInteraction = (element: string, action: string, duration?: number) => {
  trackMetric('interaction', duration || 0, {
    element,
    action,
  });};

// Track errors
export const trackError = (error: Error, context: Record<string, any> = {}) => {
  trackMetric('error', 1, {
    name: error.name,
    message: error.message,
    stack: error.stack || '',
    ...context,
  });
};

// Track navigation
export const trackNavigation = (from: string, to: string, duration: number) => {
  trackMetric('navigation', duration, {
    from,
    to,
  });
};

// Track resource loading
export const trackResource = (url: string, type: string, duration: number, size: number) => {
  trackMetric('resource.load_time', duration, {
    url,
    type,
    size: size.toString(),
  });
};

// Track memory usage (if supported)
const trackMemory = () => {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    if (memory) {
      trackMetric('memory.used_js_heap_size', memory.usedJSHeapSize);
      trackMetric('memory.total_js_heap_size', memory.totalJSHeapSize);
      trackMetric('memory.js_heap_size_limit', memory.jsHeapSizeLimit);
    }
  }
};

// Initialize performance tracking
export const usePerformanceTracking = () => {
  const { isOnline } = useAppStore();
  
  // Set up periodic flushing
  useEffect(() => {
    trackPageLoad();
    
    const flushInterval = setInterval(() => {
      if (isOnline) {
        flushMetrics();
      }
    }, FLUSH_INTERVAL);
    
    const memoryInterval = setInterval(trackMemory, 60000); // Every minute
    
    // Flush on page hide/unload
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushMetrics();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', flushMetrics);
    
    return () => {
      clearInterval(flushInterval);
      clearInterval(memoryInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', flushMetrics);
      
      // Flush any remaining metrics
      if (isOnline) {
        flushMetrics();
      }
    };
  }, [isOnline]);
  
  // Return tracking functions
  return {
    trackApiPerformance,
    trackInteraction,
    trackError,
    trackNavigation,
    trackResource,
  };
};

// Error boundary component
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    trackError(error, { boundary: 'ErrorBoundary' });
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    trackError(error, { 
      boundary: 'ErrorBoundary',
      componentStack: errorInfo.componentStack 
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}

// Performance observer for long tasks
export const observeLongTasks = () => {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;
  
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      trackMetric('long_task', entry.duration, {
        entryType: entry.entryType,
        name: entry.name,
      });
    }
  });
  
  observer.observe({ entryTypes: ['longtask'] });
  
  return () => {
    observer.disconnect();
  };
};

// Initialize all performance tracking
export const initializeMonitoring = () => {
  if (typeof window === 'undefined') return;
  
  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    trackError(error instanceof Error ? error : new Error(String(error)), {
      type: 'unhandledrejection',
    });
  });
  
  // Track uncaught errors
  window.addEventListener('error', (event) => {
    const error = event.error || new Error(event.message);
    trackError(error, {
      type: 'uncaught',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
  
  // Observe long tasks
  observeLongTasks();
  
  // Track page visibility
  document.addEventListener('visibilitychange', () => {
    trackMetric('page.visibility', document.visibilityState === 'visible' ? 1 : 0);
  });
  
  console.log('Monitoring initialized');
};

// Export a hook to use monitoring
export const useMonitoring = () => {
  useEffect(() => {
    initializeMonitoring();
  }, []);
  
  return {
    trackApiPerformance,
    trackInteraction,
    trackError,
    trackNavigation,
    trackResource,
  };
};
