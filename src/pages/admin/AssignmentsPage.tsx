import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarPlus, Search, Trash2, X } from 'lucide-react'
import type { Assignment, AssignmentStatus, User } from '@/types'
import { useAuth } from '@/features/auth/AuthProvider'
import { assessmentService, assignmentService, materialService, userService } from '@/services'
import type { AssignmentRow } from '@/services/assignmentService'
import { cn } from '@/lib/cn'
import { useAsync } from '@/hooks/useAsync'
import { useDebounce } from '@/hooks/useDebounce'
import { dueLabel, formatDate, plural } from '@/lib/format'
import { resolveTarget } from '@/utils'
import { Page, PageHeader, Toolbar } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { BulkActionBar, CardField, CardList, CardListItem, DataTable, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { AssignmentStatusBadge } from '@/components/ui/status'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { TableSkeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'

export function AssignmentsPage() {
  const { user } = useAuth()
  const actorId = user!.id
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<AssignmentStatus | 'all'>('all')
  const [targetType, setTargetType] = useState<Assignment['targetType'] | 'all'>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [createOpen, setCreateOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [removing, setRemoving] = useState(false)

  const debounced = useDebounce(search, 200)

  const { data, loading, error, reload } = useAsync<AssignmentRow[]>(
    () => assignmentService.list({ search: debounced, status, targetType }),
    [debounced, status, targetType],
  )

  const rows = data ?? []
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))

  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))

  const removeSelected = async () => {
    setRemoving(true)
    const count = selected.size
    await assignmentService.remove([...selected])
    setRemoving(false)
    setRemoveOpen(false)
    setSelected(new Set())
    toast.success(`${plural(count, 'assignment')} removed`)
    reload()
  }

  const overdue = rows.filter((r) => r.status === 'overdue').length

  return (
    <Page>
      <PageHeader
        title="Assignments"
        description="Who has been given what, and whether it landed on time."
        crumbs={[{ label: 'Administration' }, { label: 'Assignments' }]}
        meta={
          overdue > 0 ? (
            <Badge tone="danger" dot>
              {plural(overdue, 'overdue assignment')}
            </Badge>
          ) : undefined
        }
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<CalendarPlus className="size-3.5" />}
            onClick={() => setCreateOpen(true)}
          >
            New assignment
          </Button>
        }
      />

      {selected.size > 0 ? (
        <BulkActionBar count={selected.size} onClear={() => setSelected(new Set())}>
          <Button variant="danger" size="sm" icon={<Trash2 className="size-3.5" />} onClick={() => setRemoveOpen(true)}>
            Remove
          </Button>
        </BulkActionBar>
      ) : (
        <Toolbar>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search learner or content…"
            aria-label="Search assignments"
            leading={<Search className="size-3.5" />}
            className="w-[280px] max-w-full"
          />
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as AssignmentStatus | 'all')}
            ariaLabel="Filter by status"
            size="sm"
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'not-started', label: 'Not started' },
              { value: 'in-progress', label: 'In progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'overdue', label: 'Overdue' },
            ]}
          />
          <Select
            value={targetType}
            onValueChange={(v) => setTargetType(v as Assignment['targetType'] | 'all')}
            ariaLabel="Filter by content type"
            size="sm"
            options={[
              { value: 'all', label: 'All content' },
              { value: 'material', label: 'Materials' },
              { value: 'path', label: 'Learning paths' },
              { value: 'assessment', label: 'Assessments' },
            ]}
          />
          {(search || status !== 'all' || targetType !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              icon={<X className="size-3.5" />}
              onClick={() => {
                setSearch('')
                setStatus('all')
                setTargetType('all')
              }}
            >
              Clear
            </Button>
          )}
        </Toolbar>
      )}

      {error && <ErrorState onRetry={reload} />}
      {loading && !data && <TableSkeleton rows={8} cols={6} />}
      {data && rows.length === 0 && (
        <EmptyState
          title="No assignments match"
          description="Change the filters, or assign something new."
          action={
            <Button variant="secondary" size="sm" onClick={() => setCreateOpen(true)}>
              New assignment
            </Button>
          }
        />
      )}

      {rows.length > 0 && (
        <Card className="overflow-hidden p-0">
          <DataTable>
            <THead>
              <TR>
                <TH width="40px">
                  <Checkbox
                    checked={allSelected ? true : selected.size > 0 ? 'indeterminate' : false}
                    onCheckedChange={toggleAll}
                    ariaLabel="Select all assignments"
                  />
                </TH>
                <TH>Learner</TH>
                <TH>Content</TH>
                <TH width="120px">Type</TH>
                <TH width="140px">Status</TH>
                <TH width="150px">Due</TH>
                <TH width="130px">Assigned</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((a) => {
                const target = resolveTarget(a.targetType, a.targetId)
                const due = dueLabel(a.dueAt)
                return (
                  <TR key={a.id} selected={selected.has(a.id)}>
                    <TD>
                      <Checkbox
                        checked={selected.has(a.id)}
                        onCheckedChange={() => toggleRow(a.id)}
                        ariaLabel={`Select assignment for ${a.userName}`}
                      />
                    </TD>
                    <TD>
                      <p className="font-medium text-fg">{a.userName}</p>
                      <p className="text-2xs text-fg-tertiary">{a.userTeam}</p>
                    </TD>
                    <TD>
                      <Link to={target.to} className="text-fg hover:text-primary">
                        {a.targetLabel}
                      </Link>
                      {a.note && <p className="mt-hair line-clamp-1 text-2xs text-fg-tertiary">{a.note}</p>}
                    </TD>
                    <TD>
                      <Badge tone="neutral">{target.kind}</Badge>
                    </TD>
                    <TD>
                      <AssignmentStatusBadge status={a.status} bare />
                    </TD>
                    <TD>
                      <span className={due.overdue ? 'text-sm font-medium text-danger-fg' : 'text-sm text-fg-secondary'}>
                        {due.text}
                      </span>
                    </TD>
                    <TD>
                      <p className="text-2xs text-fg-tertiary">{formatDate(a.assignedAt)}</p>
                      <p className="text-2xs text-fg-tertiary">by {a.assignerName}</p>
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </DataTable>

          <CardList>
            {rows.map((a) => {
              const due = dueLabel(a.dueAt)
              return (
                <CardListItem key={a.id}>
                  <div className="flex items-start justify-between gap-tight">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-fg">{a.userName}</p>
                      <p className="truncate text-sm text-fg-tertiary">{a.userTeam}</p>
                    </div>
                    <AssignmentStatusBadge status={a.status} />
                  </div>
                  <div className="mt-snug border-t border-line pt-tight">
                    <CardField label="Content">{a.targetLabel}</CardField>
                    <CardField label="Due">
                      <span className={cn(due.overdue && 'text-danger-fg')}>{due.text}</span>
                    </CardField>
                    <CardField label="Assigned by">{a.assignerName}</CardField>
                  </div>
                </CardListItem>
              )
            })}
          </CardList>
        </Card>
      )}

      <CreateAssignmentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        actorId={actorId}
        onCreated={() => {
          setCreateOpen(false)
          reload()
        }}
      />

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title={`Remove ${plural(selected.size, 'assignment')}?`}
        description="The learners keep any progress they have already made, but the work stops appearing as assigned."
        confirmLabel="Remove"
        destructive
        loading={removing}
        onConfirm={() => void removeSelected()}
      />
    </Page>
  )
}

function CreateAssignmentDialog({
  open,
  onOpenChange,
  actorId,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  actorId: string
  onCreated: () => void
}) {
  const toast = useToast()
  const [targetType, setTargetType] = useState<Assignment['targetType']>('material')
  const [targetId, setTargetId] = useState('')
  const [dueAt, setDueAt] = useState(defaultDueDate())
  const [note, setNote] = useState('')
  const [userIds, setUserIds] = useState<Set<string>>(new Set())
  const [userSearch, setUserSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: users } = useAsync<User[]>(() => userService.all(), [])
  const { data: assessments } = useAsync(() => assessmentService.all(), [])
  // Assignable content comes from the service. Reading the seed files here
  // meant the picker offered ids that do not exist in the database - the
  // assignment would then fail on the target-existence trigger.
  const { data: materials } = useAsync(() => materialService.list({ status: 'published' }), [])
  const { data: paths } = useAsync(() => materialService.paths(), [])

  const targetOptions = useMemo(() => {
    if (targetType === 'material') {
      return (materials ?? []).map((m) => ({
        value: m.id,
        label: m.title,
        hint: `Module ${m.moduleNumber}`,
      }))
    }
    if (targetType === 'path') {
      return (paths ?? [])
        .filter((p) => p.status === 'published')
        .map((p) => ({ value: p.id, label: p.title }))
    }
    return (assessments ?? [])
      .filter((a) => a.status === 'published')
      .map((a) => ({ value: a.id, label: a.title }))
  }, [targetType, assessments, materials, paths])

  const candidates = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    return (users ?? [])
      .filter((u) => u.status !== 'inactive')
      .filter((u) => (q ? `${u.name} ${u.email} ${u.team}`.toLowerCase().includes(q) : true))
  }, [users, userSearch])

  const reset = () => {
    setTargetType('material')
    setTargetId('')
    setDueAt(defaultDueDate())
    setNote('')
    setUserIds(new Set())
    setUserSearch('')
  }

  const toggleUser = (id: string) =>
    setUserIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const canSubmit = targetId !== '' && userIds.size > 0 && dueAt !== ''

  const submit = async () => {
    if (!canSubmit) return
    setSaving(true)
    const created = await assignmentService.createMany(
      {
        userIds: [...userIds],
        targetType,
        targetId,
        dueAt: new Date(`${dueAt}T17:00:00`).toISOString(),
        note: note.trim() || undefined,
      },
      actorId,
    )
    setSaving(false)
    toast.success(`${plural(created.length, 'assignment')} created`)
    reset()
    onCreated()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) reset()
      }}
      title="Assign content"
      description="Pick what to assign, then who gets it."
      size="lg"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" loading={saving} disabled={!canSubmit} onClick={() => void submit()}>
            Assign to {userIds.size || 'no'} {userIds.size === 1 ? 'learner' : 'learners'}
          </Button>
        </>
      }
    >
      <div className="space-y-group py-tight">
        <div className="grid grid-cols-1 gap-group sm:grid-cols-2">
          <Field label="Content type" htmlFor="assign-type">
            <Select
              value={targetType}
              onValueChange={(v) => {
                setTargetType(v as Assignment['targetType'])
                setTargetId('')
              }}
              ariaLabel="Content type"
              options={[
                { value: 'material', label: 'Material' },
                { value: 'path', label: 'Learning path' },
                { value: 'assessment', label: 'Assessment' },
              ]}
            />
          </Field>
          <Field label="Due date" htmlFor="assign-due">
            <Input id="assign-due" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </Field>
        </div>

        <Field label="Content" required htmlFor="assign-target">
          <Select
            value={targetId}
            onValueChange={setTargetId}
            ariaLabel="Content to assign"
            placeholder="Choose content…"
            options={targetOptions}
          />
        </Field>

        <Field label="Note" hint="Shown to the learner alongside the assignment." htmlFor="assign-note">
          <Textarea
            id="assign-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Finish before Monday's huddle."
          />
        </Field>

        <Field label={`Learners (${userIds.size} selected)`} required htmlFor="assign-users">
          <Input
            id="assign-users"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Filter by name, email, or team…"
            leading={<Search className="size-3.5" />}
          />
        </Field>

        <div className="max-h-[220px] overflow-y-auto rounded-md border border-line scrollbar-thin">
          {candidates.length === 0 ? (
            <p className="px-card py-6 text-center text-sm text-fg-tertiary">No matching learners.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {candidates.map((u) => (
                <li key={u.id} className="px-card py-tight">
                  <Checkbox
                    checked={userIds.has(u.id)}
                    onCheckedChange={() => toggleUser(u.id)}
                    label={u.name}
                    description={`${u.team} · ${u.jobTitle}`}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Dialog>
  )
}

function defaultDueDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}
