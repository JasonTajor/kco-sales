import type { ReactNode } from 'react'
import { RotateCw } from 'lucide-react'
import { EmojiTile } from '@/components/common/EmojiTile'
import { cn } from '@/lib/cn'
import { Button } from './button'

/** §18 - minimal and useful. No illustrations. */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
  compact,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-line-chunk bg-surface text-center',
        compact ? 'px-6 py-10' : 'px-8 py-16',
        className,
      )}
    >
      <div className="mb-group">
        {icon ?? <EmojiTile name="empty" tone="neutral" size="md" play="loop" />}
      </div>
      <p className="text-lg font-bold text-fg">{title}</p>
      {description && <p className="mt-hair max-w-sm text-sm text-fg-secondary">{description}</p>}
      {action && <div className="mt-group">{action}</div>}
    </div>
  )
}

/** §20 - never surfaces the raw exception to the user. */
export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this content. Please try again.',
  onRetry,
  className,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      role="alert"
      data-emoji-group
      className={cn(
        // Tinted face over a matching lip, the same construction as an error
        // toast - a failed load and a failed save should look related.
        'flex flex-col items-center justify-center chunk px-8 py-16 text-center',
        '[--chunk-face:var(--danger-subtle)] [--chunk-edge:color-mix(in_oklab,var(--danger)_38%,var(--danger-subtle))]',
        className,
      )}
    >
      <div className="mb-group">
        <EmojiTile name="warning" tone="chili" size="md" play="loop" />
      </div>
      <p className="text-lg font-bold text-danger-fg">{title}</p>
      <p className="mt-hair max-w-sm text-sm text-fg-secondary">{description}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-group" icon={<RotateCw className="size-3.5" />} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
