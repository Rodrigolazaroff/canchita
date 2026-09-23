import type { Metadata, Viewport } from 'next'
import { Oswald, DM_Sans } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { Suspense } from 'react'
import { PostHogProvider } from '@/components/providers/PostHogProvider'

// Self-hosted por next/font: sin @import bloqueante a fonts.googleapis.com.
const oswald = Oswald({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-oswald',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

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
  // Sin maximumScale ni userScalable:false. Bloquear el zoom rompe WCAG 1.4.4
  // y deja afuera a cualquiera que necesite agrandar para leer.
  viewportFit: 'cover',
  themeColor: '#0a0f0d',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${oswald.variable} ${dmSans.variable}`}>
      <body suppressHydrationWarning>
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-3 focus:left-3 focus:rounded-xl focus:bg-surface focus:px-4 focus:py-3 focus:text-text-primary focus:outline focus:outline-2 focus:outline-green-light"
        >
          Saltar al contenido
        </a>
        <Suspense fallback={null}>
          <PostHogProvider>{children}</PostHogProvider>
        </Suspense>
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: { background: '#18211d', border: '1px solid #2e3d35', color: '#f0fdf4' },
          }}
        />
      </body>
    </html>
  )
}
