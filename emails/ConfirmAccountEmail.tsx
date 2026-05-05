import * as React from 'react'

interface ConfirmAccountEmailProps {
  firstName: string
  loginUrl: string
}

export function ConfirmAccountEmail({ firstName, loginUrl }: ConfirmAccountEmailProps) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>¡Bienvenido a Canchita!</title>
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
            <h2 style={styles.title}>¡Bienvenido, {firstName}!</h2>
            <p style={styles.text}>
              Tu cuenta está lista. Ya podés empezar a organizar partidos, armar equipos,
              registrar goles y compartir todo con tu grupo.
            </p>

            <div style={styles.featuresBox}>
              <div style={styles.feature}><span style={styles.featureIcon}>📅</span> Creá partidos y gestioná fechas</div>
              <div style={styles.feature}><span style={styles.featureIcon}>👥</span> Armá equipos con formaciones</div>
              <div style={styles.feature}><span style={styles.featureIcon}>⚽</span> Registrá goles y estadísticas</div>
              <div style={styles.feature}><span style={styles.featureIcon}>📤</span> Compartí por WhatsApp</div>
            </div>

            <div style={styles.ctaWrapper}>
              <a href={loginUrl} style={styles.button}>
                Ir a Canchita
              </a>
            </div>
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
  title: {
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: 700,
    margin: '0 0 16px 0',
  },
  text: {
    color: '#9ca3af',
    fontSize: '15px',
    lineHeight: 1.6,
    margin: '0 0 24px 0',
  },
  featuresBox: {
    backgroundColor: '#12151f',
    borderRadius: '12px',
    padding: '16px 20px',
    marginBottom: '28px',
    border: '1px solid #2a2d3a',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  feature: {
    color: '#d1d5db',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  featureIcon: {
    fontSize: '16px',
  },
  ctaWrapper: {
    textAlign: 'center',
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
