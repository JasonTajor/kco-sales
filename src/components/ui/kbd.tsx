import { cn } from '@/lib/cn'

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] border border-line bg-bg-inset px-hair',
        'font-sans text-2xs font-medium text-fg-tertiary',
        className,
      )}
    >
      {children}
    </kbd>
  )
}

/** Platform-correct modifier symbol. */
export const modKey = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'
