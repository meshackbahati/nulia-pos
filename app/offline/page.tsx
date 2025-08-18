'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/stores/useAppStore';

export default function OfflinePage() {
  const router = useRouter();
  const { isOnline } = useAppStore();

  // Redirect to home when back online
  useEffect(() => {
    if (isOnline) {
      router.push('/');
    }
  }, [isOnline, router]);

  const handleRetry = () => {
    if (isOnline) {
      router.push('/');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isOnline ? 'You\'re back online!' : 'You\'re offline'}
        </h1>
        <p className="text-gray-600">
          {isOnline
            ? 'Redirecting you back to the app...'
            : 'Please check your internet connection and try again.'}
        </p>
        <div className="pt-4">
          <Button
            onClick={handleRetry}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!isOnline}
          >
            {isOnline ? 'Go to Home' : 'Offline'}
          </Button>
        </div>
        {!isOnline && (
          <div className="text-sm text-gray-500 mt-4">
            <p>While you're offline, you can still:</p>
            <ul className="list-disc list-inside text-left mt-2 space-y-1">
              <li>View previously loaded products</li>
              <li>Add items to your cart</li>
              <li>View your order history</li>
            </ul>
            <p className="mt-2">
              Your changes will sync when you're back online.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
