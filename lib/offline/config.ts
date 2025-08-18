// Configuration for service worker and offline functionality
export const CACHE_NAME = 'bordershop-v1';

export const OFFLINE_URL = '/offline.html';

export const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-256x256.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
];

export const API_CACHE_NAME = 'api-cache-v1';

export const API_ENDPOINTS_TO_CACHE = [
  '/api/products',
  '/api/categories',
  '/api/inventory',
];

export const CACHEABLE_HEADERS = [
  'Content-Type',
  'ETag',
  'Last-Modified',
  'Cache-Control',
  'Content-Length',
];

export const MAX_AGE = 60 * 60 * 24; // 24 hours in seconds

export const SYNC_TAG = 'sync-queue';

export const SYNC_EVENT = 'sync' as const;
