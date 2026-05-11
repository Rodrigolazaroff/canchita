import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'sonner'
import { Suspense } from 'react'
import { PostHogProvider } from '@/components/providers/PostHogProvider'

export const metadata: Metadata = {
  metadataBase: new URL('https://canchita-sigma.vercel.app'),
  title: 'Canchita — Organizá tu fútbol',
  description: 'Organizá tu fútbol amateur en minutos. Armá la formación, compartí por WhatsApp.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Canchita',
  },
  openGraph: {
    title: 'Canchita — Organizá tu fútbol',
    description: 'Organizá tu fútbol amateur en minutos. Armá la formación, compartí por WhatsApp.',
    url: 'https://canchita-sigma.vercel.app',
    siteName: 'Canchita',
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Canchita — Organizá tu fútbol',
    description: 'Organizá tu fútbol amateur en minutos. Armá la formación, compartí por WhatsApp.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#16a34a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body suppressHydrationWarning>
        <Suspense fallback={null}>
          <PostHogProvider>{children}</PostHogProvider>
        </Suspense>
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: { background: '#111816', border: '1px solid #1e2923', color: '#f0fdf4' },
          }}
        />
      </body>
    </html>
  )
}
