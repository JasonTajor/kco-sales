import { useState } from 'react'
import { FilePlus2, Loader2, Search, Trash2, X } from 'lucide-react'
import type { Difficulty, TrainingActivity } from '@/types'
import { trainingService } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { useDebounce } from '@/hooks/useDebounce'
import { Page, PageHeader, Toolbar } from '@/components/layout/PageHeader'
import { StatRow, StatTile } from '@/components/common/StatTile'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ContentStatusBadge, DifficultyBadge } from '@/components/ui/status'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { TableSkeleton } from '@/components/ui/skeleton'
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
import { Emoji } from '@/components/common/Emoji'
import { useToast } from '@/components/ui/toast'
import { usePermissions } from '@/features/auth/PermissionProvider'
import { plural } from '@/lib/format'

/**
 * Training activity management (§20).
 *
 * Facilitator-led exercises: the roleplays, the Objection Battle, the daily
 * 15-minute routine. Editing is a form rather than the block editor, because
 * an activity is a fixed set of fields - objective, instructions, facilitator
 * notes, expected outcome - not free-form content.
 *
 * Instructions and facilitator notes are line-per-step: the source documents
 * are written that way, and a single textarea keeps the editing honest to how
 * a facilitator reads them aloud.
 */
export function TrainingAdminPage() {
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 200)
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all')
  const [editing, setEditing] = useState<TrainingActivity | null>(null)

  const { data, loading, error, reload } = useAsync(
    () => trainingService.activities(debounced, difficulty),
    [debounced, difficulty],
  )

  const rows = data ?? []
  const published = rows.filter((a) => a.status === 'published').length
  const minutes = rows.reduce((n, a) => n + a.durationMinutes, 0)

  return (
    <Page>
      <PageHeader
        title="Training modules"
        description="Facilitator-led activities, roleplays and drills."
        crumbs={[{ label: 'Administration' }, { label: 'Training modules' }]}
        actions={
          <Button onClick={() => setEditing(blankActivity())}>
            <FilePlus2 className="size-4" aria-hidden />
            New activity
          </Button>
        }
      />

      <StatRow>
        <StatTile label="Activities" value={rows.length} hint={plural(rows.length, 'activity')} />
        <StatTile label="Published" value={published} hint="Visible to sales users" />
        <StatTile label="Total runtime" value={minutes} unit="min" hint="If every activity is run" />
        <StatTile
          label="Average"
          value={rows.length ? Math.round(minutes / rows.length) : 0}
          unit="min"
          hint="Per activity"
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
            placeholder="Search activities"
            aria-label="Search activities"
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
          value={difficulty}
          onValueChange={(v) => setDifficulty(v as Difficulty | 'all')}
          ariaLabel="Filter by difficulty"
          options={[
            { value: 'all', label: 'All levels' },
            { value: 'foundation', label: 'Foundation' },
            { value: 'intermediate', label: 'Intermediate' },
            { value: 'advanced', label: 'Advanced' },
          ]}
        />
      </Toolbar>

      {error && <ErrorState description={error.message} onRetry={reload} />}
      {loading && !data && <TableSkeleton rows={5} />}

      {!loading && rows.length === 0 && !error && (
        <EmptyState
          icon={<Emoji name="theater" size={28} play="loop" />}
          title="No activities match those filters"
          description="Try a broader search, or clear the difficulty filter."
        />
      )}

      {rows.length > 0 && (
        <>
          <DataTable>
            <THead>
              <TR>
                <TH>Activity</TH>
                <TH className="w-[8rem]">Duration</TH>
                <TH className="w-[9rem]">Participants</TH>
                <TH className="w-[9rem]">Level</TH>
                <TH className="w-[8rem]">Status</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((a) => (
                <TR key={a.id} onClick={() => setEditing(a)}>
                  <TD>
                    <span className="block font-bold text-fg">{a.title}</span>
                    <span className="mt-hair block max-w-prose truncate text-xs text-fg-tertiary">
                      {a.objective}
                    </span>
                  </TD>
                  <TD className="tnum text-fg-secondary">{a.durationMinutes} min</TD>
                  <TD className="text-fg-secondary">{a.participants}</TD>
                  <TD>
                    <DifficultyBadge level={a.difficulty} />
                  </TD>
                  <TD>
                    <ContentStatusBadge status={a.status} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </DataTable>

          <CardList>
            {rows.map((a) => (
              <CardListItem key={a.id} title={a.title} onClick={() => setEditing(a)}>
                <CardField label="Duration">{a.durationMinutes} min</CardField>
                <CardField label="Participants">{a.participants}</CardField>
                <CardField label="Level">{a.difficulty}</CardField>
                <CardField label="Status">{a.status}</CardField>
              </CardListItem>
            ))}
          </CardList>
        </>
      )}

      <ActivityDialog
        activity={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          reload()
        }}
      />
    </Page>
  )
}

function blankActivity(): TrainingActivity {
  return {
    id: '',
    slug: '',
    title: '',
    objective: '',
    durationMinutes: 15,
    participants: '',
    difficulty: 'foundation',
    instructions: [],
    facilitatorNotes: [],
    expectedOutcome: '',
    tags: [],
    status: 'draft',
  }
}

/**
 * The activity form.
 *
 * Deliberately shows every field the record carries, including the facilitator
 * notes a learner never sees, so an admin can tell at a glance what is missing
 * from a seeded activity.
 */
function ActivityDialog({
  activity,
  onClose,
  onSaved,
}: {
  activity: TrainingActivity | null
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const { can } = usePermissions()
  const [draft, setDraft] = useState<TrainingActivity | null>(activity)
  const [busy, setBusy] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)

  // Re-seed when a different row is opened.
  if (activity && draft?.id !== activity.id) setDraft(activity)

  if (!activity || !draft) return null

  const patch = (p: Partial<TrainingActivity>) => setDraft({ ...draft, ...p })
  const isNew = !activity.id
  const editable = can('training.manage')

  const problems: string[] = []
  if (!draft.title.trim()) problems.push('a title')
  if (!draft.objective.trim()) problems.push('an objective')
  if (draft.instructions.length === 0) problems.push('at least one instruction')

  const save = async () => {
    setBusy(true)
    try {
      await trainingService.saveActivity({ ...draft, id: draft.id || undefined })
      toast.success(isNew ? 'Activity created' : 'Activity saved')
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the activity.')
    } finally {
      setBusy(false)
    }
  }

  const archive = async () => {
    setBusy(true)
    try {
      await trainingService.archiveActivity(draft.id)
      toast.success('Activity archived')
      setArchiveOpen(false)
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not archive it.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(v) => !v && onClose()}
      size="lg"
      title={isNew ? 'New activity' : draft.title}
      description={
        isNew
          ? 'Fill in what a facilitator needs to run this.'
          : 'Every field on this activity record.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={busy || !editable || problems.length > 0}
            title={
              !editable
                ? 'Needs the "Manage activities" permission'
                : problems.length > 0
                  ? `Still needs ${problems.join(', ')}`
                  : undefined
            }
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : 'Save'}
          </Button>
        </>
      }
    >
      <div className="space-y-group">
        <Field label="Title">
          <Input value={draft.title} onChange={(e) => patch({ title: e.target.value })} />
        </Field>

        <Field label="Objective" hint="What the activity is for, in one sentence.">
          <Textarea
            rows={2}
            value={draft.objective}
            onChange={(e) => patch({ objective: e.target.value })}
          />
        </Field>

        <div className="grid gap-tight sm:grid-cols-3">
          <Field label="Duration (min)">
            <Input
              type="number"
              min={1}
              value={draft.durationMinutes}
              onChange={(e) => patch({ durationMinutes: Math.max(1, Number(e.target.value)) })}
            />
          </Field>
          <Field label="Participants">
            <Input
              value={draft.participants}
              onChange={(e) => patch({ participants: e.target.value })}
              placeholder="4-12, in pairs"
            />
          </Field>
          <Field label="Level">
            <Select
              ariaLabel="Difficulty"
              value={draft.difficulty}
              onValueChange={(v) => patch({ difficulty: v as Difficulty })}
              options={[
                { value: 'foundation', label: 'Foundation' },
                { value: 'intermediate', label: 'Intermediate' },
                { value: 'advanced', label: 'Advanced' },
              ]}
            />
          </Field>
        </div>

        <Field label="Instructions" hint="One step per line, in the order they are run.">
          <Textarea
            rows={6}
            value={draft.instructions.join('\n')}
            onChange={(e) => patch({ instructions: splitLines(e.target.value) })}
          />
        </Field>

        <Field label="Facilitator notes" hint="One per line. Not shown to learners.">
          <Textarea
            rows={4}
            value={draft.facilitatorNotes.join('\n')}
            onChange={(e) => patch({ facilitatorNotes: splitLines(e.target.value) })}
          />
        </Field>

        <Field label="Expected outcome">
          <Textarea
            rows={2}
            value={draft.expectedOutcome}
            onChange={(e) => patch({ expectedOutcome: e.target.value })}
          />
        </Field>

        <Field label="Tags" hint="Comma separated.">
          <Input
            value={draft.tags.join(', ')}
            onChange={(e) =>
              patch({
                tags: e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
          />
        </Field>

        {!editable && (
          <Callout variant="info" title="View only">
            You can see this activity but not change it. Editing needs the “Manage activities”
            permission.
          </Callout>
        )}

        {problems.length > 0 && editable && (
          <p className="text-xs text-warning-fg">Still needs {problems.join(', ')}.</p>
        )}

        {!isNew && (
          <div className="flex flex-wrap items-center gap-tight border-t border-line pt-group">
            <Badge tone="neutral">{draft.slug}</Badge>
            <ContentStatusBadge status={draft.status} />
            <Select
              size="sm"
              ariaLabel="Status"
              value={draft.status}
              disabled={!editable}
              onValueChange={(v) => patch({ status: v as TrainingActivity['status'] })}
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'published', label: 'Published' },
                { value: 'archived', label: 'Archived' },
              ]}
            />
            <span className="flex-1" />
            {editable && draft.status !== 'archived' && (
              <Button variant="ghost" size="sm" onClick={() => setArchiveOpen(true)} disabled={busy}>
                <Trash2 className="size-3.5 text-danger" aria-hidden />
                Archive
              </Button>
            )}
          </div>
        )}

        <ConfirmDialog
          open={archiveOpen}
          onOpenChange={setArchiveOpen}
          title={`Archive ${draft.title}?`}
          description="It stops appearing for sales users. Nothing is deleted, so any assignment that references it keeps working."
          confirmLabel="Archive"
          destructive
          onConfirm={archive}
        />
      </div>
    </Dialog>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-tight">
      <p className="text-xs font-bold text-fg-secondary">{label}</p>
      {children}
      {hint && <p className="text-2xs text-fg-tertiary">{hint}</p>}
    </div>
  )
}

/** Blank lines are dropped: an empty step is never meaningful. */
const splitLines = (v: string) =>
  v
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
