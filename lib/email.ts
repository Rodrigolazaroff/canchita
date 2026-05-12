'use server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendWelcomeEmail(to: string, nombre: string) {
  await resend.emails.send({
    from: 'Canchita <onboarding@resend.dev>',
    to,
    template_id: process.env.RESEND_WELCOME_TEMPLATE_ID,
    data: { nombre },
  } as Parameters<typeof resend.emails.send>[0])
}
