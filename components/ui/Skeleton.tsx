import { cn } from '@/lib/utils/format'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse bg-border rounded-xl', className)} />
  )
}

export function PlayerCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 bg-surface border border-border rounded-2xl">
      <Skeleton className="w-12 h-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  )
}

export function MatchCardSkeleton() {
  return (
    <div className="p-4 bg-surface border border-border rounded-2xl space-y-3">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-4 w-44" />
      <Skeleton className="h-4 w-24" />
    </div>
  )
}
