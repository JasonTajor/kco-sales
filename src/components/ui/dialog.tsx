import * as RDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Button } from './button'

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  const width = { sm: 'max-w-[400px]', md: 'max-w-[520px]', lg: 'max-w-[720px]' }[size]

  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-50 animate-overlay-in bg-black/40 backdrop-blur-[1px] dark:bg-black/60" />
        <RDialog.Content
          className={cn(
            // A fixed 65vh body plus header and footer could add up past the
            // screen on a short phone, cutting the title off with no way to
            // scroll to it. Cap the whole dialog and let the body take the slack.
            'fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col animate-dialog-in motion-reduce:animate-none',
            'rounded-2xl border-2 border-line-chunk bg-surface-raised shadow-lg focus:outline-none',
            width,
          )}
        >
          <div className="flex shrink-0 items-start justify-between gap-group px-card pb-snug pt-card">
            <div className="min-w-0 space-y-hair">
              <RDialog.Title className="break-words text-xl font-extrabold tracking-tight text-fg">{title}</RDialog.Title>
              {description && (
                <RDialog.Description className="text-base text-fg-secondary">{description}</RDialog.Description>
              )}
            </div>
            <RDialog.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close dialog">
                <X className="size-4" />
              </Button>
            </RDialog.Close>
          </div>

          {children && (
            <div className="min-h-0 flex-1 overflow-y-auto px-card py-hair scrollbar-thin">{children}</div>
          )}

          {footer && (
            <div className="mt-snug flex shrink-0 items-center justify-end gap-tight border-t border-line bg-bg px-card py-snug">
              {footer}
            </div>
          )}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  )
}

/** Focused confirmation - destructive or irreversible actions only. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive,
  loading,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            size="sm"
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  )
}
