'use client'
import { useEffect, useState } from 'react'
import { Download, Share, Plus, MoreVertical, Check } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Platform = 'android' | 'ios' | 'desktop'

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  // iPadOS 13+ se hace pasar por Mac: se lo detecta por el touch.
  const isIpad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
  if (/iPhone|iPod|iPad/.test(ua) || isIpad) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

function isInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari en iOS no soporta display-mode y usa su propia bandera.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function InstallAppButton() {
  const [mounted, setMounted] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [platform, setPlatform] = useState<Platform>('desktop')
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    setPlatform(detectPlatform())
    setInstalled(isInstalled())

    // Chrome/Edge lo disparan cuando la PWA es instalable; hay que guardarlo
    // porque prompt() solo se puede llamar desde un gesto del usuario.
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setOpen(false)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function handleClick() {
    if (deferred) {
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      if (outcome === 'accepted') setInstalled(true)
      setDeferred(null)
      return
    }
    // Sin evento nativo (iOS siempre, Android si ya lo descartó): instrucciones.
    setOpen(true)
  }

  // Nada que ofrecer si ya está instalada, y nada hasta montar para que el
  // servidor y el cliente rendericen lo mismo.
  if (!mounted || installed) return null

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="w-full text-left rounded-2xl"
        aria-haspopup={deferred ? undefined : 'dialog'}
      >
        <Card className="flex items-center gap-3 hover:border-green-primary/30 transition-colors">
          <Download size={18} className="text-text-muted" aria-hidden="true" />
          <span className="flex-1 font-body text-text-primary">Instalar la app</span>
          <span className="font-body text-xs text-text-muted">
            {platform === 'ios' ? 'iOS' : platform === 'android' ? 'Android' : 'Escritorio'}
          </span>
        </Card>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Instalar Canchita">
        <div className="flex flex-col gap-5">
          <p className="font-body text-sm text-text-secondary">
            Queda como una app más en la pantalla de inicio, sin barra del navegador.
          </p>

          {platform === 'ios' ? (
            <Steps
              steps={[
                { icon: <Share size={16} aria-hidden="true" />, text: 'Tocá Compartir en la barra de Safari.' },
                { icon: <Plus size={16} aria-hidden="true" />, text: 'Elegí "Agregar a inicio".' },
                { icon: <Check size={16} aria-hidden="true" />, text: 'Confirmá con Agregar.' },
              ]}
            />
          ) : (
            <Steps
              steps={[
                { icon: <MoreVertical size={16} aria-hidden="true" />, text: 'Abrí el menú del navegador.' },
                { icon: <Download size={16} aria-hidden="true" />, text: 'Elegí "Instalar app" o "Agregar a pantalla principal".' },
                { icon: <Check size={16} aria-hidden="true" />, text: 'Confirmá.' },
              ]}
            />
          )}

          {platform === 'ios' && (
            <p className="font-body text-xs text-text-muted">
              En iOS solo funciona desde Safari. Si estás en Chrome o Firefox, abrí
              canchita ahí primero.
            </p>
          )}

          <Button onClick={() => setOpen(false)} className="w-full">
            Listo
          </Button>
        </div>
      </Modal>
    </>
  )
}

function Steps({ steps }: { steps: { icon: React.ReactNode; text: string }[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {steps.map((s, i) => (
        <li key={i} className="flex items-center gap-3">
          <span className="grid place-items-center w-9 h-9 shrink-0 rounded-xl bg-surface border border-border text-green-light">
            {s.icon}
          </span>
          <span className="font-body text-sm text-text-primary">{s.text}</span>
        </li>
      ))}
    </ol>
  )
}
