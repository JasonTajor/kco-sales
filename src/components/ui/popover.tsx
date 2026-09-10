import * as RPopover from '@radix-ui/react-popover'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export const Popover = RPopover.Root
export const PopoverTrigger = RPopover.Trigger

export function PopoverContent({
  children,
  align = 'end',
  className,
  sideOffset = 6,
}: {
  children: ReactNode
  align?: 'start' | 'center' | 'end'
  className?: string
  sideOffset?: number
}) {
  return (
    <RPopover.Portal>
      <RPopover.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 animate-pop-in rounded-xl border-2 border-line-chunk bg-surface-raised shadow-lg focus:outline-none',
          className,
        )}
      >
        {children}
      </RPopover.Content>
    </RPopover.Portal>
  )
}
