import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bordershop POS',
  description: 'Professional Point of Sale System for Bordershop',
  generator: 'Bordershop POS',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  keywords: ['point of sale', 'retail', 'inventory', 'billing', 'bordershop'],
  authors: [{ name: 'Bordershop' }],
  creator: 'Bordershop',
  publisher: 'Bordershop',
};

export default metadata;
