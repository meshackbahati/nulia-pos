'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/stores/useAppStore';
import { useCartStore } from '@/lib/stores/useCartStore';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

export function OfflineStatus() {
  const { isOnline, lastSynced } = useAppStore();
  const { pendingSync, processQueue } = useCartStore();
  const [isVisible, setIsVisible] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Show the status bar when offline or when there are pending syncs
  useEffect(() => {
    if (!isOnline || pendingSync) {
      setIsVisible(true);
    } else {
      // Hide the status bar after a delay when back online and synced
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingSync]);

  // Update last sync time when it changes
  useEffect(() => {
    if (lastSynced) {
      setLastSyncTime(new Date(lastSynced).toLocaleTimeString());
    }
  }, [lastSynced]);

  // Handle manual sync
  const handleSync = async () => {
    if (isOnline && pendingSync) {
      try {
        setIsSyncing(true);
        await processQueue();
        toast({
          title: 'Sync complete',
          description: 'Your changes have been synced with the server.',
          variant: 'default',
        });
      } catch (error) {
        console.error('Sync failed:', error);
        toast({
          title: 'Sync failed',
          description: 'Failed to sync changes. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // Format time since last sync
  const formatTimeSinceSync = () => {
    if (!lastSynced) return 'Never';
    
    const now = new Date();
    const lastSync = new Date(lastSynced);
    const diffInSeconds = Math.floor((now.getTime() - lastSync.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return lastSync.toLocaleDateString();
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed bottom-4 right-4 z-50 rounded-lg shadow-lg p-3 text-sm flex items-center space-x-2 transition-all duration-300 ease-in-out transform ${
        !isOnline
          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800 translate-y-0 opacity-100'
          : pendingSync
          ? 'bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 border border-blue-200 dark:border-blue-800 translate-y-0 opacity-100'
          : 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200 border border-green-200 dark:border-green-800 translate-y-0 opacity-100'
      }`}
    >
          {!isOnline ? (
            <WifiOff className="h-4 w-4" />
          ) : pendingSync ? (
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          
          <span>
            {!isOnline
              ? 'You are currently offline. Some features may be limited.'
              : pendingSync
              ? `You have offline changes. Last sync: ${formatTimeSinceSync()}`
              : `Synced ${formatTimeSinceSync()}`}
          </span>
          
          {!isOnline ? (
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2 h-7 text-xs"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          ) : pendingSync ? (
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2 h-7 text-xs"
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          ) : null}
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 ml-1 -mr-2"
            onClick={() => setIsVisible(false)}
          >
            <span className="sr-only">Dismiss</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </Button>
    </div>
  );
}
