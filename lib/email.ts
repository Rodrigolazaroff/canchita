'use server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendWelcomeEmail(to: string, nombre: string) {
  await resend.emails.send({
    from: 'Canchita <onboarding@resend.dev>',
    to,
    subject: '¡Bienvenido a Canchita!',
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0f0a;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f0a;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111811;border-radius:16px;border:1px solid #1e2e1e;overflow:hidden">
        <tr>
          <td style="background:linear-gradient(135deg,#1a2f1a,#0f1f0f);padding:32px;text-align:center">
            <div style="font-size:36px;margin-bottom:8px">⚽</div>
            <div style="color:#4ade80;font-size:24px;font-weight:700;letter-spacing:-0.5px">Canchita</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <h1 style="color:#f0faf0;font-size:22px;font-weight:700;margin:0 0 12px">¡Hola, ${nombre}!</h1>
            <p style="color:#8ba88b;font-size:15px;line-height:1.6;margin:0 0 24px">
              Ya sos parte de Canchita. Armá tu equipo, cargá los jugadores y organizá todos tus partidos en un solo lugar.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
              <tr>
                <td style="background:#1a2f1a;border-radius:12px;padding:16px">
                  <div style="color:#4ade80;font-size:13px;font-weight:600;margin-bottom:4px">Próximo paso</div>
                  <div style="color:#c8e6c9;font-size:14px">Completá la configuración de tu organización y agregá tu primer jugador.</div>
                </td>
              </tr>
            </table>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#22c55e;border-radius:10px;padding:14px 28px">
                  <a href="https://canchita-sigma.vercel.app/dashboard" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px">Ir a Canchita →</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #1e2e1e">
            <p style="color:#4a644a;font-size:12px;margin:0;text-align:center">
              Recibiste este email porque te registraste en Canchita.<br>
              Si no fuiste vos, podés ignorar este mensaje.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}
