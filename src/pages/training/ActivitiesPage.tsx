import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Search } from 'lucide-react'
import type { Difficulty, TrainingActivity } from '@/types'
import { Stagger, StaggerItem } from '@/components/motion/Motion'
import { trainingService } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { useDebounce } from '@/hooks/useDebounce'
import { plural } from '@/lib/format'
import { Page, PageHeader, Toolbar } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/tabs'
import { DifficultyBadge } from '@/components/ui/status'
import { CardGridSkeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { Emoji } from '@/components/common/Emoji'

export function ActivitiesPage() {
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all')
  const debounced = useDebounce(search, 200)

  const { data, loading, error, reload } = useAsync<TrainingActivity[]>(
    () => trainingService.activities(debounced, difficulty),
    [debounced, difficulty],
  )

  const rows = data ?? []

  return (
    <Page>
      <PageHeader
        title="Training Activities"
        description="Facilitator-led exercises for huddles and training days. Each one runs in under an hour."
        crumbs={[{ label: 'Training' }, { label: 'Activities' }]}
      />

      <Toolbar className="justify-between">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search activities…"
          aria-label="Search activities"
          leading={<Search className="size-3.5" />}
          className="w-[260px] max-w-full"
        />
        <SegmentedControl<Difficulty | 'all'>
          value={difficulty}
          onChange={setDifficulty}
          size="sm"
          ariaLabel="Filter by difficulty"
          options={[
            { value: 'all', label: 'All' },
            { value: 'foundation', label: 'Foundation' },
            { value: 'intermediate', label: 'Intermediate' },
            { value: 'advanced', label: 'Advanced' },
          ]}
        />
      </Toolbar>

      <p className="text-sm text-fg-tertiary" aria-live="polite">
        {loading ? 'Loading…' : plural(rows.length, 'activity', 'activities')}
      </p>

      {error && <ErrorState onRetry={reload} />}
      {loading && !data && <CardGridSkeleton count={6} />}
      {!loading && rows.length === 0 && !error && (
        <EmptyState title="No activities match" description="Try a different search term or level." />
      )}

      <Stagger className="grid grid-cols-1 gap-group md:grid-cols-2 xl:grid-cols-3">
        {rows.map((a) => (
          <StaggerItem key={a.id} className="h-full">
          <Link
            key={a.id}
            to={`/training/activities/${a.slug}`}
            className="group flex flex-col chunk p-card chunk-press"
          >
            <div className="flex items-center gap-tight">
              <DifficultyBadge level={a.difficulty} />
              <Badge tone="neutral">
                <Emoji name="hourglass" size={13} />
                {a.durationMinutes} min
              </Badge>
            </div>

            <h2 className="mt-snug text-md font-semibold tracking-tight text-fg group-hover:text-primary">{a.title}</h2>
            <p className="mt-hair line-clamp-3 flex-1 text-sm leading-[1.5] text-fg-secondary">{a.objective}</p>

            <div className="mt-group flex items-center justify-between border-t border-line pt-snug">
              <span className="flex min-w-0 items-center gap-tight text-2xs text-fg-tertiary">
                <Emoji name="handshake" size={13} />
                <span className="truncate">{a.participants}</span>
              </span>
              <ArrowRight
                className="size-3.5 shrink-0 text-fg-tertiary transition-colors group-hover:text-primary"
                aria-hidden
              />
            </div>
          </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </Page>
  )
}
