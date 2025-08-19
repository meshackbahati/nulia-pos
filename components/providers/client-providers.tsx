'use client';

import { Inter, Roboto_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { ScannerProvider } from '@/contexts/ScannerContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { Suspense, useEffect, useState } from 'react';
import { ToastProvider } from '@/components/ui/toast';
import { AlertProvider } from '@/lib/utils/alert';

// Load fonts with optimized subsets
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '500', '600'],
});

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${robotoMono.variable} font-sans antialiased`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&family=Roboto+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <AuthProvider>
          <ToastProvider>
            <ScannerProvider>
              <AlertProvider>
                <Suspense
                  fallback={
                    <div className="flex h-screen w-full items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    </div>
                  }
                >
                  {children}
                </Suspense>
                <Toaster />
                <Suspense>
                  <div id="offline-status" />
                </Suspense>
              </AlertProvider>
            </ScannerProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
