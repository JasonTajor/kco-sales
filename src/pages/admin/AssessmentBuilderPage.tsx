import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Eye,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react'
import type { QuestionType } from '@/types'
import type { AssessmentDraft, DraftQuestion } from '@/types/assessmentAdmin'
import {
  assessmentProblems,
  blankQuestion,
  QUESTION_TYPES,
  questionProblems,
} from '@/types/assessmentAdmin'
import { assessmentAdminService, materialService } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { Page, PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Card, CardHeader } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ContentStatusBadge } from '@/components/ui/status'
import { ErrorState } from '@/components/ui/states'
import { MaterialSkeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { cn } from '@/lib/cn'

/**
 * The assessment builder (§16).
 *
 * Settings on the left, the question list on the right. Each question saves on
 * its own - `admin_save_question` writes the question and replaces its choices
 * in one transaction, then validates the result - so there is no giant "save
 * everything" button that can half-succeed.
 *
 * Validation is duplicated on purpose. `questionProblems()` runs here so the
 * editor can point at what is wrong before you press anything, and
 * `validate_question_choices()` runs in the database so a malformed question
 * cannot be stored regardless of which client wrote it. The UI copy is a
 * convenience; the database is the rule.
 */
export function AssessmentBuilderPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const { data, loading, error, reload, setData } = useAsync(
    () => assessmentAdminService.get(id),
    [id],
  )
  const modules = useAsync(() => materialService.list({}), [])

  const [savingSettings, setSavingSettings] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DraftQuestion | null>(null)

  if (loading) return <MaterialSkeleton />
  if (error) return <ErrorState description={error.message} onRetry={reload} />
  if (!data) return <NotFoundPage />

  const draft = data
  const problems = assessmentProblems(draft)
  const totalPoints = draft.questions.reduce((n, q) => n + q.points, 0)

  const patchDraft = (patch: Partial<AssessmentDraft>) =>
    setData((prev) => ({ ...(prev as AssessmentDraft), ...patch }))

  const saveSettings = async (patch: Partial<AssessmentDraft>) => {
    patchDraft(patch)
    setSavingSettings(true)
    try {
      await assessmentAdminService.updateSettings(draft.id, patch)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save settings.')
      reload()
    } finally {
      setSavingSettings(false)
    }
  }

  const addQuestion = (type: QuestionType) => {
    patchDraft({
      questions: [...draft.questions, blankQuestion(type, draft.questions.length)],
    })
  }

  const saveQuestion = async (index: number, question: DraftQuestion) => {
    const invalid = questionProblems(question)
    if (invalid.length > 0) {
      toast.error(invalid[0]!)
      return
    }
    try {
      const savedId = await assessmentAdminService.saveQuestion(draft.id, {
        ...question,
        sortOrder: index,
      })
      patchDraft({
        questions: draft.questions.map((q, i) =>
          i === index ? { ...question, id: savedId, sortOrder: index } : q,
        ),
      })
      toast.success('Question saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the question.')
    }
  }

  const removeQuestion = async (question: DraftQuestion) => {
    // An unsaved question only exists in this component's state.
    if (question.id) {
      try {
        await assessmentAdminService.deleteQuestion(question.id)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not delete the question.')
        return
      }
    }
    patchDraft({ questions: draft.questions.filter((q) => q !== question) })
    setDeleteTarget(null)
    toast.success('Question removed')
  }

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= draft.questions.length) return

    const next = [...draft.questions]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved!)
    patchDraft({ questions: next.map((q, i) => ({ ...q, sortOrder: i })) })

    const ids = next.map((q) => q.id).filter((v): v is string => Boolean(v))
    if (ids.length === next.length) {
      try {
        await assessmentAdminService.reorderQuestions(draft.id, ids)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not save the new order.')
        reload()
      }
    }
  }

  const setStatus = async (status: 'draft' | 'published' | 'archived') => {
    try {
      await assessmentAdminService.setStatus(draft.id, status)
      patchDraft({ status })
      toast.success(status === 'published' ? 'Assessment published' : `Moved to ${status}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change the status.')
    }
    setPublishOpen(false)
  }

  return (
    <Page>
      <PageHeader
        title={draft.title || 'Untitled assessment'}
        description="Settings, questions and answer keys. Sales users only ever see published assessments."
        crumbs={[
          { label: 'Administration' },
          { label: 'Assessments', to: '/admin/assessments' },
          { label: draft.title || 'Untitled' },
        ]}
        meta={
          <>
            <ContentStatusBadge status={draft.status} />
            <Badge tone="neutral">
              {draft.questions.length} question{draft.questions.length === 1 ? '' : 's'}
            </Badge>
            <Badge tone="neutral">{totalPoints} points</Badge>
            <Badge tone="neutral">Pass {draft.passingScore}%</Badge>
            {savingSettings && (
              <span className="flex items-center gap-hair text-2xs text-fg-tertiary">
                <Loader2 className="size-3 animate-spin" aria-hidden />
                Saving
              </span>
            )}
          </>
        }
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => navigate(`/training/assessments/${draft.slug}`)}
            >
              <Eye className="size-4" aria-hidden />
              Preview
            </Button>
            {draft.status === 'published' ? (
              <Button variant="secondary" onClick={() => void setStatus('draft')}>
                Unpublish
              </Button>
            ) : (
              <Button onClick={() => setPublishOpen(true)} disabled={problems.length > 0}>
                Publish
              </Button>
            )}
          </>
        }
      />

      {/* Publishing is blocked, and the reasons are listed rather than implied
          by a disabled button with no explanation. */}
      {problems.length > 0 && (
        <Callout variant="warning" title="Not ready to publish">
          <ul className="ml-4 list-disc space-y-hair">
            {problems.slice(0, 6).map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Callout>
      )}

      <div className="grid gap-rhythm lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <SettingsPanel
          draft={draft}
          modules={(modules.data ?? []).map((m) => ({ value: m.id, label: m.title }))}
          onChange={saveSettings}
        />

        <div className="space-y-group">
          {draft.questions.map((question, index) => (
            <QuestionEditor
              key={question.id ?? `new-${index}`}
              question={question}
              index={index}
              total={draft.questions.length}
              onChange={(next) =>
                patchDraft({
                  questions: draft.questions.map((q, i) => (i === index ? next : q)),
                })
              }
              onSave={(next) => void saveQuestion(index, next)}
              onDelete={() => setDeleteTarget(question)}
              onMove={(dir) => void move(index, dir)}
            />
          ))}

          <Card>
            <CardHeader title="Add a question" description="Pick a type to start." />
            <div className="flex flex-wrap gap-tight p-card pt-0">
              {QUESTION_TYPES.map((t) => (
                <Button
                  key={t.value}
                  variant="secondary"
                  size="sm"
                  onClick={() => addQuestion(t.value)}
                >
                  <Plus className="size-3.5" aria-hidden />
                  {t.label}
                </Button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title="Publish this assessment?"
        description={`Sales users will be able to take it immediately. ${draft.questions.length} questions, ${totalPoints} points, ${draft.passingScore}% to pass.`}
        confirmLabel="Publish"
        onConfirm={() => void setStatus('published')}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete this question?"
        description="It is removed from the assessment along with its options. Attempts already submitted keep their recorded score."
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteTarget && void removeQuestion(deleteTarget)}
      />
    </Page>
  )
}

/* -------------------------------------------------------------- settings --- */

function SettingsPanel({
  draft,
  modules,
  onChange,
}: {
  draft: AssessmentDraft
  modules: { value: string; label: string }[]
  onChange: (patch: Partial<AssessmentDraft>) => void
}) {
  // Local mirrors for the text inputs, so each keystroke does not fire a write.
  const [title, setTitle] = useState(draft.title)
  const [description, setDescription] = useState(draft.description)
  const [instructions, setInstructions] = useState(draft.instructions)

  useEffect(() => {
    setTitle(draft.title)
    setDescription(draft.description)
    setInstructions(draft.instructions)
  }, [draft.id, draft.title, draft.description, draft.instructions])

  return (
    <Card className="lg:sticky lg:top-gutter lg:self-start">
      <CardHeader title="Settings" />
      <div className="space-y-group p-card pt-0">
        <Labelled label="Title" htmlFor="a-title">
          <Input
            id="a-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title !== draft.title && onChange({ title })}
          />
        </Labelled>

        <Labelled label="Description" htmlFor="a-desc">
          <Textarea
            id="a-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => description !== draft.description && onChange({ description })}
          />
        </Labelled>

        <Labelled
          label="Instructions"
          htmlFor="a-instructions"
          hint="Shown on the screen before the learner starts."
        >
          <Textarea
            id="a-instructions"
            rows={3}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            onBlur={() => instructions !== draft.instructions && onChange({ instructions })}
          />
        </Labelled>

        <Labelled label="Module" htmlFor="a-module" hint="Which material this tests.">
          <Select
            ariaLabel="Module"
            value={draft.moduleId ?? 'none'}
            onValueChange={(v) => onChange({ moduleId: v === 'none' ? null : v })}
            options={[{ value: 'none', label: 'Not linked' }, ...modules]}
          />
        </Labelled>

        <div className="grid grid-cols-2 gap-tight">
          <Labelled label="Pass mark %" htmlFor="a-pass">
            <Input
              id="a-pass"
              type="number"
              min={0}
              max={100}
              value={draft.passingScore}
              onChange={(e) =>
                onChange({ passingScore: clamp(Number(e.target.value), 0, 100) })
              }
            />
          </Labelled>

          <Labelled label="Attempts" htmlFor="a-attempts" hint="0 = unlimited">
            <Input
              id="a-attempts"
              type="number"
              min={0}
              value={draft.attemptsAllowed}
              onChange={(e) => onChange({ attemptsAllowed: Math.max(0, Number(e.target.value)) })}
            />
          </Labelled>
        </div>

        <Labelled label="Time limit (minutes)" htmlFor="a-time" hint="Blank or 0 = no limit">
          <Input
            id="a-time"
            type="number"
            min={0}
            value={draft.timeLimitMinutes ?? 0}
            onChange={(e) =>
              onChange({ timeLimitMinutes: Number(e.target.value) || null })
            }
          />
        </Labelled>

        <fieldset className="space-y-tight">
          <legend className="text-xs font-bold text-fg-secondary">Behaviour</legend>

          <Toggle
            label="Randomise question order"
            checked={draft.randomizeQuestions}
            onChange={(v) => onChange({ randomizeQuestions: v })}
          />
          <Toggle
            label="Randomise option order"
            checked={draft.randomizeChoices}
            onChange={(v) => onChange({ randomizeChoices: v })}
          />
          <Toggle
            label="Reveal answers after submitting"
            hint="When off, the learner sees only their score - the database withholds the key even from the results screen."
            checked={draft.showCorrectAnswers}
            onChange={(v) => onChange({ showCorrectAnswers: v })}
          />
        </fieldset>
      </div>
    </Card>
  )
}

/* -------------------------------------------------------------- question --- */

function QuestionEditor({
  question,
  index,
  total,
  onChange,
  onSave,
  onDelete,
  onMove,
}: {
  question: DraftQuestion
  index: number
  total: number
  onChange: (next: DraftQuestion) => void
  onSave: (next: DraftQuestion) => void
  onDelete: () => void
  onMove: (direction: -1 | 1) => void
}) {
  const problems = questionProblems(question)
  const unsaved = !question.id
  const isText = question.type === 'short_answer'
  const isMulti = question.type === 'multiple_select'

  const patch = (p: Partial<DraftQuestion>) => onChange({ ...question, ...p })

  /**
   * Changing type has to rebuild the options, not just relabel them: a
   * true/false question needs exactly two fixed options, and a short answer
   * needs none at all. Keeping the old list would leave an unscoreable
   * question behind.
   */
  const changeType = (type: QuestionType) => {
    const fresh = blankQuestion(type, question.sortOrder)
    onChange({
      ...question,
      type,
      choices: fresh.choices,
      correctText: type === 'short_answer' ? (question.correctText ?? '') : undefined,
    })
  }

  const setChoice = (i: number, text: string) =>
    patch({ choices: question.choices.map((c, ci) => (ci === i ? { ...c, text } : c)) })

  const markCorrect = (i: number) =>
    patch({
      choices: question.choices.map((c, ci) => ({
        ...c,
        // Single-answer types must clear the previous pick; multi-select toggles.
        isCorrect: isMulti ? (ci === i ? !c.isCorrect : c.isCorrect) : ci === i,
      })),
    })

  return (
    <Card>
      <div className="flex items-start gap-tight border-b border-line px-card py-tight">
        <GripVertical className="mt-1 size-4 flex-none text-fg-tertiary" aria-hidden />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-tight">
            <span className="text-sm font-bold text-fg">Question {index + 1}</span>
            <Select
              size="sm"
              ariaLabel={`Type of question ${index + 1}`}
              value={question.type}
              onValueChange={(v) => changeType(v as QuestionType)}
              options={QUESTION_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            />
            {unsaved && <Badge tone="warning">Unsaved</Badge>}
            {!unsaved && problems.length === 0 && (
              <Badge tone="success">
                <Check className="size-3" aria-hidden />
                Saved
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-none items-center gap-hair">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Move up"
          >
            <ArrowUp className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="Move down"
          >
            <ArrowDown className="size-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} aria-label="Delete question">
            <Trash2 className="size-3.5 text-danger" />
          </Button>
        </div>
      </div>

      <div className="space-y-group p-card">
        <Labelled label="Prompt" htmlFor={`q-${index}-prompt`}>
          <Textarea
            id={`q-${index}-prompt`}
            rows={2}
            value={question.prompt}
            onChange={(e) => patch({ prompt: e.target.value })}
            placeholder="What should the learner answer?"
          />
        </Labelled>

        {isText ? (
          <Labelled
            label="Expected answer"
            htmlFor={`q-${index}-answer`}
            hint="Compared case-insensitively, with surrounding spaces ignored."
          >
            <Input
              id={`q-${index}-answer`}
              value={question.correctText ?? ''}
              onChange={(e) => patch({ correctText: e.target.value })}
            />
          </Labelled>
        ) : (
          <fieldset className="space-y-tight">
            <legend className="text-xs font-bold text-fg-secondary">
              Options{' '}
              <span className="font-medium text-fg-tertiary">
                {isMulti ? '- tick every correct one' : '- tick the correct one'}
              </span>
            </legend>

            {question.choices.map((choice, ci) => (
              <div key={ci} className="flex items-center gap-tight">
                <button
                  type="button"
                  onClick={() => markCorrect(ci)}
                  aria-label={`Mark option ${ci + 1} correct`}
                  aria-pressed={choice.isCorrect}
                  className={cn(
                    'flex size-6 flex-none items-center justify-center border-2 transition-colors',
                    isMulti ? 'rounded-md' : 'rounded-full',
                    choice.isCorrect
                      ? 'border-success bg-success text-white'
                      : 'border-line-chunk bg-surface hover:border-line-strong',
                  )}
                >
                  {choice.isCorrect && <Check className="size-3.5" />}
                </button>

                <Input
                  value={choice.text}
                  onChange={(e) => setChoice(ci, e.target.value)}
                  placeholder={`Option ${ci + 1}`}
                  aria-label={`Option ${ci + 1}`}
                  // True/False options are fixed - editing them would make the
                  // type a lie.
                  disabled={question.type === 'true_false'}
                />

                {question.type !== 'true_false' && question.choices.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove option ${ci + 1}`}
                    onClick={() =>
                      patch({ choices: question.choices.filter((_, i) => i !== ci) })
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            ))}

            {question.type !== 'true_false' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  patch({ choices: [...question.choices, { text: '', isCorrect: false }] })
                }
              >
                <Plus className="size-3.5" aria-hidden />
                Add option
              </Button>
            )}
          </fieldset>
        )}

        <div className="grid gap-tight sm:grid-cols-[minmax(0,1fr)_6rem]">
          <Labelled
            label="Explanation"
            htmlFor={`q-${index}-why`}
            hint="Shown on the results screen after submitting."
          >
            <Textarea
              id={`q-${index}-why`}
              rows={2}
              value={question.explanation}
              onChange={(e) => patch({ explanation: e.target.value })}
            />
          </Labelled>

          <Labelled label="Points" htmlFor={`q-${index}-points`}>
            <Input
              id={`q-${index}-points`}
              type="number"
              min={1}
              value={question.points}
              onChange={(e) => patch({ points: Math.max(1, Number(e.target.value)) })}
            />
          </Labelled>
        </div>

        {problems.length > 0 && (
          <p className="flex items-start gap-hair text-xs text-warning-fg">
            <AlertCircle className="mt-px size-3.5 flex-none" aria-hidden />
            <span>{problems.join(' ')}</span>
          </p>
        )}

        <div className="flex items-center gap-tight">
          <Button size="sm" onClick={() => onSave(question)} disabled={problems.length > 0}>
            Save question
          </Button>
          {question.id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSave({ ...question, id: undefined })}
            >
              <Copy className="size-3.5" aria-hidden />
              Duplicate
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

/* ---------------------------------------------------------------- pieces --- */

function Labelled({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-tight">
      <label htmlFor={htmlFor} className="block text-xs font-bold text-fg-secondary">
        {label}
      </label>
      {children}
      {hint && <p className="text-2xs text-fg-tertiary">{hint}</p>}
    </div>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-tight text-sm text-fg">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 flex-none accent-[var(--primary)]"
      />
      <span className="min-w-0">
        {label}
        {hint && <span className="mt-hair block text-2xs text-fg-tertiary">{hint}</span>}
      </span>
    </label>
  )
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
