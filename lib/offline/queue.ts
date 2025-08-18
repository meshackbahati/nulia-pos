import { useCallback, useEffect, useState } from 'react';
import { useCartStore } from '@/lib/stores/useCartStore';
import { useAppStore } from '@/lib/stores/useAppStore';

interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body: any;
  timestamp: number;
  retryCount: number;
}

const QUEUE_KEY = 'offline-queue';
const MAX_RETRIES = 3;
const RETRY_DELAY = 5 * 60 * 1000; // 5 minutes

export const useOfflineQueue = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { isOffline, setPendingSync } = useCartStore();
  const { updateLastSynced } = useAppStore();

  // Load queue from localStorage
  const getQueue = useCallback((): QueuedRequest[] => {
    if (typeof window === 'undefined') return [];
    const queue = localStorage.getItem(QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  }, []);

  // Save queue to localStorage
  const saveQueue = useCallback((queue: QueuedRequest[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }
  }, []);

  // Add request to queue
  const enqueue = useCallback(
    async (url: string, method: string, body: any) => {
      const queue = getQueue();
      const newRequest: QueuedRequest = {
        id: crypto.randomUUID(),
        url,
        method,
        body,
        timestamp: Date.now(),
        retryCount: 0,
      };

      const updatedQueue = [...queue, newRequest];
      saveQueue(updatedQueue);
      setPendingSync(true);

      // If online, try to process the queue
      if (!isOffline) {
        await processQueue();
      }

      return newRequest.id;
    },
    [getQueue, isOffline, saveQueue, setPendingSync]
  );

  // Process the queue
  const processQueue = useCallback(async () => {
    if (isProcessing || isOffline) return;
    
    setIsProcessing(true);
    let queue = getQueue();
    
    if (queue.length === 0) {
      setIsProcessing(false);
      setPendingSync(false);
      return;
    }

    const failedRequests: QueuedRequest[] = [];
    
    // Process each request in the queue
    for (const request of queue) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: {
            'Content-Type': 'application/json',
            'X-Offline-Request': 'true',
          },
          body: JSON.stringify(request.body),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Request succeeded, remove from queue
        queue = queue.filter((r) => r.id !== request.id);
        saveQueue(queue);
        
        // Update last synced time
        updateLastSynced();
      } catch (error) {
        console.error('Failed to process queued request:', error);
        
        // Increment retry count
        request.retryCount += 1;
        request.timestamp = Date.now();
        
        // Remove if max retries reached
        if (request.retryCount >= MAX_RETRIES) {
          console.warn(`Max retries reached for request ${request.id}`);
          queue = queue.filter((r) => r.id !== request.id);
        } else {
          failedRequests.push(request);
        }
      }
    }

    // Save any remaining failed requests
    if (failedRequests.length > 0) {
      saveQueue([...queue.filter((r) => !failedRequests.some(fr => fr.id === r.id)), ...failedRequests]);
      setPendingSync(true);
    } else if (queue.length === 0) {
      setPendingSync(false);
    } else {
      setPendingSync(true);
    }
    
    setIsProcessing(false);

    // If there are still items in the queue, schedule the next retry
    if (queue.length > 0) {
      setTimeout(processQueue, RETRY_DELAY);
    }
  }, [getQueue, isOffline, isProcessing, saveQueue, setPendingSync, updateLastSynced]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      processQueue();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [processQueue]);

  // Initial processing
  useEffect(() => {
    if (!isOffline) {
      processQueue();
    }
  }, [isOffline, processQueue]);

  return {
    enqueue,
    processQueue,
    isProcessing,
    queueLength: getQueue().length,
  };
};

// Higher order function to wrap API calls with offline queue
export const withOfflineSupport = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  getUrl: (...args: T) => string,
  method: string = 'POST'
) => {
  return async (...args: T): Promise<R> => {
    const url = getUrl(...args);
    const isOnline = navigator.onLine;
    
    if (!isOnline) {
      // If offline, add to queue and return a resolved promise
      const queue = new useOfflineQueue();
      const id = await queue.enqueue(url, method, args[0]);
      return Promise.resolve({
        success: false,
        message: 'Request queued for later processing',
        queueId: id,
        isOffline: true,
      } as unknown as R);
    }
    
    try {
      // If online, make the request
      return await fn(...args);
    } catch (error) {
      // If request fails, add to queue
      const queue = new useOfflineQueue();
      const id = await queue.enqueue(url, method, args[0]);
      return Promise.resolve({
        success: false,
        message: 'Request failed and queued for retry',
        queueId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as unknown as R);
    }
  };
};
