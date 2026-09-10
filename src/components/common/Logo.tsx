import { cn } from '@/lib/cn'

/** KCO wordmark plus product name. Art lives at `public/logo-kco.png`. */
export function Logo({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn('flex items-center gap-tight', className)}>
      <img
        src="/logo-kco.png"
        alt=""
        aria-hidden
        draggable={false}
        className="h-7 w-auto shrink-0 select-none object-contain"
      />
      {!compact && (
        <span className="flex min-w-0 flex-col leading-none">
          <span className="truncate text-base font-semibold tracking-tight text-fg">KCO Learning</span>
          <span className="mt-hair truncate text-2xs text-fg-tertiary">Sales &amp; Chat Support</span>
        </span>
      )}
      <span className="sr-only">KCO Learning - Sales and Chat Support platform</span>
    </span>
  )
}
