import { useEffect, useState } from 'react'
import type { Category } from '@/types'
import { materialService } from '@/services'

/**
 * The category list, fetched once and shared.
 *
 * Categories are admin-manageable, so reading them from the seed file meant a
 * category somebody added never appeared in a filter or on a card. But they
 * are also needed by leaf components - `MaterialCard` renders one per row -
 * and a fetch per card would be absurd.
 *
 * So: one module-level promise, awaited by every caller. The first component
 * to mount starts the request and the rest attach to it. `invalidate()` is
 * what the category admin screen calls after a change, so the next render
 * refetches rather than showing a stale list.
 */
let cache: Promise<Category[]> | null = null

function load(): Promise<Category[]> {
  cache ??= materialService.categories().catch((err: unknown) => {
    // A failed fetch must not poison the cache forever - clear it so the next
    // mount retries instead of replaying the rejection.
    cache = null
    throw err
  })
  return cache
}

/** Call after creating, renaming or deleting a category. */
export function invalidateCategories(): void {
  cache = null
}

export interface CategoriesState {
  categories: Category[]
  loading: boolean
  /** Lookup by id, for the common "which category is this?" case. */
  byId: (id: string) => Category | undefined
}

export function useCategories(): CategoriesState {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    load()
      .then((rows) => {
        if (!cancelled) setCategories(rows)
      })
      .catch(() => {
        // Rendering a card without its category chip is a better failure than
        // taking the whole list down.
        if (!cancelled) setCategories([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return {
    categories,
    loading,
    byId: (id: string) => categories.find((c) => c.id === id),
  }
}
