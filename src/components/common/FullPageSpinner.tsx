import { Loader2 } from 'lucide-react'

export function FullPageSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-snug bg-bg" role="status">
      <Loader2 className="size-5 animate-spin text-fg-tertiary" aria-hidden />
      <p className="text-sm text-fg-tertiary">{label}…</p>
    </div>
  )
}
