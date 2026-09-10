import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { X } from 'lucide-react'
import { springUI } from '@/lib/motion'
import { cn } from '@/lib/cn'
import { uid } from '@/lib/id'
import { EmojiTile, type TileTone } from '@/components/common/EmojiTile'
import type { EmojiName } from '@/data/emoji'

type ToastTone = 'success' | 'error' | 'info'

interface Toast {
  id: string
  title: string
  description?: string
  tone: ToastTone
}

interface ToastApi {
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

/**
 * Every transient message in the app, including form and validation errors,
 * arrives here rather than as an inline block, so a failure reads the same
 * whether it came from a field, a save, or a background request.
 *
 * Errors are held about twice as long as confirmations and announced
 * assertively: a confirmation that slips past costs nothing, a rejected
 * sign-in does.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((tone: ToastTone, title: string, description?: string) => {
    setToasts((t) => {
      // An identical message fired twice (a retried submit, a double click)
      // should refresh the one on screen, not stack a duplicate.
      const duplicate = t.find((x) => x.tone === tone && x.title === title && x.description === description)
      if (duplicate) return t.filter((x) => x.id !== duplicate.id).concat({ ...duplicate, id: uid('toast') })
      // Keep the stack readable; the oldest falls off first.
      return [...t, { id: uid('toast'), title, description, tone }].slice(-3)
    })
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      success: (t, d) => push('success', t, d),
      error: (t, d) => push('error', t, d),
      info: (t, d) => push('info', t, d),
    }),
    [push],
  )

  const errors = toasts.filter((t) => t.tone === 'error')
  const rest = toasts.filter((t) => t.tone !== 'error')

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/*
       * Two live regions, because assertiveness is a property of the message,
       * not of the stack. They render into one visual column.
       *
       * The mobile offset clears the bottom navigation, which is 72px tall in
       * the shell; on a phone a toast pinned to `bottom-4` lands on top of it.
       */}
      <div className="pointer-events-none fixed inset-x-gutter bottom-[88px] z-[100] flex flex-col items-end gap-tight sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[min(380px,calc(100vw-2rem))]">
        <div role="alert" aria-live="assertive" aria-atomic="false" className="contents">
          <AnimatePresence initial={false}>
            {errors.map((t) => (
              <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
            ))}
          </AnimatePresence>
        </div>
        <div role="status" aria-live="polite" aria-atomic="false" className="contents">
          <AnimatePresence initial={false}>
            {rest.map((t) => (
              <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </ToastContext.Provider>
  )
}

/**
 * Tone carries the tinted face, the lip, and the artwork. The face and edge are
 * both opaque colours mixed against the ground, the same construction as every
 * other chunky panel - a toast is an object that dropped in, not a wash.
 */
const TONES: Record<
  ToastTone,
  { chunk: string; emoji: EmojiName; tile: TileTone; title: string; ms: number }
> = {
  success: {
    chunk:
      '[--chunk-face:var(--success-subtle)] [--chunk-edge:color-mix(in_oklab,var(--success)_42%,var(--success-subtle))]',
    emoji: 'success',
    tile: 'classic',
    title: 'text-success-fg',
    ms: 4500,
  },
  error: {
    chunk:
      '[--chunk-face:var(--danger-subtle)] [--chunk-edge:color-mix(in_oklab,var(--danger)_42%,var(--danger-subtle))]',
    emoji: 'warning',
    tile: 'chili',
    title: 'text-danger-fg',
    ms: 9000,
  },
  info: {
    chunk:
      '[--chunk-face:var(--info-subtle)] [--chunk-edge:color-mix(in_oklab,var(--info)_42%,var(--info-subtle))]',
    emoji: 'idea',
    tile: 'lightblue',
    title: 'text-info-fg',
    ms: 5500,
  },
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const tone = TONES[toast.tone]
  const reduce = useReducedMotion()
  const [paused, setPaused] = useState(false)

  // Kept in a ref so pausing does not restart the countdown from zero.
  const remaining = useRef(tone.ms)
  const startedAt = useRef(Date.now())

  useEffect(() => {
    if (paused) {
      remaining.current -= Date.now() - startedAt.current
      return
    }
    startedAt.current = Date.now()
    const t = setTimeout(onDismiss, Math.max(600, remaining.current))
    return () => clearTimeout(t)
  }, [paused, onDismiss])

  return (
    <motion.div
      layout
      data-emoji-group
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: 28, scale: 0.97 }}
      transition={springUI}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className={cn(
        'pointer-events-auto flex w-full items-start gap-snug chunk p-card shadow-md [--chunk:4px]',
        tone.chunk,
      )}
    >
      <EmojiTile name={tone.emoji} tone={tone.tile} size="sm" play="once" />

      <div className="min-w-0 flex-1 space-y-hair">
        <p className={cn('text-base font-bold', tone.title)}>{toast.title}</p>
        {toast.description && <p className="text-sm text-fg-secondary">{toast.description}</p>}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="touch-target relative -mr-hair -mt-hair shrink-0 rounded-md p-hair text-fg-tertiary transition-colors hover:bg-black/5 hover:text-fg dark:hover:bg-white/10"
      >
        <X className="size-3.5" />
      </button>
    </motion.div>
  )
}
