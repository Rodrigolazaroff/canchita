import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // Excluye assets internos de Next, manifest, service worker, y cualquier
    // archivo con extensión de imagen (incluye los convention files de App
    // Router: icon.jpg, apple-icon.jpg, opengraph-image.jpg, twitter-image.jpg)
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox-.*|.*\\.(?:jpg|jpeg|png|gif|svg|webp|ico)).*)',
  ],
}
