'use client';

import { ReactNode, useEffect, Suspense } from 'react';
import { ThemeProvider } from 'next-themes';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/stores/useAppStore';
import { useCartStore } from '@/lib/stores/useCartStore';
import { usePerformanceTracking, initializeMonitoring } from '@/lib/monitoring/performance';
import { ServiceWorkerManager } from '@/components/ServiceWorkerManager';

interface AppProvidersProps {
  children: ReactNode;
  initialCart?: any;
  initialAppState?: any;
}

function AppProvidersContent({ children, initialCart, initialAppState }: AppProvidersProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { updateLastSynced } = useAppStore();
  const { processQueue } = useCartStore();
  
  // Initialize performance monitoring
  const { trackNavigation } = usePerformanceTracking();
  
  // Track page navigation
  useEffect(() => {
    const url = `${pathname}${searchParams.toString() ? `?${searchParams}` : ''}`;
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      trackNavigation(pathname, url, endTime - startTime);
    };
  }, [pathname, searchParams, trackNavigation]);
  
  // Initialize monitoring
  useEffect(() => {
    initializeMonitoring();
  }, []);
  
  // Process offline queue when online
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.onLine) {
      processQueue();
      updateLastSynced();
    }
  }, [processQueue, updateLastSynced]);
  
  // Initialize stores with server state if provided
  useEffect(() => {
    if (initialCart) {
      useCartStore.setState({ items: initialCart });
    }
    
    if (initialAppState) {
      useAppStore.setState(initialAppState);
    }
  }, [initialCart, initialAppState]);
  
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ServiceWorkerManager />
      {children}
    </ThemeProvider>
  );
}

export function AppProviders(props: AppProvidersProps) {
    return (
        <Suspense>
            <AppProvidersContent {...props} />
        </Suspense>
    )
}
