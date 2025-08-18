import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Toaster } from '@/components/ui/toaster'
import { ScannerProvider } from '@/contexts/ScannerContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { AppProviders } from '@/providers/AppProviders'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { OfflineStatus } from '@/components/OfflineStatus'
import { Suspense } from 'react'
import { ToastProvider } from '@/components/ui/toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bordershop',
  description: 'Comprehensive Point of Sale System for Bordershop',
  generator: 'Bordershop POS',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body className="min-h-screen">
        <ErrorBoundary>
          <AppProviders>
            <AuthProvider>
              <ToastProvider>
                <ScannerProvider>
                  <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
                    {children}
                  </Suspense>
                  <Toaster />
                  <Suspense>
                    <OfflineStatus />
                  </Suspense>
                </ScannerProvider>
              </ToastProvider>
            </AuthProvider>
          </AppProviders>
        </ErrorBoundary>
      </body>
    </html>
  )
}
