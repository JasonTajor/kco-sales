import * as RDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Button } from './button'

/** Side sheet - the default for management workflows (§17). */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = 'md',
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  width?: 'md' | 'lg' | 'xl'
}) {
  const w = { md: 'sm:max-w-[420px]', lg: 'sm:max-w-[560px]', xl: 'sm:max-w-[760px]' }[width]

  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-50 animate-overlay-in bg-black/40 backdrop-blur-[1px] dark:bg-black/60" />
        <RDialog.Content
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex w-full animate-drawer-in flex-col border-l-2 border-line-chunk bg-surface shadow-lg focus:outline-none',
            w,
          )}
        >
          <div className="flex shrink-0 items-start justify-between gap-group border-b border-line px-card py-snug">
            <div className="min-w-0 space-y-hair">
              <RDialog.Title className="break-words text-xl font-extrabold tracking-tight text-fg">{title}</RDialog.Title>
              {description && (
                <RDialog.Description className="text-base text-fg-secondary">{description}</RDialog.Description>
              )}
            </div>
            <RDialog.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close panel">
                <X className="size-4" />
              </Button>
            </RDialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-card scrollbar-thin">{children}</div>

          {footer && (
            <div className="flex shrink-0 items-center justify-end gap-tight border-t border-line bg-bg px-card py-snug">{footer}</div>
          )}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  )
}
