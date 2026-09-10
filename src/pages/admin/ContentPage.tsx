import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Copy, ExternalLink, FilePlus2, MoreHorizontal, Pencil, Search, X } from 'lucide-react'
import type { ContentStatus, Difficulty, Material } from '@/types'
import { useAuth } from '@/features/auth/AuthProvider'
import { materialService } from '@/services'
import { useCategories } from '@/hooks/useCategories'
import { useAsync } from '@/hooks/useAsync'
import { useDebounce } from '@/hooks/useDebounce'
import { formatDate, formatDuration, plural } from '@/lib/format'
import { Page, PageHeader, Toolbar } from '@/components/layout/PageHeader'
import { StatRow, StatTile } from '@/components/common/StatTile'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { DropdownContent, DropdownItem, DropdownMenu, DropdownSeparator, DropdownTrigger } from '@/components/ui/dropdown'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { CardField, CardList, CardListItem, DataTable, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { ContentStatusBadge, DifficultyBadge } from '@/components/ui/status'
import { Tooltip } from '@/components/ui/tooltip'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { TableSkeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { ContentEditor } from '@/components/content/ContentEditor'
import { Emoji } from '@/components/common/Emoji'

export function ContentPage() {
  const { categories } = useCategories()
  const { user } = useAuth()
  const actorId = user!.id
  const toast = useToast()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ContentStatus | 'all'>('all')
  const [categoryId, setCategoryId] = useState('all')
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all')
  const [archiveTarget, setArchiveTarget] = useState<Material | null>(null)
  const [editing, setEditing] = useState<Material | null>(null)
  const [busy, setBusy] = useState(false)

  const debounced = useDebounce(search, 200)

  const { data, loading, error, reload } = useAsync<Material[]>(
    () => materialService.list({ search: debounced, status, categoryId, difficulty, sortBy: 'module' }),
    [debounced, status, categoryId, difficulty],
  )

  const rows = data ?? []
  const published = rows.filter((m) => m.status === 'published').length
  const drafts = rows.filter((m) => m.status === 'draft').length
  const needsReview = rows.filter((m) => m.needsClaimReview).length

  const setStatusFor = async (m: Material, next: ContentStatus, message: string) => {
    setBusy(true)
    await materialService.setStatus(m.id, next, actorId)
    setBusy(false)
    setArchiveTarget(null)
    toast.success(message, m.title)
    reload()
  }

  const duplicate = async (m: Material) => {
    const copy = await materialService.duplicate(m.id, actorId)
    toast.success('Duplicated', `${copy.title} created as a draft.`)
    reload()
  }

  const createDraft = async () => {
    const created = await materialService.create({ title: 'Untitled material' }, actorId)
    toast.success('Draft created', 'Saved to this browser. Add sections and publish when ready.')
    reload()
    setEditing(created)
  }

  const filtersActive = search !== '' || status !== 'all' || categoryId !== 'all' || difficulty !== 'all'

  return (
    <Page>
      <PageHeader
        title="Content"
        description="Every material, including drafts and archived modules learners cannot see."
        crumbs={[{ label: 'Administration' }, { label: 'Content' }]}
        actions={
          <Button variant="primary" size="sm" icon={<FilePlus2 className="size-3.5" />} onClick={() => void createDraft()}>
            New material
          </Button>
        }
      />

      <StatRow className="grid-cols-1 lg:grid-cols-4">
        <StatTile label="Total" value={rows.length} />
        <StatTile label="Published" value={published} tone={published > 0 ? 'success' : 'neutral'} />
        <StatTile label="Drafts" value={drafts} tone={drafts > 0 ? 'warning' : 'neutral'} />
        <StatTile
          label="Claim review"
          value={needsReview}
          tone={needsReview > 0 ? 'danger' : 'neutral'}
          hint={needsReview > 0 ? 'Contains unverified figures' : 'Nothing flagged'}
        />
      </StatRow>

      <Toolbar>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search titles and tags…"
          aria-label="Search content"
          leading={<Search className="size-3.5" />}
          className="w-[260px] max-w-full"
        />
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as ContentStatus | 'all')}
          ariaLabel="Filter by status"
          size="sm"
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'published', label: 'Published' },
            { value: 'draft', label: 'Draft' },
            { value: 'archived', label: 'Archived' },
          ]}
        />
        <Select
          value={categoryId}
          onValueChange={setCategoryId}
          ariaLabel="Filter by category"
          size="sm"
          options={[{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
        />
        <Select
          value={difficulty}
          onValueChange={(v) => setDifficulty(v as Difficulty | 'all')}
          ariaLabel="Filter by difficulty"
          size="sm"
          options={[
            { value: 'all', label: 'All levels' },
            { value: 'foundation', label: 'Foundation' },
            { value: 'intermediate', label: 'Intermediate' },
            { value: 'advanced', label: 'Advanced' },
          ]}
        />
        {filtersActive && (
          <Button
            variant="ghost"
            size="sm"
            icon={<X className="size-3.5" />}
            onClick={() => {
              setSearch('')
              setStatus('all')
              setCategoryId('all')
              setDifficulty('all')
            }}
          >
            Clear
          </Button>
        )}
      </Toolbar>

      {error && <ErrorState onRetry={reload} />}
      {loading && !data && <TableSkeleton rows={8} cols={7} />}
      {data && rows.length === 0 && <EmptyState title="No materials match those filters" />}

      {rows.length > 0 && (
        <Card className="overflow-hidden p-0">
          <DataTable>
            <THead>
              <TR>
                <TH>Title</TH>
                <TH width="150px">Category</TH>
                <TH width="130px">Status</TH>
                <TH width="130px">Level</TH>
                <TH width="90px" className="text-right">
                  Sections
                </TH>
                <TH width="130px">Updated</TH>
                <TH width="48px">
                  <span className="sr-only">Actions</span>
                </TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((m) => {
                const category = categories.find((c) => c.id === m.categoryId)
                return (
                  <TR key={m.id}>
                    <TD>
                      <div className="flex items-center gap-tight">
                        <Link to={`/learning/materials/${m.slug}`} className="font-medium text-fg hover:text-primary">
                          {m.title}
                        </Link>
                        {m.needsClaimReview && (
                          <Tooltip content="Contains figures pending review">
                            <Emoji name="warning" size={15} label="Needs claim review" />
                          </Tooltip>
                        )}
                      </div>
                      <p className="mt-hair text-2xs text-fg-tertiary">
                        Module {m.moduleNumber} · v{m.version} · {formatDuration(m.duration)}
                      </p>
                    </TD>
                    <TD>
                      <span className="text-sm text-fg-secondary">{category?.name ?? ' - '}</span>
                    </TD>
                    <TD>
                      <ContentStatusBadge status={m.status} bare />
                    </TD>
                    <TD>
                      <DifficultyBadge level={m.difficulty} />
                    </TD>
                    <TD className="text-right">
                      <span className="text-sm text-fg-secondary tnum">{m.sections.length}</span>
                    </TD>
                    <TD>
                      <span className="text-2xs text-fg-tertiary">{formatDate(m.updatedAt)}</span>
                    </TD>
                    <TD>
                      <DropdownMenu>
                        <DropdownTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${m.title}`}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownTrigger>
                        <DropdownContent>
                          <DropdownItem icon={<Pencil className="size-4" />} onSelect={() => setEditing(m)}>
                            Edit content
                          </DropdownItem>
                          <DropdownItem
                            icon={<ExternalLink className="size-4" />}
                            onSelect={() => navigate(`/learning/materials/${m.slug}`)}
                          >
                            View as learner
                          </DropdownItem>
                          <DropdownItem icon={<Copy className="size-4" />} onSelect={() => void duplicate(m)}>
                            Duplicate as draft
                          </DropdownItem>
                          <DropdownSeparator />
                          {m.status !== 'published' && (
                            <DropdownItem onSelect={() => void setStatusFor(m, 'published', 'Published')}>
                              Publish
                            </DropdownItem>
                          )}
                          {m.status === 'published' && (
                            <DropdownItem onSelect={() => void setStatusFor(m, 'draft', 'Moved back to draft')}>
                              Unpublish
                            </DropdownItem>
                          )}
                          {m.status !== 'archived' ? (
                            <DropdownItem destructive onSelect={() => setArchiveTarget(m)}>
                              Archive
                            </DropdownItem>
                          ) : (
                            <DropdownItem onSelect={() => void setStatusFor(m, 'draft', 'Restored as draft')}>
                              Restore
                            </DropdownItem>
                          )}
                        </DropdownContent>
                      </DropdownMenu>
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </DataTable>

          <CardList>
            {rows.map((m) => (
              <CardListItem key={m.id} onClick={() => setEditing(m)}>
                <div className="flex items-start justify-between gap-tight">
                  <p className="min-w-0 truncate text-base font-semibold text-fg">{m.title}</p>
                  <ContentStatusBadge status={m.status} />
                </div>
                <p className="mt-hair line-clamp-2 text-sm text-fg-secondary">{m.description}</p>
                <div className="mt-snug border-t border-line pt-tight">
                  <CardField label="Difficulty">
                    <DifficultyBadge level={m.difficulty} />
                  </CardField>
                  <CardField label="Duration">{formatDuration(m.duration)}</CardField>
                  <CardField label="Updated">{formatDate(m.updatedAt)}</CardField>
                </div>
              </CardListItem>
            ))}
          </CardList>
        </Card>
      )}

      <p className="text-sm text-fg-tertiary">{plural(rows.length, 'material')} shown.</p>

      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(v) => !v && setArchiveTarget(null)}
        title="Archive this material?"
        description={
          archiveTarget
            ? `${archiveTarget.title} disappears from learner navigation and search. Existing progress is kept, and you can restore it later.`
            : ''
        }
        confirmLabel="Archive"
        destructive
        loading={busy}
        onConfirm={() => archiveTarget && void setStatusFor(archiveTarget, 'archived', 'Archived')}
      />

      {editing && (
        <ContentEditor
          material={editing}
          actorId={actorId}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}
    </Page>
  )
}
