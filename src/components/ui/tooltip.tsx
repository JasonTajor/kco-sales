import * as RTooltip from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export const TooltipProvider = ({ children }: { children: ReactNode }) => (
  <RTooltip.Provider delayDuration={350} skipDelayDuration={200}>
    {children}
  </RTooltip.Provider>
)

export function Tooltip({
  content,
  children,
  side = 'top',
  shortcut,
  disabled,
}: {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  shortcut?: string
  disabled?: boolean
}) {
  if (disabled) return <>{children}</>
  return (
    <RTooltip.Root>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content
          side={side}
          sideOffset={6}
          className={cn(
            'z-50 flex animate-pop-in items-center gap-tight rounded-md border border-line bg-surface-raised px-tight py-hair text-sm text-fg shadow-md',
          )}
        >
          {content}
          {shortcut && (
            <kbd className="rounded-[3px] border border-line bg-bg px-hair font-mono text-2xs text-fg-tertiary">
              {shortcut}
            </kbd>
          )}
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  )
}
