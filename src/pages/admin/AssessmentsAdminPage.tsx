import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, FilePlus2, MoreHorizontal, Pencil, Search, X } from 'lucide-react'
import { assessmentAdminService } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { useDebounce } from '@/hooks/useDebounce'
import { formatDate, plural } from '@/lib/format'
import { Page, PageHeader, Toolbar } from '@/components/layout/PageHeader'
import { StatRow, StatTile } from '@/components/common/StatTile'
import { Button } from '@/components/ui/button'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import {
  DropdownContent,
  DropdownItem,
  DropdownMenu,
  DropdownSeparator,
  DropdownTrigger,
} from '@/components/ui/dropdown'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  CardField,
  CardList,
  CardListItem,
  DataTable,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui/table'
import { ContentStatusBadge } from '@/components/ui/status'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { TableSkeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { Emoji } from '@/components/common/Emoji'

/**
 * Assessment management (§16).
 *
 * The list; the builder lives in `AssessmentBuilderPage`. Splitting them means
 * the builder can own an unsaved-draft state without this table having to care,
 * and the table stays a table.
 *
 * Archive rather than delete (§75): attempts reference the assessment, so a
 * real deletion would either take a learner's result history with it or be
 * refused by the foreign key.
 */
type StatusFilter = 'all' | 'draft' | 'published' | 'archived'

export function AssessmentsAdminPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 200)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; title: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const { data, loading, error, reload } = useAsync(() => assessmentAdminService.list(), [])

  const rows = (data ?? []).filter((a) => {
    if (status !== 'all' && a.status !== status) return false
    const q = debounced.trim().toLowerCase()
    return q ? a.title.toLowerCase().includes(q) : true
  })

  const published = (data ?? []).filter((a) => a.status === 'published').length
  const drafts = (data ?? []).filter((a) => a.status === 'draft').length
  const questionTotal = (data ?? []).reduce((n, a) => n + a.questionCount, 0)

  const create = async () => {
    const title = newTitle.trim()
    if (!title) return
    setBusy(true)
    try {
      const id = await assessmentAdminService.create({ title })
      toast.success('Assessment created')
      setCreating(false)
      setNewTitle('')
      navigate(`/admin/assessments/${id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the assessment.')
    } finally {
      setBusy(false)
    }
  }

  const duplicate = async (id: string) => {
    try {
      const copy = await assessmentAdminService.duplicate(id)
      toast.success('Duplicated as a draft')
      navigate(`/admin/assessments/${copy}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not duplicate.')
    }
  }

  const archive = async () => {
    if (!archiveTarget) return
    setBusy(true)
    try {
      await assessmentAdminService.archive(archiveTarget.id)
      toast.success(`${archiveTarget.title} archived`)
      setArchiveTarget(null)
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not archive.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page>
      <PageHeader
        title="Assessments"
        description="Build, publish and version the tests behind each module."
        crumbs={[{ label: 'Administration' }, { label: 'Assessments' }]}
        actions={
          <Button onClick={() => setCreating(true)}>
            <FilePlus2 className="size-4" aria-hidden />
            New assessment
          </Button>
        }
      />

      <StatRow>
        <StatTile label="Published" value={published} hint="Visible to sales users" />
        <StatTile label="Drafts" value={drafts} hint="Not yet visible" />
        <StatTile label="Questions" value={questionTotal} hint="Across all assessments" />
        <StatTile
          label="Total"
          value={(data ?? []).length}
          hint={plural((data ?? []).length, 'assessment')}
        />
      </StatRow>

      <Toolbar>
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-tight top-1/2 size-4 -translate-y-1/2 text-fg-tertiary"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assessments"
            aria-label="Search assessments"
            className="pl-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-tight top-1/2 -translate-y-1/2 text-fg-tertiary hover:text-fg"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <Select
          value={status}
          onValueChange={(v) => setStatus(v as StatusFilter)}
          ariaLabel="Filter by status"
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'published', label: 'Published' },
            { value: 'draft', label: 'Draft' },
            { value: 'archived', label: 'Archived' },
          ]}
        />
      </Toolbar>

      {error && <ErrorState description={error.message} onRetry={reload} />}
      {loading && !data && <TableSkeleton rows={5} />}

      {!loading && rows.length === 0 && !error && (
        <EmptyState
          icon={<Emoji name="pencil" size={28} play="loop" />}
          title={data?.length ? 'No assessments match those filters' : 'No assessments yet'}
          description={
            data?.length
              ? 'Try a broader search or clear the status filter.'
              : 'Create one, add questions, then publish it so sales users can take it.'
          }
          action={
            data?.length ? undefined : (
              <Button onClick={() => setCreating(true)}>New assessment</Button>
            )
          }
        />
      )}

      {rows.length > 0 && (
        <>
          <DataTable>
            <THead>
              <TR>
                <TH>Assessment</TH>
                <TH className="w-[7rem]">Questions</TH>
                <TH className="w-[7rem]">Pass mark</TH>
                <TH className="w-[8rem]">Status</TH>
                <TH className="w-[9rem]">Updated</TH>
                <TH className="w-[4rem]"><span className="sr-only">Actions</span></TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((a) => (
                <TR key={a.id} onClick={() => navigate(`/admin/assessments/${a.id}`)}>
                  <TD>
                    <span className="font-bold text-fg">{a.title}</span>
                  </TD>
                  <TD className="tnum text-fg-secondary">{a.questionCount}</TD>
                  <TD className="tnum text-fg-secondary">{a.passingScore}%</TD>
                  <TD>
                    <ContentStatusBadge status={a.status as 'draft' | 'published' | 'archived'} />
                  </TD>
                  <TD className="text-fg-tertiary">{formatDate(a.updatedAt)}</TD>
                  <TD>
                    <DropdownMenu>
                      <DropdownTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Actions for ${a.title}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownTrigger>
                      <DropdownContent align="end">
                        <DropdownItem
                          icon={<Pencil className="size-4" />}
                          onSelect={() => navigate(`/admin/assessments/${a.id}`)}
                        >
                          Edit
                        </DropdownItem>
                        <DropdownItem
                          icon={<Copy className="size-4" />}
                          onSelect={() => void duplicate(a.id)}
                        >
                          Duplicate
                        </DropdownItem>
                        <DropdownSeparator />
                        <DropdownItem
                          destructive
                          onSelect={() => setArchiveTarget({ id: a.id, title: a.title })}
                        >
                          Archive
                        </DropdownItem>
                      </DropdownContent>
                    </DropdownMenu>
                  </TD>
                </TR>
              ))}
            </TBody>
          </DataTable>

          <CardList>
            {rows.map((a) => (
              <CardListItem key={a.id} title={a.title} to={`/admin/assessments/${a.id}`}>
                <CardField label="Questions">{a.questionCount}</CardField>
                <CardField label="Pass mark">{a.passingScore}%</CardField>
                <CardField label="Status">{a.status}</CardField>
              </CardListItem>
            ))}
          </CardList>
        </>
      )}

      <Dialog
        open={creating}
        onOpenChange={setCreating}
        title="New assessment"
        description="Give it a title. You can change everything else in the builder."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={create} disabled={busy || !newTitle.trim()}>
              Create
            </Button>
          </>
        }
      >
        <label htmlFor="assessment-title" className="text-xs font-bold text-fg-secondary">
          Title
        </label>
        <Input
          id="assessment-title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Phone Etiquette Assessment"
          className="mt-tight"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') void create()
          }}
        />
      </Dialog>

      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(v) => !v && setArchiveTarget(null)}
        title={`Archive ${archiveTarget?.title ?? ''}?`}
        description="It stops appearing for sales users. Existing attempts and results are kept, which is why this archives rather than deletes."
        confirmLabel="Archive"
        destructive
        onConfirm={archive}
      />
    </Page>
  )
}
