import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import ClientProviders from '@/components/providers/client-providers';
import { AppProviders } from '@/providers/AppProviders';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import './globals.css';

// Load Inter font for the server component
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
});

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&family=Roboto+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <ErrorBoundary>
          <AppProviders>
            <ClientProviders>
              {children}
            </ClientProviders>
          </AppProviders>
        </ErrorBoundary>
      </body>
    </html>
  );
}
