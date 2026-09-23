'use client'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Download, X } from 'lucide-react'

const CLAVE = 'canchita:install-prompt'
const MAX_VISTAS = 3
const DEMORA_MS = 2500

type Guardado = { vistas: number; listo: boolean }

function leerGuardado(): Guardado {
  try {
    const raw = localStorage.getItem(CLAVE)
    if (!raw) return { vistas: 0, listo: false }
    const p = JSON.parse(raw) as Partial<Guardado>
    return { vistas: Number(p.vistas) || 0, listo: !!p.listo }
  } catch {
    // Modo privado o storage bloqueado: se comporta como si ya lo hubiera visto,
    // así no molesta en cada carga sin poder llevar la cuenta.
    return { vistas: MAX_VISTAS, listo: true }
  }
}

function guardar(v: Guardado) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(v))
  } catch {}
}

const enStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true

const esIOS = () => {
  const ua = navigator.userAgent || ''
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

// Hay algo para ofrecer si Chrome ya nos pasó el evento o si es un iPhone,
// donde se instala a mano desde Safari. En escritorio no.
function hayAlgoQueOfrecer() {
  if (enStandalone() || window.__canchitaPWA?.instalada) return false
  return !!window.__canchitaPWA?.evento || esIOS()
}

function suscribir(avisar: () => void) {
  addEventListener('canchita:pwa', avisar)
  return () => removeEventListener('canchita:pwa', avisar)
}

export function InstallPrompt() {
  const router = useRouter()
  const pathname = usePathname()
  const ofrecible = useSyncExternalStore(suscribir, hayAlgoQueOfrecer, () => false)
  const [visible, setVisible] = useState(false)

  // En Perfil sobra: el botón de instalar está ahí abajo.
  const enPerfil = pathname === '/profile'

  useEffect(() => {
    if (!ofrecible || enPerfil) return
    const { vistas, listo } = leerGuardado()
    if (listo || vistas >= MAX_VISTAS) return

    // Un respiro antes de aparecer: que no salte encima de la pantalla al entrar.
    const t = setTimeout(() => {
      setVisible(true)
      // La vista se cuenta recién cuando se muestra de verdad.
      guardar({ vistas: vistas + 1, listo: false })
    }, DEMORA_MS)
    return () => clearTimeout(t)
  }, [ofrecible, enPerfil])

  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible])

  function cerrar() {
    setVisible(false)
  }

  function aceptar() {
    // Dijo que sí: no se le pregunta más, vaya o no hasta el final.
    guardar({ vistas: MAX_VISTAS, listo: true })
    setVisible(false)
    router.push('/profile')
  }

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label="Instalar Canchita"
      className="fixed inset-x-0 z-40 px-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-6 md:left-auto md:right-6 md:px-0 md:w-80 motion-safe:animate-slide-up"
    >
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-elevated p-4 shadow-2xl shadow-black/50">
        <div className="flex items-start gap-3">
          <span className="grid place-items-center w-10 h-10 shrink-0 rounded-xl bg-green-primary/15 text-green-light">
            <Download size={18} aria-hidden="true" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-body font-semibold text-text-primary">¿Querés instalar la app?</p>
            <p className="font-body text-sm text-text-secondary mt-0.5">
              Queda con ícono propio y abre sin la barra del navegador.
            </p>
          </div>
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar"
            className="grid place-items-center w-9 h-9 -mt-1 -mr-1 shrink-0 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={cerrar}
            className="flex-1 min-h-touch rounded-xl border border-border font-body font-semibold text-sm text-text-secondary hover:bg-surface transition-colors"
          >
            Más tarde
          </button>
          <button
            type="button"
            onClick={aceptar}
            className="flex-1 min-h-touch rounded-xl bg-green-primary font-body font-semibold text-sm text-green-ink hover:bg-green-hover transition-colors"
          >
            Sí, instalar
          </button>
        </div>
      </div>
    </div>
  )
}
