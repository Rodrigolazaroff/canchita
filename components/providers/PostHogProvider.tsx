'use client'
import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { initAnalytics, identifyUser, trackPageview } from '@/lib/analytics'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastPath = useRef<string>('')

  useEffect(() => {
    initAnalytics()
    // Identificar usuario desde sesión existente
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) identifyUser(user.id, { email: user.email })
    })
  }, [])

  useEffect(() => {
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
    if (url === lastPath.current) return
    lastPath.current = url
    trackPageview(url)
  }, [pathname, searchParams])

  return <>{children}</>
}
