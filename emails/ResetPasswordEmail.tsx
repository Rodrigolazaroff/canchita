import * as React from 'react'

interface ResetPasswordEmailProps {
  firstName: string
  resetUrl: string
}

export function ResetPasswordEmail({ firstName, resetUrl }: ResetPasswordEmailProps) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Recuperar contraseña · Canchita</title>
      </head>
      <body style={styles.body}>
        <div style={styles.wrapper}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.logo}>⚽</div>
            <h1 style={styles.brand}>Canchita</h1>
            <p style={styles.tagline}>Organizá tu fútbol amateur</p>
          </div>

          {/* Card */}
          <div style={styles.card}>
            {/* Icon */}
            <div style={styles.iconWrapper}>
              <span style={styles.icon}>🔑</span>
            </div>

            <h2 style={styles.title}>Recuperar contraseña</h2>
            <p style={styles.text}>
              Hola {firstName}, recibimos un pedido para restablecer la contraseña de tu cuenta.
              Hacé click en el botón y elegí una nueva.
            </p>

            <div style={styles.ctaWrapper}>
              <a href={resetUrl} style={styles.button}>
                Restablecer contraseña
              </a>
            </div>

            <div style={styles.alertBox}>
              <p style={styles.alertText}>
                ⏱ Este link expira en <strong>1 hora</strong>.
              </p>
              <p style={styles.alertText} >
                🔒 Si no fuiste vos, ignorá este email. Tu contraseña actual sigue siendo la misma.
              </p>
            </div>

            <div style={styles.divider} />

            <p style={styles.smallText}>
              Si el botón no funciona, copiá y pegá este link en tu navegador:
            </p>
            <p style={styles.linkText}>{resetUrl}</p>
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <p style={styles.footerText}>
              © {new Date().getFullYear()} Canchita · Hecho con ❤️ para el fútbol amateur
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}

const styles: Record<string, React.CSSProperties> = {
  body: {
    backgroundColor: '#0f1117',
    margin: 0,
    padding: '32px 16px',
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
  wrapper: {
    maxWidth: '520px',
    margin: '0 auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  logo: {
    fontSize: '48px',
    lineHeight: 1,
    marginBottom: '8px',
  },
  brand: {
    color: '#ffffff',
    fontSize: '28px',
    fontWeight: 700,
    margin: '0 0 4px 0',
    letterSpacing: '-0.5px',
  },
  tagline: {
    color: '#6b7280',
    fontSize: '14px',
    margin: 0,
  },
  card: {
    backgroundColor: '#1a1d27',
    borderRadius: '16px',
    padding: '36px 32px',
    border: '1px solid #2a2d3a',
  },
  iconWrapper: {
    textAlign: 'center',
    marginBottom: '16px',
  },
  icon: {
    fontSize: '40px',
  },
  title: {
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: 700,
    margin: '0 0 16px 0',
    textAlign: 'center',
  },
  text: {
    color: '#9ca3af',
    fontSize: '15px',
    lineHeight: 1.6,
    margin: '0 0 28px 0',
  },
  ctaWrapper: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  button: {
    display: 'inline-block',
    backgroundColor: '#22c55e',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 700,
    textDecoration: 'none',
    padding: '14px 36px',
    borderRadius: '12px',
    letterSpacing: '0.2px',
  },
  alertBox: {
    backgroundColor: '#1e2330',
    borderRadius: '10px',
    padding: '14px 18px',
    marginBottom: '24px',
    border: '1px solid #2a2d3a',
  },
  alertText: {
    color: '#9ca3af',
    fontSize: '13px',
    margin: '0 0 6px 0',
    lineHeight: 1.5,
  },
  divider: {
    borderTop: '1px solid #2a2d3a',
    margin: '0 0 20px 0',
  },
  smallText: {
    color: '#6b7280',
    fontSize: '12px',
    margin: '0 0 6px 0',
  },
  linkText: {
    color: '#22c55e',
    fontSize: '12px',
    wordBreak: 'break-all',
    margin: 0,
  },
  footer: {
    textAlign: 'center',
    marginTop: '24px',
  },
  footerText: {
    color: '#4b5563',
    fontSize: '12px',
    margin: 0,
  },
}
