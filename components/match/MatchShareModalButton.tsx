'use client'
import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { ShareImageModal } from '@/components/match/ShareImageModal'
import { cn } from '@/lib/utils/format'
import type { FormationData } from '@/lib/types'

interface Props {
  matchId: string
  shareImageUrl: string | null
  formationData: FormationData | null
  matchDate: string
  matchTime: string
  venueName: string
  groupName: string
  pricePerPlayer: string
  aliasText: string
  showDownload?: boolean
  compact?: boolean  // botón pequeño para usar junto a otros botones
}

export function MatchShareModalButton({
  matchId,
  shareImageUrl,
  formationData,
  matchDate,
  matchTime,
  venueName,
  groupName,
  pricePerPlayer,
  aliasText,
  showDownload = false,
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false)

  const btnClass = cn(
    'inline-flex items-center justify-center gap-2 font-body font-semibold rounded-xl transition-all active:scale-95 bg-surface border border-border text-text-primary hover:bg-border',
    compact ? 'h-9 px-3 text-sm' : 'w-full h-12 px-5 text-base'
  )

  async function handleDirectShare() {
    if (!shareImageUrl) return
    try {
      const blob = await (await fetch(shareImageUrl)).blob()
      const file = new File([blob], 'canchita-formacion.png', { type: 'image/png' })
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `Formación ${groupName}` })
      } else {
        const a = document.createElement('a')
        a.href = shareImageUrl
        a.download = 'canchita-formacion.png'
        a.click()
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') console.error(e)
    }
  }

  if (!shareImageUrl && !formationData) return null

  return (
    <>
      <button
        onClick={shareImageUrl ? handleDirectShare : () => setOpen(true)}
        className={btnClass}
      >
        <Share2 size={compact ? 14 : 18} /> Compartir
      </button>
      {open && formationData && (
        <ShareImageModal
          open={open}
          onClose={() => setOpen(false)}
          formation={formationData}
          matchDate={matchDate}
          matchTime={matchTime}
          venueName={venueName}
          groupName={groupName}
          pricePerPlayer={pricePerPlayer}
          aliasText={aliasText}
          matchId={matchId}
        />
      )}
    </>
  )
}
