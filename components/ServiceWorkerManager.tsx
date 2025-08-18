'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/stores/useAppStore';
import { toast } from '@/components/ui/use-toast';

const SERVICE_WORKER_PATH = '/sw.js';
const SERVICE_WORKER_SCOPE = '/';

export function ServiceWorkerManager() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const { setOfflineStatus } = useAppStore();

  // Register service worker
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerServiceWorker = async () => {
        try {
          // Unregister any existing service workers first
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }

          // Clear all caches
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }

          // Register the new service worker
          const reg = await navigator.serviceWorker.register(SERVICE_WORKER_PATH, {
            scope: SERVICE_WORKER_SCOPE,
            updateViaCache: 'none',
          });

          setRegistration(reg);

          // Check for updates
          if (reg.waiting) {
            setUpdateAvailable(true);
            return;
          }

          // Listen for controller change (new service worker activated)
          const handleControllerChange = () => {
            window.location.reload();
          };
          navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

          // Listen for update found
          const handleUpdateFound = () => {
            const newWorker = reg.installing;
            if (newWorker) {
              const handleStateChange = () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true);
                }
              };
              newWorker.addEventListener('statechange', handleStateChange);
              
              // Cleanup event listener
              return () => {
                newWorker.removeEventListener('statechange', handleStateChange);
              };
            }
          };
          
          reg.addEventListener('updatefound', handleUpdateFound);
          
          // Cleanup function
          return () => {
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
            reg.removeEventListener('updatefound', handleUpdateFound);
          };
        } catch (error) {
          console.error('Service worker registration failed:', error);
        }
      };

      registerServiceWorker();

      // Handle online/offline status
      const handleOnline = () => {
        setOfflineStatus(false);
        // Check for updates when coming back online
        if (registration) {
          registration.update().catch(console.error);
        }
      };

      const handleOffline = () => {
        setOfflineStatus(true);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Initial check
      setOfflineStatus(!navigator.onLine);

      // Check for updates every hour
      const updateInterval = setInterval(() => {
        if (registration) {
          registration.update().catch(console.error);
        }
      }, 60 * 60 * 1000);

      // Cleanup
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        clearInterval(updateInterval);
      };
    }
  }, [registration, setOfflineStatus]);

  // Handle update
  const handleUpdate = () => {
    if (registration && registration.waiting) {
      // Tell the service worker to skip waiting and activate
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  // Show update toast when update is available
  useEffect(() => {
    if (updateAvailable) {
      toast({
        title: 'Update available',
        description: 'A new version of the app is available. Click to update.',
        action: (
          <button 
            onClick={handleUpdate}
            className="px-3 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Update
          </button>
        )
      });
    }
  }, [updateAvailable]);

  return null;
}
