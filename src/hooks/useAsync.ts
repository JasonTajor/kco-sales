import { useCallback, useEffect, useRef, useState } from 'react'

export interface AsyncState<T> {
  data: T | undefined
  loading: boolean
  error: Error | null
  reload: () => void
  setData: (updater: T | ((prev: T | undefined) => T)) => void
}

/**
 * Runs an async loader and tracks loading/error/data. Every list and detail page
 * uses this so skeleton and error states are real code paths, not decoration.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setDataState] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [nonce, setNonce] = useState(0)
  const latest = useRef(0)

  useEffect(() => {
    const run = ++latest.current
    setLoading(true)
    setError(null)

    loader()
      .then((result) => {
        if (run === latest.current) setDataState(result)
      })
      .catch((e: unknown) => {
        if (run === latest.current) setError(e instanceof Error ? e : new Error('Unknown error'))
      })
      .finally(() => {
        if (run === latest.current) setLoading(false)
      })
    // The caller owns the dependency list; `loader` is intentionally excluded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  const setData = useCallback((updater: T | ((prev: T | undefined) => T)) => {
    setDataState((prev) => (typeof updater === 'function' ? (updater as (p: T | undefined) => T)(prev) : updater))
  }, [])

  return { data, loading, error, reload, setData }
}
