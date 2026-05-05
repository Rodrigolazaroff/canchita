import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resend, FROM_EMAIL } from '@/lib/resend'
import { ResetPasswordEmail } from '@/emails/ResetPasswordEmail'
import { createElement } from 'react'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'email requerido' }, { status: 400 })
    }

    // Admin client para generar el link de recovery
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Buscar el usuario para obtener su nombre
    const { data: userData } = await supabaseAdmin.auth.admin.listUsers()
    const user = userData?.users?.find(u => u.email === email)
    const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'ahí'

    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=recovery`,
      },
    })

    if (linkError || !data?.properties?.action_link) {
      console.error('Error generando link de recovery:', linkError)
      // No revelar si el email existe o no (seguridad)
      return NextResponse.json({ success: true })
    }

    const resetUrl = data.properties.action_link

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: '🔑 Recuperá tu contraseña de Canchita',
      react: createElement(ResetPasswordEmail, { firstName, resetUrl }),
    })

    // Siempre responder success (no revelar si el email existe)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error en /api/emails/reset:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
