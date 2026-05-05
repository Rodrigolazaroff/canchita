import { NextResponse } from 'next/server'
import { resend, FROM_EMAIL } from '@/lib/resend'
import { ConfirmAccountEmail } from '@/emails/ConfirmAccountEmail'
import { createElement } from 'react'

export async function POST(req: Request) {
  try {
    const { email, firstName } = await req.json()

    if (!email || !firstName) {
      return NextResponse.json({ error: 'email y firstName requeridos' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const { error: sendError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: '⚽ ¡Bienvenido a Canchita!',
      react: createElement(ConfirmAccountEmail, {
        firstName,
        loginUrl: `${appUrl}/`,
      }),
    })

    if (sendError) {
      console.error('Error enviando welcome email:', sendError)
      return NextResponse.json({ error: 'No se pudo enviar el email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error en /api/emails/confirm:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
