import { useEffect } from 'react'

const SUFFIX = 'KCO Learning'

/**
 * Sets the document title per route. A single static title makes browser tabs,
 * history, and bookmarks useless once a learner has more than one page open.
 */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${SUFFIX}` : SUFFIX
  }, [title])
}
