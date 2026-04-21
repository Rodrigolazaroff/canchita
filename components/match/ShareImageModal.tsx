'use client'
import { useEffect, useRef, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { initials, playerColor } from '@/lib/utils/format'
import type { FormationData } from '@/lib/types'
import { Download, Share2 } from 'lucide-react'
import { toast } from 'sonner'

interface ShareImageModalProps {
  open: boolean
  onClose: () => void
  formation: FormationData
  matchDate: string
  matchTime: string
  venueName: string
  groupName: string
  pricePerPlayer: string
  aliasText: string
  matchId: string
}

export function ShareImageModal({
  open, onClose, formation, matchDate, matchTime, venueName,
  groupName, pricePerPlayer, aliasText, matchId,
}: ShareImageModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (open) generateImage()
  }, [open])

  async function generateImage() {
    const canvas = canvasRef.current
    if (!canvas) return

    // ── Dimensiones ─────────────────────────────────────────────────────────
    const W = 1080
    const H = 1280
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!

    // Márgenes del campo dentro del canvas
    const FX = 50        // left/right del campo
    const FY = 110       // top del campo
    const FW = W - FX * 2
    const FH = 950       // alto del campo

    const cx = W / 2            // centro horizontal
    const cy = FY + FH / 2      // centro vertical del campo

    // ── Fondo del canvas ─────────────────────────────────────────────────────
    ctx.fillStyle = '#0a0f0d'
    ctx.fillRect(0, 0, W, H)

    // ── Franjas verticales alternadas (antes de las líneas) ──────────────────
    const STRIPE_COUNT = 9
    const stripeW = FW / STRIPE_COUNT
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(FX, FY, FW, FH, 14)
    ctx.clip()

    for (let i = 0; i < STRIPE_COUNT; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#33a633' : '#2a922a'
      ctx.fillRect(FX + i * stripeW, FY, stripeW, FH)
    }
    ctx.restore()

    // ── Líneas del campo ─────────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = 3
    ctx.setLineDash([])

    // Borde exterior
    ctx.strokeRect(FX, FY, FW, FH)

    // Línea del medio
    ctx.beginPath()
    ctx.moveTo(FX, cy)
    ctx.lineTo(FX + FW, cy)
    ctx.stroke()

    // Círculo central
    ctx.beginPath()
    ctx.arc(cx, cy, 80, 0, Math.PI * 2)
    ctx.stroke()

    // Punto central
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.beginPath()
    ctx.arc(cx, cy, 5, 0, Math.PI * 2)
    ctx.fill()

    // ── Área grande arriba ────────────────────────────────────────────────────
    const bigAreaW = 420, bigAreaH = 155
    ctx.strokeRect(cx - bigAreaW / 2, FY, bigAreaW, bigAreaH)

    // ── Área chica arriba ─────────────────────────────────────────────────────
    const smallAreaW = 210, smallAreaH = 70
    ctx.strokeRect(cx - smallAreaW / 2, FY, smallAreaW, smallAreaH)

    // ── Área grande abajo ─────────────────────────────────────────────────────
    ctx.strokeRect(cx - bigAreaW / 2, FY + FH - bigAreaH, bigAreaW, bigAreaH)

    // ── Área chica abajo ──────────────────────────────────────────────────────
    ctx.strokeRect(cx - smallAreaW / 2, FY + FH - smallAreaH, smallAreaW, smallAreaH)

    // ── Arcos de penales (semicírculos fuera del área grande) ─────────────────
    ctx.beginPath()
    ctx.arc(cx, FY + bigAreaH, 70, Math.PI, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx, FY + FH - bigAreaH, 70, 0, Math.PI)
    ctx.stroke()

    // ── Arcos de córner ───────────────────────────────────────────────────────
    const cr = 22
    ;[[FX, FY, 0, Math.PI / 2], [FX + FW, FY, Math.PI / 2, Math.PI],
      [FX, FY + FH, -Math.PI / 2, 0], [FX + FW, FY + FH, Math.PI, -Math.PI / 2]
    ].forEach(([x, y, start, end]) => {
      ctx.beginPath()
      ctx.arc(x as number, y as number, cr, start as number, end as number)
      ctx.stroke()
    })

    // ── Puntos de penal ───────────────────────────────────────────────────────
    const penaltyOffset = 110
    ;[FY + penaltyOffset, FY + FH - penaltyOffset].forEach(py => {
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.beginPath()
      ctx.arc(cx, py, 5, 0, Math.PI * 2)
      ctx.fill()
    })

    // ── Arcos (porterías) arriba y abajo ──────────────────────────────────────
    const goalW = 150, goalH = 22
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'
    ctx.lineWidth = 4
    // Arco arriba
    ctx.strokeRect(cx - goalW / 2, FY - goalH, goalW, goalH)
    // Arco abajo
    ctx.strokeRect(cx - goalW / 2, FY + FH, goalW, goalH)

    // ── HEADER ────────────────────────────────────────────────────────────────
    ctx.textAlign = 'center'

    ctx.fillStyle = '#4ade80'
    ctx.font = 'bold 52px sans-serif'
    ctx.fillText('CANCHITA', cx, 62)

    ctx.fillStyle = '#9ca3af'
    ctx.font = '30px sans-serif'
    ctx.fillText(groupName, cx, 100)

    // ── FOOTER ────────────────────────────────────────────────────────────────
    // Fondo semitransparente para legibilidad
    const footerTop = FY + FH + 30
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.roundRect(FX, footerTop - 10, FW, H - footerTop, 14)
    ctx.fill()

    const dateStr = new Date(matchDate + 'T00:00:00').toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long',
    })
    ctx.fillStyle = '#f0fdf4'
    ctx.font = 'bold 34px sans-serif'
    ctx.fillText(`${dateStr} · ${matchTime.slice(0, 5)}`, cx, footerTop + 46)

    if (venueName) {
      ctx.fillStyle = '#9ca3af'
      ctx.font = '28px sans-serif'
      ctx.fillText(venueName, cx, footerTop + 92)
    }

    const footerParts = [
      pricePerPlayer && `Cada uno paga ${pricePerPlayer}`,
      aliasText && `Alias: ${aliasText}`,
    ].filter(Boolean)
    if (footerParts.length) {
      ctx.fillStyle = '#4ade80'
      ctx.font = 'bold 28px sans-serif'
      ctx.fillText(footerParts.join(' · '), cx, footerTop + 138)
    }

    // ── JUGADORES ─────────────────────────────────────────────────────────────
    for (const p of formation.players) {
      if (p.position_x === null || p.position_y === null) continue

      const px = FX + p.position_x * FW
      const py = FY + p.position_y * FH
      const isDark = p.team === 'dark'
      const R = 32

      // Sombra
      ctx.shadowColor = 'rgba(0,0,0,0.5)'
      ctx.shadowBlur = 8

      // Círculo jugador
      ctx.fillStyle = isDark ? '#1e3a5f' : '#f8fafc'
      ctx.beginPath()
      ctx.arc(px, py, R, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = isDark ? '#93c5fd' : '#1e293b'
      ctx.lineWidth = 2.5
      ctx.stroke()

      ctx.shadowBlur = 0

      // Iniciales
      ctx.fillStyle = isDark ? '#bfdbfe' : '#0f172a'
      ctx.font = `bold 18px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(initials(p.name), px, py)
      ctx.textBaseline = 'alphabetic'

      // Badge con nombre COMPLETO
      ctx.font = '13px sans-serif'
      const nameText = p.name          // ← nombre completo, sin split
      const tw = Math.min(ctx.measureText(nameText).width + 14, 150)

      ctx.fillStyle = 'rgba(0,0,0,0.72)'
      ctx.roundRect(px - tw / 2, py + R + 4, tw, 20, 5)
      ctx.fill()

      ctx.fillStyle = '#f0fdf4'
      ctx.fillText(nameText, px, py + R + 18)
    }

    const url = canvas.toDataURL('image/png')
    setImageUrl(url)

    // Upload to Supabase Storage
    setUploading(true)
    try {
      const blob = await (await fetch(url)).blob()
      const supabase = createClient()
      const path = `matches/${matchId}/formation.png`
      const { error } = await supabase.storage.from('match-images').upload(path, blob, {
        contentType: 'image/png',
        upsert: true,
      })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('match-images').getPublicUrl(path)
        await supabase.from('matches').update({ share_image_url: publicUrl }).eq('id', matchId)
      }
    } catch {}
    setUploading(false)
  }

  async function handleShare() {
    if (!imageUrl) return
    try {
      const blob = await (await fetch(imageUrl)).blob()
      const file = new File([blob], 'canchita-formacion.png', { type: 'image/png' })
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `Formación ${groupName}` })
      } else {
        handleDownload()
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.error('No se pudo compartir')
    }
  }

  function handleDownload() {
    if (!imageUrl) return
    const a = document.createElement('a')
    a.href = imageUrl
    a.download = 'canchita-formacion.png'
    a.click()
  }

  return (
    <Modal open={open} onClose={onClose} title="¡Listo para compartir!" className="max-w-sm">
      <canvas ref={canvasRef} className="hidden" />
      <div className="flex flex-col gap-4">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Formación"
            className="w-full rounded-xl border border-border"
          />
        ) : (
          <div className="w-full bg-border rounded-xl animate-pulse flex items-center justify-center" style={{ aspectRatio: '1080/1280' }}>
            <p className="text-text-muted font-body">Generando imagen...</p>
          </div>
        )}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleDownload}
            disabled={!imageUrl}
            className="flex-1"
          >
            <Download size={16} /> Descargar
          </Button>
          <Button
            onClick={handleShare}
            disabled={!imageUrl || uploading}
            className="flex-1"
          >
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
