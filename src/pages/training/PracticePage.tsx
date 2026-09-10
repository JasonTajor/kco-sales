import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, MessageSquareText, PhoneCall, Search, ShieldQuestion } from 'lucide-react'
import type { CustomerPersonality, PracticeScenario } from '@/types'
import { trainingService } from '@/services'
import { personalityMeta } from '@/data/scenarios'
import { useAsync } from '@/hooks/useAsync'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/cn'
import { Stagger, StaggerItem } from '@/components/motion/Motion'
import { plural } from '@/lib/format'
import { Emoji } from '@/components/common/Emoji'
import { EmojiTile, type TileTone } from '@/components/common/EmojiTile'
import { Page, PageHeader, Toolbar } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { SegmentedControl } from '@/components/ui/tabs'
import { DifficultyBadge } from '@/components/ui/status'
import { CardGridSkeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/ui/states'

type Channel = 'all' | PracticeScenario['channel']

const channelIcon = {
  phone: PhoneCall,
  chat: MessageSquareText,
  objection: ShieldQuestion,
} as const

/** Each customer type gets a pack colour, so the grid reads at a glance. */
const personalityTone: Record<CustomerPersonality, TileTone> = {
  angry: 'chili',
  sleepy: 'original',
  confused: 'ube',
  cheap: 'cheese',
  funny: 'classic',
  'seen-zone': 'lightblue',
  curious: 'ube',
  busy: 'cheese',
  'send-details': 'neutral',
}

export function PracticePage() {
  const [search, setSearch] = useState('')
  const [channel, setChannel] = useState<Channel>('all')
  const [personality, setPersonality] = useState<CustomerPersonality | 'all'>('all')
  const debounced = useDebounce(search, 200)

  const { data, loading, error, reload } = useAsync<PracticeScenario[]>(
    () => trainingService.scenarios({ channel, personality, search: debounced }),
    [channel, personality, debounced],
  )

  const rows = data ?? []

  return (
    <Page>
      <PageHeader
        title="Practice Scenarios"
        description="Nine customer types, branching turn by turn. Pick a reply and see what it costs you."
        crumbs={[{ label: 'Training' }, { label: 'Practice Scenarios' }]}
      />

      <Toolbar className="justify-between">
        <div className="flex flex-wrap items-center gap-tight">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search scenarios…"
            aria-label="Search scenarios"
            leading={<Search className="size-3.5" />}
            className="w-[240px] max-w-full"
          />
          <Select
            value={personality}
            onValueChange={(v) => setPersonality(v as CustomerPersonality | 'all')}
            ariaLabel="Filter by customer type"
            size="sm"
            options={[
              { value: 'all', label: 'All customer types' },
              ...Object.entries(personalityMeta).map(([value, meta]) => ({
                value,
                label: meta.label,
                icon: <Emoji name={meta.emoji} size={16} play="loop" />,
              })),
            ]}
          />
        </div>

        <SegmentedControl<Channel>
          value={channel}
          onChange={setChannel}
          size="sm"
          ariaLabel="Filter by channel"
          options={[
            { value: 'all', label: 'All' },
            { value: 'phone', label: 'Phone' },
            { value: 'chat', label: 'Chat' },
            { value: 'objection', label: 'Objection' },
          ]}
        />
      </Toolbar>

      <p className="text-sm text-fg-tertiary" aria-live="polite">
        {loading ? 'Loading…' : plural(rows.length, 'scenario')}
      </p>

      {error && <ErrorState onRetry={reload} />}
      {loading && !data && <CardGridSkeleton count={6} />}
      {!loading && rows.length === 0 && !error && (
        <EmptyState title="No scenarios match" description="Try another customer type or channel." />
      )}

      <Stagger className="grid grid-cols-1 gap-group md:grid-cols-2 xl:grid-cols-3">
        {rows.map((s) => {
          const meta = personalityMeta[s.personality]
          const Icon = channelIcon[s.channel]
          return (
            <StaggerItem key={s.id} className="h-full">
            <Link
              key={s.id}
              to={`/training/practice/${s.slug}`}
              data-emoji-group
              className="group flex flex-col chunk p-card chunk-press"
            >
              <div className="flex items-start gap-snug">
                <EmojiTile name={meta.emoji} tone={personalityTone[s.personality]} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-2xs font-semibold uppercase tracking-wider text-fg-tertiary">
                    {meta.label}
                  </p>
                  <h2 className="mt-hair text-md font-semibold tracking-tight text-fg group-hover:text-primary">
                    {s.title}
                  </h2>
                </div>
              </div>

              <p className="mt-snug line-clamp-3 flex-1 text-sm leading-[1.5] text-fg-secondary">{s.setup}</p>

              <div className="mt-group flex items-center justify-between border-t border-line pt-snug">
                <div className="flex items-center gap-tight">
                  <DifficultyBadge level={s.difficulty} />
                  <Badge tone="neutral">
                    <Icon className="size-3" aria-hidden />
                    {s.channel === 'objection' ? 'Objection' : s.channel === 'phone' ? 'Phone' : 'Chat'}
                  </Badge>
                </div>
                <span className={cn('text-2xs text-fg-tertiary tnum')}>{plural(s.turns.length, 'turn')}</span>
              </div>

              <span className="mt-snug flex items-center gap-hair text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Start scenario
                <ArrowRight className="size-3.5" aria-hidden />
              </span>
            </Link>
            </StaggerItem>
          )
        })}
      </Stagger>
    </Page>
  )
}
