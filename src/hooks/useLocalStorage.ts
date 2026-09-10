import { useCallback, useState } from 'react'

/** Per-viewer conveniences only - sidebar state, view mode, last filter. */
export function useLocalStorage<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(`kco.${key}`)
      return raw === null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })

  const set = useCallback(
    (next: T | ((p: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
        try {
          localStorage.setItem(`kco.${key}`, JSON.stringify(resolved))
        } catch {
          /* ignore */
        }
        return resolved
      })
    },
    [key],
  )

  return [value, set]
}
