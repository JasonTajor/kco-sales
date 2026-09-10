import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useCurrentUser } from '@/features/auth/AuthProvider'
import { Stagger, StaggerItem } from '@/components/motion/Motion'
import { useAsync } from '@/hooks/useAsync'
import { materialService, progressService } from '@/services'

import { categoryAccent, categoryEmoji } from '@/utils'
import { formatDuration, pct, plural } from '@/lib/format'
import { EmojiTile } from '@/components/common/EmojiTile'
import { Page, PageHeader } from '@/components/layout/PageHeader'
import { ProgressBar } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'

export function CategoriesPage() {
  const user = useCurrentUser()
  const materials = useAsync(
    () => materialService.list({ audience: user.role, status: user.role === 'admin' ? 'all' : 'published' }),
    [user.role],
  )
  const progress = useAsync(() => progressService.forUser(user.id), [user.id])
  // Fetched, so a category an admin adds appears without a deploy.
  const categoryList = useAsync(() => materialService.categories(), [])
  const categories = categoryList.data

  const rows = materials.data ?? []
  const progressRows = progress.data ?? []

  return (
    <Page>
      <PageHeader
        crumbs={[{ label: 'Learning' }, { label: 'Categories' }]}
        title="Categories"
        description="The library grouped by the kind of work it supports. Pick a category to see everything in it."
      />

      {materials.loading ? (
        <Stagger className="grid grid-cols-1 gap-group sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </Stagger>
      ) : (
        <div className="grid grid-cols-1 gap-group sm:grid-cols-2 lg:grid-cols-3">
          {(categories ?? []).map((category) => {
            const items = rows.filter((m) => m.categoryId === category.id)
            const completed = items.filter(
              (m) => progressRows.find((p) => p.materialId === m.id)?.state === 'completed',
            ).length
            const minutes = items.reduce((s, m) => s + m.duration, 0)
            const accent = categoryAccent(category.accent)
            const emoji = categoryEmoji(category.icon)

            return (
              <StaggerItem key={category.id} className="h-full">
              <Link
                key={category.id}
                id={category.slug}
                to={`/learning/materials?category=${category.id}`}
                data-emoji-group
                className="group flex flex-col chunk p-card chunk-press"
              >
                <div className="flex items-start justify-between">
                  <EmojiTile name={emoji} tone={accent.tile} size="md" />
                  <ArrowRight
                    className="size-4 text-fg-tertiary transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </div>

                <h2 className="mt-snug text-md font-semibold tracking-[-0.01em] text-fg">{category.name}</h2>
                <p className="mt-hair text-sm leading-relaxed text-fg-secondary">{category.description}</p>

                <div className="mt-auto space-y-tight pt-group">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-fg-tertiary">
                      {plural(items.length, 'material')} · {formatDuration(minutes)}
                    </span>
                    <span className="text-fg-secondary tnum">
                      {completed}/{items.length}
                    </span>
                  </div>
                  <ProgressBar value={pct(completed, items.length)} />
                </div>
              </Link>
              </StaggerItem>
            )
          })}
        </div>
      )}
    </Page>
  )
}
