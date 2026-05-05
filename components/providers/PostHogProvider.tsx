'use client'
import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initAnalytics, trackPageview } from '@/lib/analytics'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastPath = useRef<string>('')

  useEffect(() => {
    initAnalytics()
  }, [])

  useEffect(() => {
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
    if (url === lastPath.current) return   // evitar duplicados
    lastPath.current = url
    trackPageview(url)
  }, [pathname, searchParams])

  return <>{children}</>
}
