import { useCallback, useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

const KEY = 'kco.theme'

function apply(mode: ThemeMode) {
  const dark =
    mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      return (localStorage.getItem(KEY) as ThemeMode) || 'system'
    } catch {
      return 'system'
    }
  })

  useEffect(() => {
    apply(mode)
    try {
      localStorage.setItem(KEY, mode)
    } catch {
      /* ignore */
    }

    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mode])

  const toggle = useCallback(() => {
    setMode((m) => (m === 'dark' ? 'light' : 'dark'))
  }, [])

  const isDark = document.documentElement.classList.contains('dark')

  return { mode, setMode, toggle, isDark }
}
