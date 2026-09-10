import { useEffect } from 'react'
import { Emoji } from '@/components/common/Emoji'

/**
 * The XP burst shown after completing a section.
 *
 * Deliberately non-blocking and short: it is a confirmation, not a modal. It
 * announces itself politely to assistive technology through the live region
 * rather than stealing focus, and it disappears on its own so the learner is
 * never waiting on it to keep reading.
 *
 * Under prefers-reduced-motion the animation collapses (the global rule in
 * globals.css shortens every duration), so it becomes a brief static label.
 */
export function RewardFeedback({
  show,
  xp,
  title,
  onDone,
}: {
  show: boolean
  xp: number
  title: string
  onDone: () => void
}) {
  useEffect(() => {
    if (!show) return
    const t = window.setTimeout(onDone, 1400)
    return () => window.clearTimeout(t)
  }, [show, onDone])

  if (!show) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-gutter"
    >
      <div className="chunk flex items-center gap-snug px-card py-tight [--chunk-edge:var(--xp)] [--chunk-face:var(--xp-subtle)]">
        <Emoji name="celebrate" size={22} play="once" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-fg">{title}</p>
          <p className="text-xs font-bold text-xp tnum">+{xp} XP</p>
        </div>
      </div>
    </div>
  )
}
