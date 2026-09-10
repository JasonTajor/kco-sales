import { useEffect, useRef, useState } from 'react'
import type { AnimationItem } from 'lottie-web'
import { cn } from '@/lib/cn'
import { EMOJI, emojiSrc, type EmojiEntry, type EmojiName } from '@/data/emoji'

/**
 * A Google Noto animated emoji.
 *
 * The artwork is a Lottie file vendored under `public/emoji`, rendered as SVG so
 * it stays sharp at any size and inherits nothing from the platform emoji font -
 * the same picture on Windows, macOS, Android, and a projector in a training room.
 *
 * Three rules keep the motion from becoming noise:
 *  - Nothing initialises until it scrolls into view.
 *  - `play="hover"` (the default) holds the first frame and only animates while
 *    the pointer is over the emoji, or over an ancestor marked `data-emoji-group`
 *    - so a whole card can drive the emoji inside it.
 *  - `prefers-reduced-motion` pins every emoji to its first frame.
 */
export type EmojiPlay = 'hover' | 'loop' | 'once' | 'static'

export interface EmojiProps {
  name: EmojiName
  /** When the animation runs. Defaults to on hover or keyboard focus. */
  play?: EmojiPlay
  /** Rendered box in pixels. */
  size?: number
  /**
   * Spoken name. Omit for decoration next to a visible label, which is the
   * common case - the emoji is then hidden from assistive technology.
   */
  label?: string
  className?: string
}

/** One in-flight or resolved fetch per emoji, shared across every instance. */
const files = new Map<string, Promise<unknown>>()

function loadFile(slug: string) {
  let file = files.get(slug)
  if (!file) {
    file = fetch(emojiSrc(slug)).then((res) => {
      if (!res.ok) throw new Error(`emoji ${slug}: ${res.status}`)
      return res.json()
    })
    files.set(slug, file)
  }
  return file
}

/** The player is a chunk of its own, pulled in the first time an emoji renders. */
let playerChunk: Promise<(typeof import('lottie-web'))['default']> | null = null

function loadPlayer() {
  playerChunk ??= import('lottie-web/build/player/lottie_svg').then((m) => m.default)
  return playerChunk
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function Emoji({ name, play = 'hover', size = 20, label, className }: EmojiProps) {
  const entry: EmojiEntry | undefined = EMOJI[name]

  const host = useRef<HTMLSpanElement | null>(null)
  const animation = useRef<AnimationItem | null>(null)
  /** True once the Lottie has painted, so the unicode fallback can step aside. */
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!entry) return
    const el = host.current
    if (!el) return

    let cancelled = false
    const reduce = prefersReducedMotion()

    /**
     * Deferred until the emoji is on screen. A page with thirty of these
     * should not fetch thirty Lottie files and construct thirty players
     * before the reader has scrolled to any of them.
     */
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        observer.disconnect()

        void Promise.all([loadPlayer(), loadFile(entry.slug)])
          .then(([lottie, data]) => {
            if (cancelled || !host.current) return

            const item = lottie.loadAnimation({
              container: host.current,
              renderer: 'svg',
              // Motion is opt-in: 'loop' is the only mode that runs unprompted,
              // and reduced-motion downgrades even that to a still frame.
              loop: play === 'loop' && !reduce,
              autoplay: (play === 'loop' || play === 'once') && !reduce,
              animationData: data,
              rendererSettings: {
                preserveAspectRatio: 'xMidYMid meet',
                progressiveLoad: true,
              },
            })

            animation.current = item
            item.addEventListener('DOMLoaded', () => {
              if (!cancelled) setReady(true)
            })

            // Noto lotties rest on frame 0, and several fade to nothing by
            // their last frame - so a held emoji must sit at the start, never
            // at the end.
            if (!item.isLoaded) item.goToAndStop(0, true)
            if (reduce || play === 'static' || play === 'hover') item.goToAndStop(0, true)
          })
          .catch(() => {
            // The unicode character stays visible; nothing else to do.
          })
      },
      { rootMargin: '96px' },
    )

    observer.observe(el)

    return () => {
      cancelled = true
      observer.disconnect()
      animation.current?.destroy()
      animation.current = null
    }
  }, [entry, play])

  /**
   * Hover playback.
   *
   * Bound to the nearest `[data-emoji-group]` ancestor when there is one, so
   * hovering a whole card animates the emoji inside it rather than requiring
   * the pointer to land on a 20px target.
   */
  useEffect(() => {
    if (play !== 'hover' || prefersReducedMotion()) return
    const el = host.current
    if (!el) return

    const trigger: HTMLElement = el.closest<HTMLElement>('[data-emoji-group]') ?? el

    const start = () => {
      const item = animation.current
      if (!item) return
      item.goToAndPlay(0, true)
    }
    const stop = () => {
      const item = animation.current
      if (!item) return
      item.goToAndStop(0, true)
    }

    trigger.addEventListener('mouseenter', start)
    trigger.addEventListener('mouseleave', stop)
    trigger.addEventListener('focusin', start)
    trigger.addEventListener('focusout', stop)

    return () => {
      trigger.removeEventListener('mouseenter', start)
      trigger.removeEventListener('mouseleave', stop)
      trigger.removeEventListener('focusin', start)
      trigger.removeEventListener('focusout', stop)
    }
  }, [play])

  if (!entry) return null

  return (
    <span
      className={cn('relative inline-flex flex-none items-center justify-center', className)}
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {/*
        The plain codepoint, shown until the Lottie has painted. It is not a
        placeholder box: if the file fails to load the emoji simply stays as
        the platform character, which is a correct picture rather than a gap.
      */}
      <span
        aria-hidden
        className={cn(
          'absolute inset-0 flex items-center justify-center leading-none transition-opacity',
          ready ? 'opacity-0' : 'opacity-100',
        )}
        style={{ fontSize: size * 0.92 }}
      >
        {entry.char}
      </span>

      <span
        ref={host}
        aria-hidden
        className="absolute inset-0 [&_svg]:size-full"
      />
    </span>
  )
}

/**
 * Renders authored text that may contain literal emoji.
 *
 * The training material quotes chat messages with emoji in them, and those are
 * part of the message rather than decoration the app adds - so they render as
 * the platform's own characters. This stays a component so the renderer's call
 * sites remain explicit about which strings are authored content.
 */
export function EmojiText({ children }: { children: string }) {
  return <>{children}</>
}
