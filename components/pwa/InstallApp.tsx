'use client'
import { useState, useSyncExternalStore } from 'react'
import { Download, Share, Check } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

type EventoInstalar = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window {
    __canchitaPWA?: { evento: EventoInstalar | null; instalada: boolean }
  }
}

const enStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  // Safari en iOS no soporta display-mode y usa su propia bandera.
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true

// iPadOS 13+ se hace pasar por Mac: se delata por el touch.
const esIOS = () => {
  const ua = navigator.userAgent || ''
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

type Estado = 'instalada' | 'disponible' | 'ios' | 'sin-boton'

// Quien manda es el navegador, no React: el estado se lee del store que llena
// el script de ScriptPWA. En el servidor devuelve 'sin-boton' y no hay mismatch.
function leer(): Estado {
  if (window.__canchitaPWA?.instalada || enStandalone()) return 'instalada'
  if (window.__canchitaPWA?.evento) return 'disponible'
  return esIOS() ? 'ios' : 'sin-boton'
}

function suscribir(avisar: () => void) {
  const media = window.matchMedia('(display-mode: standalone)')
  addEventListener('canchita:pwa', avisar)
  media.addEventListener('change', avisar)
  return () => {
    removeEventListener('canchita:pwa', avisar)
    media.removeEventListener('change', avisar)
  }
}

const PASOS_IOS = [
  'Tocá Compartir, abajo en el medio de la barra de Safari.',
  'Bajá en la lista y elegí "Agregar a inicio".',
  'Confirmá con Agregar, arriba a la derecha.',
]

export function InstallApp() {
  const estado = useSyncExternalStore(suscribir, leer, () => 'sin-boton' as Estado)
  const [pidiendo, setPidiendo] = useState(false)

  if (estado === 'instalada') return null

  if (estado === 'disponible') {
    return (
      <Button
        className="w-full"
        loading={pidiendo}
        loadingLabel="Abriendo el instalador"
        onClick={async () => {
          const evento = window.__canchitaPWA?.evento
          if (!evento) return
          setPidiendo(true)
          try {
            await evento.prompt()
            const { outcome } = await evento.userChoice
            // El evento sirve una sola vez; si dijo que no, vuelve en otra visita.
            if (window.__canchitaPWA) {
              window.__canchitaPWA.evento = null
              window.__canchitaPWA.instalada = outcome === 'accepted'
            }
            dispatchEvent(new Event('canchita:pwa'))
          } finally {
            setPidiendo(false)
          }
        }}
      >
        <Download size={16} aria-hidden="true" /> Instalar la app
      </Button>
    )
  }

  if (estado === 'ios') {
    return (
      <Card className="flex flex-col gap-3">
        <p className="font-body font-semibold text-sm text-text-primary flex items-center gap-2">
          <Share size={16} className="text-green-light" aria-hidden="true" />
          Tenela como app en el iPhone
        </p>
        <ol className="flex flex-col gap-2">
          {PASOS_IOS.map((paso, i) => (
            <li key={paso} className="flex items-start gap-2.5 font-body text-sm text-text-secondary">
              <span className="grid place-items-center mt-px h-5 w-5 shrink-0 rounded-full bg-green-primary/15 text-[11px] font-semibold text-green-light">
                {i + 1}
              </span>
              {paso}
            </li>
          ))}
        </ol>
        <p className="font-body text-xs text-text-muted">
          En iPhone solo anda desde Safari. Si estás en Chrome no te va a aparecer la
          opción: abrí Canchita en Safari y seguí los pasos.
        </p>
      </Card>
    )
  }

  // Sin evento y sin iOS: no hay botón honesto que mostrar.
  return (
    <Card className="flex items-start gap-2.5">
      <Check size={16} className="mt-0.5 shrink-0 text-text-muted" aria-hidden="true" />
      <p className="font-body text-sm text-text-muted">
        Para instalarla, abrí Canchita en el celular: Chrome en Android o Safari en
        iPhone. Ahí te aparece la opción.
      </p>
    </Card>
  )
}
