'use client'
import { useEffect, useRef, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Download, Share2, Sparkles, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { trackFormationShared } from '@/lib/analytics'

export interface ResultScorer {
  name: string
  goals: number
}

interface ResultShareModalProps {
  open: boolean
  onClose: () => void
  matchId: string
  groupName: string
  venueName: string
  matchDate: string
  matchTime: string
  scoreDark: number
  scoreLight: number
  scorersDark: ResultScorer[]
  scorersLight: ResultScorer[]
}

export function ResultShareModal({
  open, onClose, matchId, groupName, venueName, matchDate, matchTime,
  scoreDark, scoreLight, scorersDark, scorersLight,
}: ResultShareModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [narration, setNarration] = useState<string>('')
  const [loadingNarration, setLoadingNarration] = useState(false)

  useEffect(() => {
    if (open) {
      generateImage()
      fetchNarration()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function fetchNarration() {
    setLoadingNarration(true)
    try {
      const res = await fetch('/api/narrate-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupName, venueName, matchDate,
          scoreDark, scoreLight, scorersDark, scorersLight,
        }),
      })
      const data = await res.json()
      if (res.ok && data.text) {
        setNarration(data.text)
      } else {
        setNarration('')
      }
    } catch {
      setNarration('')
    }
    setLoadingNarration(false)
  }

  function generateImage() {
    const canvas = canvasRef.current
    if (!canvas) return

    const W = 1080
    const H = 1120
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!
    const cx = W / 2

    const winner =
      scoreDark > scoreLight ? 'dark' : scoreLight > scoreDark ? 'light' : 'draw'

    // ── Fondo ────────────────────────────────────────────────────────────────
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, '#0a0f0d')
    grad.addColorStop(1, '#101a14')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    // ── Header ───────────────────────────────────────────────────────────────
    ctx.textAlign = 'center'
    ctx.fillStyle = '#4ade80'
    ctx.font = 'bold 48px sans-serif'
    ctx.fillText('CANCHITA', cx, 90)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 36px sans-serif'
    ctx.fillText(groupName || 'Resultado del partido', cx, 150)

    const dateStr = (() => {
      try {
        return new Date(matchDate + 'T00:00:00').toLocaleDateString('es-AR', {
          weekday: 'long', day: '2-digit', month: 'long',
        })
      } catch { return matchDate }
    })()
    ctx.fillStyle = '#9ca3af'
    ctx.font = '26px sans-serif'
    const sub = [venueName, `${dateStr} · ${matchTime.slice(0, 5)}`]
      .filter(Boolean).join('  ·  ')
    ctx.fillText(sub, cx, 200)

    // ── Marcador ─────────────────────────────────────────────────────────────
    const boardY = 290
    const boardH = 360
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    ctx.beginPath()
    ctx.roundRect(60, boardY, W - 120, boardH, 28)
    ctx.fill()

    const colDarkX = W * 0.28
    const colLightX = W * 0.72
    const dotY = boardY + 50      // muestra de color (arriba de todo)
    const labelY = boardY + 110   // nombre del equipo
    const numY = boardY + 260     // número grande
    const crownY = boardY + 320   // ganador / empate

    // Círculos de muestra de color (arriba, sin pisar el número)
    const drawDot = (x: number, fill: string, stroke: string) => {
      ctx.beginPath()
      ctx.arc(x, dotY, 16, 0, Math.PI * 2)
      ctx.fillStyle = fill
      ctx.fill()
      ctx.lineWidth = 3
      ctx.strokeStyle = stroke
      ctx.stroke()
    }
    drawDot(colDarkX, '#000000', '#ffffff')
    drawDot(colLightX, '#ffffff', '#000000')

    // Etiquetas equipo
    ctx.textAlign = 'center'
    ctx.font = 'bold 38px sans-serif'
    ctx.fillStyle = '#cbd5e1'
    ctx.fillText('OSCURO', colDarkX, labelY)
    ctx.fillText('CLARO', colLightX, labelY)

    // Números
    ctx.font = 'bold 140px sans-serif'
    ctx.fillStyle = winner === 'dark' ? '#4ade80' : '#ffffff'
    ctx.fillText(String(scoreDark), colDarkX, numY)
    ctx.fillStyle = winner === 'light' ? '#4ade80' : '#ffffff'
    ctx.fillText(String(scoreLight), colLightX, numY)

    // Guion del medio
    ctx.fillStyle = '#6b7280'
    ctx.font = 'bold 80px sans-serif'
    ctx.fillText('-', cx, numY - 35)

    // Corona / empate
    ctx.font = 'bold 30px sans-serif'
    ctx.fillStyle = '#fbbf24'
    if (winner === 'dark') ctx.fillText('👑 GANADOR', colDarkX, crownY)
    else if (winner === 'light') ctx.fillText('👑 GANADOR', colLightX, crownY)
    else {
      ctx.fillStyle = '#9ca3af'
      ctx.fillText('🤝 EMPATE', cx, crownY)
    }

    // ── Goleadores ───────────────────────────────────────────────────────────
    const scorersTop = boardY + boardH + 70
    const lineH = 44

    const drawScorers = (list: ResultScorer[], x: number, title: string, color: string) => {
      ctx.textAlign = 'center'
      ctx.font = 'bold 28px sans-serif'
      ctx.fillStyle = color
      ctx.fillText(title, x, scorersTop)
      ctx.font = '28px sans-serif'
      ctx.fillStyle = '#e5e7eb'
      if (!list.length) {
        ctx.fillStyle = '#6b7280'
        ctx.fillText('—', x, scorersTop + lineH)
        return
      }
      list.forEach((s, i) => {
        const label = s.goals > 1 ? `${s.name} ×${s.goals}` : s.name
        ctx.fillText(`⚽ ${label}`, x, scorersTop + lineH * (i + 1))
      })
    }
    drawScorers(scorersDark, colDarkX, 'Goleadores Oscuro', '#93c5fd')
    drawScorers(scorersLight, colLightX, 'Goleadores Claro', '#cbd5e1')

    // ── Footer branding ──────────────────────────────────────────────────────
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '24px sans-serif'
    ctx.fillText('canchita ⚽ armá tu partido', cx, H - 50)

    setImageUrl(canvas.toDataURL('image/png'))
  }

  async function handleShare() {
    if (!imageUrl) return

    // WhatsApp y la mayoría de las apps IGNORAN el texto cuando se comparte una
    // imagen (limitación de la plataforma, no del código). Por eso copiamos el
    // relato al portapapeles para que el usuario lo pegue. Lo hacemos PRIMERO,
    // antes de cualquier await, para conservar el gesto del usuario (iOS/Safari).
    let copied = false
    if (narration) {
      try {
        await navigator.clipboard.writeText(narration)
        copied = true
      } catch { /* sin permiso de portapapeles: seguimos igual */ }
    }

    try {
      const blob = await (await fetch(imageUrl)).blob()
      const file = new File([blob], 'canchita-resultado.png', { type: 'image/png' })

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        // NO pasamos `text` acá a propósito: algunas plataformas (WhatsApp
        // Web/Desktop) lo honran y otras lo ignoran. Si lo mandáramos por el
        // share Y por el portapapeles, en Desktop quedaría duplicado. Por eso
        // el relato va SOLO por el portapapeles (canal único, sin duplicados).
        await navigator.share({
          files: [file],
          title: `Resultado ${groupName}`,
        })
        trackFormationShared({ match_id: matchId, method: 'native_share_result' })
        if (copied) toast.success('Relato copiado 📋 Pegalo en el mensaje')
      } else {
        handleDownload()
        trackFormationShared({ match_id: matchId, method: 'download_result' })
        if (copied) toast.success('Relato copiado 📋 Pegalo junto a la imagen')
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.error('No se pudo compartir')
    }
  }

  function handleDownload() {
    if (!imageUrl) return
    const a = document.createElement('a')
    a.href = imageUrl
    a.download = 'canchita-resultado.png'
    a.click()
  }

  async function copyNarration() {
    if (!narration) return
    try {
      await navigator.clipboard.writeText(narration)
      toast.success('Relato copiado')
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="¡Resultado listo!" className="max-w-md sm:max-w-lg no-scrollbar" disableBackdropClose>
      <canvas ref={canvasRef} className="hidden" />
      <div className="flex flex-col gap-4">
        {imageUrl ? (
          <div className="flex justify-center overflow-hidden rounded-xl border border-border bg-black/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Resultado"
              className="max-h-[42vh] w-auto object-contain"
            />
          </div>
        ) : (
          <div className="w-full bg-border rounded-xl animate-pulse flex items-center justify-center" style={{ aspectRatio: '1080/1120' }}>
            <p className="text-text-muted font-body">Generando imagen...</p>
          </div>
        )}

        {/* Narración generada por IA */}
        <div className="rounded-xl border border-border bg-surface/50 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-green-light font-body">
              <Sparkles size={14} /> Relato del partido
            </span>
            <button
              onClick={fetchNarration}
              disabled={loadingNarration}
              className="text-text-muted hover:text-green-light transition-colors disabled:opacity-50"
              title="Generar otro"
            >
              <RefreshCw size={14} className={loadingNarration ? 'animate-spin' : ''} />
            </button>
          </div>
          {loadingNarration ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-3 bg-border rounded w-full" />
              <div className="h-3 bg-border rounded w-5/6" />
              <div className="h-3 bg-border rounded w-2/3" />
            </div>
          ) : narration ? (
            <p
              onClick={copyNarration}
              className="font-body text-sm text-text-secondary leading-relaxed cursor-pointer"
              title="Tocá para copiar"
            >
              {narration}
            </p>
          ) : (
            <p className="font-body text-sm text-text-muted">
              No se pudo generar el relato. Podés compartir igual la imagen.
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleDownload} disabled={!imageUrl} className="flex-1">
            <Download size={16} /> Descargar
          </Button>
          <Button onClick={handleShare} disabled={!imageUrl} className="flex-1">
            <Share2 size={16} /> Compartir
          </Button>
        </div>
        <Button variant="ghost" onClick={onClose} className="w-full text-text-muted">
          Ir al partido
        </Button>
      </div>
    </Modal>
  )
}
