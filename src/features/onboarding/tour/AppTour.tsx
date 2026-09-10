import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { duration, easeOut } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { EmojiTile } from '@/components/common/EmojiTile'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { TOUR_STEPS, type TourStep } from './steps'

const PAD = 8
const CARD_W = 380
const GAP = 14

interface Box {
  top: number
  left: number
  width: number
  height: number
}

/**
 * The guided walkthrough.
 *
 * Built rather than pulled in, for two reasons: the callout has to be the same
 * chunky object as the rest of the app, and the dimming has to leave the
 * highlighted control genuinely clickable. Four rectangles around the target
 * do that - an SVG mask would swallow the pointer.
 *
 * Skippable from every step, by button, by Escape, or by clicking the dim.
 */
export function AppTour({ onFinish }: { onFinish: () => void }) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const reduce = useReducedMotion()

  // Only steps whose anchor is actually on screen. A tour that points at
  // nothing is worse than a shorter tour.
  const [steps, setSteps] = useState<TourStep[]>([])
  const [index, setIndex] = useState(0)
  const [box, setBox] = useState<Box | null>(null)

  const cardRef = useRef<HTMLDivElement>(null)
  const restoreFocus = useRef<HTMLElement | null>(null)

  const resolve = useCallback(
    (step: TourStep): HTMLElement | null => {
      const sel = !isDesktop && step.mobileSelector ? step.mobileSelector : step.selector
      return document.querySelector<HTMLElement>(sel)
    },
    [isDesktop],
  )

  useEffect(() => {
    setSteps(TOUR_STEPS.filter((s) => resolve(s)))
    setIndex(0)
  }, [resolve])

  const step = steps[index]

  /* ------------------------------------------------------------ position -- */

  const measure = useCallback(() => {
    if (!step) return
    const el = resolve(step)
    if (!el) return
    const r = el.getBoundingClientRect()
    setBox({
      top: r.top - PAD,
      left: r.left - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    })
  }, [step, resolve])

  // Bring the anchor into view before measuring, or the callout points at a
  // rectangle that is scrolled off screen.
  useLayoutEffect(() => {
    if (!step) return
    const el = resolve(step)
    if (!el) return

    el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
    const t = setTimeout(measure, reduce ? 0 : 340)
    return () => clearTimeout(t)
  }, [step, resolve, measure, reduce])

  useEffect(() => {
    const main = document.getElementById('app-main')
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    main?.addEventListener('scroll', measure)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
      main?.removeEventListener('scroll', measure)
    }
  }, [measure])

  /* --------------------------------------------------------------- focus -- */

  useEffect(() => {
    restoreFocus.current = document.activeElement as HTMLElement | null
    return () => restoreFocus.current?.focus?.()
  }, [])

  useEffect(() => {
    cardRef.current?.focus()
  }, [index])

  /* ----------------------------------------------------------- behaviour -- */

  const last = index === steps.length - 1

  const next = useCallback(() => {
    if (last) onFinish()
    else setIndex((i) => i + 1)
  }, [last, onFinish])

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onFinish()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        next()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prev()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, onFinish])

  // Nothing to point at - a narrow viewport, or a page without the anchors.
  // Finish silently rather than showing an empty overlay.
  useEffect(() => {
    if (steps.length === 0) return
    if (index >= steps.length) onFinish()
  }, [index, steps.length, onFinish])

  if (!step || !box) return null

  /* ---------------------------------------------------------------- card -- */

  const vw = window.innerWidth
  const vh = window.innerHeight
  const phone = vw < 640

  // Prefer below the target, flip above when there is no room, and clamp to the
  // viewport so the card never hangs off an edge.
  const below = box.top + box.height + GAP
  const roomBelow = vh - below
  const placeBelow = roomBelow > 240 || roomBelow > box.top

  const cardStyle: React.CSSProperties = phone
    ? { left: 12, right: 12, bottom: 12 }
    : {
        width: CARD_W,
        left: Math.min(Math.max(12, box.left), vw - CARD_W - 12),
        ...(placeBelow ? { top: below } : { top: Math.max(12, box.top - GAP - 210) }),
      }

  return createPortal(
    <div className="fixed inset-0 z-[120]" role="dialog" aria-modal="true" aria-label="App tour">
      {/* Four panes of dim around the anchor. The anchor itself is untouched,
          so it keeps its own colour and stays clickable. */}
      {(
        [
          { top: 0, left: 0, width: vw, height: Math.max(0, box.top) },
          { top: box.top + box.height, left: 0, width: vw, height: Math.max(0, vh - box.top - box.height) },
          { top: box.top, left: 0, width: Math.max(0, box.left), height: box.height },
          {
            top: box.top,
            left: box.left + box.width,
            width: Math.max(0, vw - box.left - box.width),
            height: box.height,
          },
        ] as Box[]
      ).map((pane, i) => (
        <div
          key={i}
          onClick={onFinish}
          className="absolute bg-kco-ink/55 transition-[top,left,width,height] duration-200 ease-out dark:bg-black/50"
          style={pane}
        />
      ))}

      {/* The ring. Sits on the anchor without covering it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-xl ring-[3px] ring-cta ring-offset-2 ring-offset-transparent transition-[top,left,width,height] duration-200 ease-out"
        style={box}
      />

      <motion.div
        ref={cardRef}
        tabIndex={-1}
        key={step.id}
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: duration.base, ease: easeOut }}
        data-emoji-group
        className={cn(
          'absolute chunk p-card shadow-lg focus-visible:outline-none [--chunk:4px]',
          phone && 'w-auto',
        )}
        style={cardStyle}
      >
        {/* Tile and title share a row; the body spans the full card, or it
            wraps to a 28-character column that is painful to read. */}
        <div className="flex items-center gap-snug">
          <EmojiTile name={step.emoji} tone={step.tone} size="sm" play="loop" />
          <h2 className="min-w-0 flex-1 text-base font-bold text-fg">{step.title}</h2>
          <button
            type="button"
            onClick={onFinish}
            aria-label="Skip the tour"
            className="touch-target relative -mr-hair shrink-0 rounded-md p-hair text-fg-tertiary transition-colors hover:bg-surface-hover hover:text-fg"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <p className="mt-snug text-sm leading-[1.55] text-fg-secondary">{step.body}</p>

        <div className="mt-group flex items-center justify-between gap-snug border-t border-line pt-snug">
          {/* Dots, not "3 of 5": the count is short enough to see. */}
          <div className="flex items-center gap-hair" aria-hidden>
            {steps.map((s, i) => (
              <span
                key={s.id}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-200',
                  i === index ? 'w-5 bg-cta' : 'w-1.5 bg-line-strong',
                )}
              />
            ))}
          </div>
          <span className="sr-only">
            Step {index + 1} of {steps.length}
          </span>

          <div className="flex items-center gap-tight">
            {index > 0 && (
              <Button variant="ghost" size="sm" onClick={prev} icon={<ArrowLeft className="size-3.5" />}>
                Back
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={next}
              trailing={last ? undefined : <ArrowRight className="size-3.5" />}
            >
              {last ? "Got it" : 'Next'}
            </Button>
          </div>
        </div>

        {index === 0 && (
          <button
            type="button"
            onClick={onFinish}
            className="mt-snug w-full rounded-md text-center text-xs font-medium text-fg-tertiary underline-offset-4 hover:text-fg-secondary hover:underline"
          >
            Skip the tour - I will explore on my own
          </button>
        )}
      </motion.div>
    </div>,
    document.body,
  )
}
