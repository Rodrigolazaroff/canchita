import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type') // 'recovery' cuando viene del email de reset

  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)

    // Si es recuperación de contraseña → llevar a la página de reset
    if (type === 'recovery') {
      return NextResponse.redirect(`${origin}/reset-password`)
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: groups } = await supabase
        .from('groups')
        .select('id')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .limit(1)

      if (!groups || groups.length === 0) {
        return NextResponse.redirect(`${origin}/onboarding`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
