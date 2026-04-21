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
    const SIZE = 1080
    canvas.width = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext('2d')!

    // Background
    ctx.fillStyle = '#0a0f0d'
    ctx.fillRect(0, 0, SIZE, SIZE)

    // Field green background
    ctx.fillStyle = '#0d2a18'
    ctx.roundRect(40, 100, SIZE - 80, SIZE - 200, 20)
    ctx.fill()

    // Field lines
    ctx.strokeStyle = '#2d6a40'
    ctx.lineWidth = 3

    // Outer boundary
    ctx.strokeRect(60, 120, SIZE - 120, SIZE - 240)

    // Center line
    ctx.setLineDash([10, 8])
    ctx.beginPath()
    ctx.moveTo(60, SIZE / 2)
    ctx.lineTo(SIZE - 60, SIZE / 2)
    ctx.stroke()
    ctx.setLineDash([])

    // Center circle
    ctx.beginPath()
    ctx.arc(SIZE / 2, SIZE / 2, 80, 0, Math.PI * 2)
    ctx.stroke()

    // Header
    ctx.fillStyle = '#4ade80'
    ctx.font = 'bold 48px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('CANCHITA', SIZE / 2, 60)

    ctx.fillStyle = '#9ca3af'
    ctx.font = '28px sans-serif'
    ctx.fillText(groupName, SIZE / 2, 95)

    // Match info
    const dateStr = new Date(matchDate + 'T00:00:00').toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long',
    })
    ctx.fillStyle = '#f0fdf4'
    ctx.font = 'bold 32px sans-serif'
    ctx.fillText(`${dateStr} · ${matchTime.slice(0, 5)}`, SIZE / 2, SIZE - 120)

    if (venueName) {
      ctx.fillStyle = '#9ca3af'
      ctx.font = '26px sans-serif'
      ctx.fillText(venueName, SIZE / 2, SIZE - 80)
    }

    // Footer
    const footerParts = [pricePerPlayer && `Cada uno paga ${pricePerPlayer}`, aliasText && `Alias: ${aliasText}`].filter(Boolean)
    if (footerParts.length) {
      ctx.fillStyle = '#4ade80'
      ctx.font = 'bold 26px sans-serif'
      ctx.fillText(footerParts.join(' · '), SIZE / 2, SIZE - 30)
    }

    // Draw players
    const fieldLeft = 80, fieldTop = 130, fieldW = SIZE - 160, fieldH = SIZE - 280

    for (const p of formation.players) {
      if (p.position_x === null || p.position_y === null) continue
      const px = fieldLeft + p.position_x * fieldW
      const py = fieldTop + p.position_y * fieldH

      const isDark = p.team === 'dark'
      ctx.fillStyle = isDark ? '#1e3a5f' : '#f0fdf4'
      ctx.beginPath()
      ctx.arc(px, py, 30, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = isDark ? '#93c5fd' : '#0a0f0d'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = isDark ? '#93c5fd' : '#0a0f0d'
      ctx.font = 'bold 20px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(initials(p.name), px, py)
      ctx.textBaseline = 'alphabetic'

      // Name label
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      const nameText = p.name.split(' ')[0]
      const tw = ctx.measureText(nameText).width + 12
      ctx.roundRect(px - tw / 2, py + 35, tw, 20, 5)
      ctx.fill()

      ctx.fillStyle = '#f0fdf4'
      ctx.font = '14px sans-serif'
      ctx.fillText(nameText, px, py + 50)
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
          <div className="w-full aspect-square bg-border rounded-xl animate-pulse flex items-center justify-center">
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
