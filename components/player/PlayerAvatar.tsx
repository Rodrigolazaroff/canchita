import Image from 'next/image'
import { initials, playerColor } from '@/lib/utils/format'

interface PlayerAvatarProps {
  name: string
  id: string
  photoUrl?: string | null
  size?: number
  className?: string
}

export function PlayerAvatar({ name, id, photoUrl, size = 48, className }: PlayerAvatarProps) {
  const color = playerColor(id)
  const abbr = initials(name)

  if (photoUrl) {
    return (
      <div
        className={`relative rounded-full overflow-hidden flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        <Image src={photoUrl} alt={name} fill className="object-cover" />
      </div>
    )
  }

  return (
    <div
      className={`flex-shrink-0 rounded-full flex items-center justify-center font-display font-bold text-white ${className}`}
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.35 }}
    >
      {abbr}
    </div>
  )
}
