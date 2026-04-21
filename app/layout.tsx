import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'Canchita — Organizá tu fútbol',
  description: 'Organizá tu fútbol amateur en minutos. Armá la formación, compartí por WhatsApp.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Canchita',
  },
  icons: {
    apple: '/icons/icon-192.png',
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
        {children}
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
