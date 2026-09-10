import { useEffect } from 'react'

interface Options {
  /** Requires Ctrl on Windows/Linux or ⌘ on macOS. */
  mod?: boolean
  shift?: boolean
  /** Fire even while focus is in an input. Off by default. */
  allowInInput?: boolean
  enabled?: boolean
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

/** §15 - only shortcuts that genuinely help. */
export function useHotkey(key: string, handler: (e: KeyboardEvent) => void, options: Options = {}) {
  const { mod = false, shift = false, allowInInput = false, enabled = true } = options

  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== key.toLowerCase()) return
      if (mod !== (e.metaKey || e.ctrlKey)) return
      if (shift !== e.shiftKey) return
      if (!allowInInput && isTyping(e.target)) return
      handler(e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [key, handler, mod, shift, allowInInput, enabled])
}
