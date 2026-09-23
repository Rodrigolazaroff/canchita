import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0a0f0d',
        surface: '#111816',
        // Elevación intermedia para superficies apiladas (modal sobre card).
        elevated: '#18211d',
        border: '#2e3d35',
        // Borde con 3:1 real: usar donde delimita un control (inputs, toggles).
        'border-strong': '#556b61',
        green: {
          // Fondo del botón primario. Lleva texto `green-ink`, nunca blanco:
          // blanco sobre este verde da 2.3:1 y no pasa AA.
          primary: '#22c55e',
          hover: '#4ade80',
          pressed: '#16a34a',
          ink: '#06100b',
          light: '#4ade80',
          muted: '#166534',
        },
        text: {
          primary: '#f0fdf4',
          secondary: '#9ca3af',
          muted: '#8b94a3',
        },
      },
      fontFamily: {
        display: ['var(--font-oswald)', 'sans-serif'],
        body: ['var(--font-dm-sans)', 'sans-serif'],
      },
      spacing: {
        // Altura mínima de touch target (WCAG 2.5.5 / Apple HIG).
        touch: '44px',
        'safe-b': 'env(safe-area-inset-bottom)',
        'safe-t': 'env(safe-area-inset-top)',
      },
      animation: {
        'slide-up': 'slideUp 0.2s ease-out',
        'slide-in': 'slideIn 0.25s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        slideIn: {
          from: { transform: 'translateX(20px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
