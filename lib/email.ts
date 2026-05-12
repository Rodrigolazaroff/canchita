'use server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendWelcomeEmail(to: string, nombre: string) {
  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to,
    subject: 'Bienvenido a Canchita ⚽ — Tu grupo te espera',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111">
        <h2 style="color:#16a34a">¡Hola ${nombre}! 👋</h2>
        <p>Ya sos parte de <strong>Canchita</strong>. Tres pasos para empezar:</p>
        <ol style="line-height:2">
          <li>Creá tu grupo</li>
          <li>Agregá tus jugadores</li>
          <li>Armá tu primer partido</li>
        </ol>
        <a href="https://canchita-sigma.vercel.app/onboarding"
           style="display:inline-block;margin-top:16px;padding:12px 24px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">
          Empezar ahora →
        </a>
        <p style="margin-top:32px;color:#6b7280;font-size:13px">El equipo de Canchita</p>
      </div>
    `,
  })
}
