'use client'
import { Download, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'

interface MatchShareButtonProps {
  shareImageUrl: string
  groupName: string
}

export function MatchShareButton({ shareImageUrl, groupName }: MatchShareButtonProps) {
  async function handleShare() {
    try {
      const blob = await (await fetch(shareImageUrl)).blob()
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
    const a = document.createElement('a')
    a.href = shareImageUrl
    a.download = 'canchita-formacion.png'
    a.click()
  }

  return (
    <div className="flex gap-3">
      <Button variant="secondary" onClick={handleDownload} className="flex-1">
        <Download size={16} /> Descargar
      </Button>
      <Button onClick={handleShare} className="flex-1">
        <Share2 size={16} /> Compartir
      </Button>
    </div>
  )
}
