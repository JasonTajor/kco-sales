import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Loader2,
  X,
} from 'lucide-react'
import type {
  AnswerInput,
  Assessment,
  AssessmentAttempt,
  AttemptDraft,
  AttemptReviewRow,
} from '@/types'
import { useAuth } from '@/features/auth/AuthProvider'
import { assessmentService } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/cn'
import { plural } from '@/lib/format'
import { Page, PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button, LinkButton } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Card, CardHeader } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ProgressBar } from '@/components/ui/progress'
import { ErrorState } from '@/components/ui/states'
import { MaterialSkeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { NotFoundPage } from '@/pages/NotFoundPage'

/**
 * Taking an assessment (§17).
 *
 * Four phases: instructions, the paper, submission, review.
 *
 * The runner never knows a correct answer. It records selections against a
 * server-side attempt, asks the database to score it, and then asks separately
 * for the review - which the database only supplies once the attempt is
 * submitted. That means "do not expose correct answers before submission" is a
 * property of the system rather than a rule this component has to remember.
 */
type Phase = 'intro' | 'running' | 'result'

export function AssessmentRunnerPage() {
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const userId = user!.id
  const toast = useToast()

  const { data, loading, error, reload } = useAsync<{
    assessment: Assessment | null
    attempts: AssessmentAttempt[]
  }>(async () => {
    const assessment = await assessmentService.get(slug)
    if (!assessment) return { assessment: null, attempts: [] }
    return { assessment, attempts: await assessmentService.attemptsFor(userId, assessment.id) }
  }, [slug, userId])

  const [phase, setPhase] = useState<Phase>('intro')
  const [draft, setDraft] = useState<AttemptDraft | null>(null)
  /** questionId -> the answer as it will be submitted. */
  const [answers, setAnswers] = useState<Record<string, AnswerInput>>({})
  const [index, setIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null)
  const [review, setReview] = useState<AttemptReviewRow[] | null>(null)
  const [startError, setStartError] = useState<string | null>(null)

  // Guards a double submit: the timer expiring and the button being pressed in
  // the same tick would otherwise both fire, and the second call fails
  // server-side with "already submitted".
  const submittedRef = useRef(false)

  const assessment = data?.assessment ?? null
  const questions = assessment?.questions ?? []
  const attemptsUsed = data?.attempts.length ?? 0
  const attemptsLeft =
    assessment && assessment.attemptsAllowed > 0
      ? Math.max(0, assessment.attemptsAllowed - attemptsUsed)
      : null

  const submit = useCallback(async () => {
    if (!assessment || !draft || submittedRef.current) return
    submittedRef.current = true
    setSubmitting(true)
    setSecondsLeft(null)

    try {
      const result = await assessmentService.submit(
        userId,
        assessment,
        draft,
        Object.values(answers),
      )
      setAttempt(result)
      // Fetched separately, and only now legal to ask for.
      setReview(await assessmentService.review(result.id))
      setPhase('result')
    } catch (err) {
      submittedRef.current = false
      toast.error(err instanceof Error ? err.message : 'Could not submit the assessment.')
    } finally {
      setSubmitting(false)
    }
  }, [assessment, draft, answers, userId, toast])

  /* The time limit. Ticks only while the paper is open. */
  useEffect(() => {
    if (phase !== 'running' || secondsLeft === null) return
    if (secondsLeft <= 0) {
      void submit()
      return
    }
    const t = window.setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000)
    return () => window.clearTimeout(t)
  }, [phase, secondsLeft, submit])

  const start = async () => {
    if (!assessment) return
    setStartError(null)
    setStarting(true)
    try {
      const opened = await assessmentService.startAttempt(userId, assessment.id)
      setDraft(opened)
      setAnswers({})
      setIndex(0)
      submittedRef.current = false
      setSecondsLeft(assessment.timeLimitMinutes ? assessment.timeLimitMinutes * 60 : null)
      setPhase('running')
    } catch (err) {
      setStartError(err instanceof Error ? err.message : 'Could not start the assessment.')
    } finally {
      setStarting(false)
    }
  }

  /**
   * Records one answer, locally and on the server.
   *
   * Saved per question rather than all at once, so a closed tab or a dropped
   * connection does not lose the paper - reopening returns the same attempt
   * with the answers already on it.
   */
  const answer = (input: AnswerInput) => {
    setAnswers((prev) => ({ ...prev, [input.questionId]: input }))
    if (draft) {
      void assessmentService.saveAnswer(draft.id, input).catch(() => {
        toast.error('That answer was not saved. Check your connection.')
      })
    }
  }

  const answeredCount = Object.values(answers).filter(
    (a) => a.choiceIds.length > 0 || (a.text ?? '').trim().length > 0,
  ).length

  if (loading) return <MaterialSkeleton />
  if (error) return <ErrorState description={error.message} onRetry={reload} />
  if (!assessment) return <NotFoundPage />

  const crumbs = [
    { label: 'Training', to: '/training/assessments' },
    { label: 'Assessments', to: '/training/assessments' },
    { label: assessment.title },
  ]

  /* ------------------------------------------------------------- intro ---- */

  if (phase === 'intro') {
    const best = data!.attempts.reduce<AssessmentAttempt | null>(
      (b, a) => (b === null || a.score > b.score ? a : b),
      null,
    )

    return (
      <Page>
        <PageHeader
          title={assessment.title}
          description={assessment.description}
          crumbs={crumbs}
          meta={
            <>
              <Badge tone="neutral">{plural(questions.length, 'question')}</Badge>
              <Badge tone="neutral">Pass mark {assessment.passingScore}%</Badge>
              {assessment.timeLimitMinutes && (
                <Badge tone="neutral">
                  <Clock className="size-3" aria-hidden />
                  {assessment.timeLimitMinutes} min
                </Badge>
              )}
              <Badge tone="neutral">
                {assessment.attemptsAllowed === 0
                  ? 'Unlimited attempts'
                  : `${attemptsUsed} of ${assessment.attemptsAllowed} attempts used`}
              </Badge>
            </>
          }
        />

        <div className="grid gap-rhythm lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader title="Before you start" />
            <div className="space-y-group p-card pt-0">
              <ul className="space-y-tight text-sm text-fg-secondary">
                <li>
                  There {questions.length === 1 ? 'is' : 'are'} {plural(questions.length, 'question')}.
                  You can move backwards and change an answer before submitting.
                </li>
                <li>
                  You need {assessment.passingScore}% to pass. Answers are scored when you submit.
                </li>
                {assessment.timeLimitMinutes ? (
                  <li>
                    You have {assessment.timeLimitMinutes} minutes. The assessment submits itself
                    when the time runs out.
                  </li>
                ) : (
                  <li>There is no time limit.</li>
                )}
                <li>
                  Correct answers and explanations are shown after you submit, not before.
                </li>
              </ul>

              {startError && (
                <Callout variant="danger" title="Cannot start">
                  {startError}
                </Callout>
              )}

              {attemptsLeft === 0 ? (
                <Callout variant="warning" title="No attempts left">
                  You have used all {assessment.attemptsAllowed} attempts. Ask your trainer if you
                  need another.
                </Callout>
              ) : (
                <div className="flex flex-wrap items-center gap-tight">
                  <Button onClick={start} disabled={starting || questions.length === 0}>
                    {starting ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <>
                        Start assessment
                        <ArrowRight className="size-4" aria-hidden />
                      </>
                    )}
                  </Button>
                  <LinkButton to="/training/assessments" variant="ghost">
                    Back
                  </LinkButton>
                </div>
              )}

              {questions.length === 0 && (
                <Callout variant="warning" title="Not ready yet">
                  This assessment has no questions. A trainer needs to add them before it can be
                  taken.
                </Callout>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Your attempts" />
            {data!.attempts.length === 0 ? (
              <p className="p-card pt-0 text-sm text-fg-secondary">
                You have not taken this assessment yet.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {data!.attempts.map((a) => (
                  <li key={a.id} className="flex items-center gap-group px-card py-row-y">
                    <span className="flex-1 text-sm text-fg">Attempt {a.attemptNumber}</span>
                    <span className="text-sm font-semibold tabular-nums text-fg">{a.score}%</span>
                    <Badge tone={a.passed ? 'success' : 'danger'}>
                      {a.passed ? 'Passed' : 'Failed'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            {best && (
              <p className="border-t border-line px-card py-tight text-xs text-fg-tertiary">
                Best score {best.score}%
              </p>
            )}
          </Card>
        </div>
      </Page>
    )
  }

  /* ----------------------------------------------------------- running ---- */

  if (phase === 'running') {
    const question = questions[index]
    if (!question) return <NotFoundPage />

    const current = answers[question.id]
    const isMulti = question.type === 'multiple_select'
    const isText = question.type === 'short_answer'

    const toggleChoice = (choiceId: string) => {
      if (isMulti) {
        const selected = new Set(current?.choiceIds ?? [])
        if (selected.has(choiceId)) selected.delete(choiceId)
        else selected.add(choiceId)
        answer({ questionId: question.id, choiceIds: [...selected] })
      } else {
        answer({ questionId: question.id, choiceIds: [choiceId] })
      }
    }

    return (
      <Page>
        <div className="mx-auto w-full max-w-[46rem] space-y-rhythm">
          {/* A fixed header row: where you are, how much is left, the clock. */}
          <div className="flex flex-wrap items-center justify-between gap-group">
            <div className="space-y-hair">
              <p className="text-2xs font-medium uppercase tracking-wider text-fg-tertiary">
                {assessment.title}
              </p>
              <p className="text-sm text-fg-secondary">
                Question {index + 1} of {questions.length} · {answeredCount} answered
              </p>
            </div>
            {secondsLeft !== null && (
              <Badge tone={secondsLeft < 60 ? 'danger' : 'neutral'}>
                <Clock className="size-3" aria-hidden />
                <span className="tabular-nums">{formatClock(secondsLeft)}</span>
              </Badge>
            )}
          </div>

          <ProgressBar
            value={Math.round(((index + 1) / questions.length) * 100)}
            label="Assessment progress"
          />

          <Card>
            <div className="space-y-group p-card">
              <div className="flex items-baseline justify-between gap-group">
                <h2 className="text-lg font-semibold leading-snug text-fg">{question.prompt}</h2>
                <span className="shrink-0 text-xs text-fg-tertiary">
                  {plural(question.points, 'point')}
                </span>
              </div>

              {isMulti && (
                <p className="text-xs text-fg-tertiary">Select every answer that applies.</p>
              )}

              {isText ? (
                <Input
                  value={current?.text ?? ''}
                  onChange={(e) =>
                    answer({ questionId: question.id, choiceIds: [], text: e.target.value })
                  }
                  placeholder="Type your answer"
                  aria-label="Your answer"
                />
              ) : (
                <ul className="space-y-tight">
                  {question.options.map((option, oi) => {
                    // Choice ids exist on the Supabase backend; offline the
                    // position is the identity.
                    const choiceId = question.choiceIds?.[oi] ?? String(oi)
                    const selected = (current?.choiceIds ?? []).includes(choiceId)

                    return (
                      <li key={choiceId}>
                        <button
                          type="button"
                          onClick={() => toggleChoice(choiceId)}
                          aria-pressed={selected}
                          className={cn(
                            'flex w-full items-start gap-tight rounded-md border px-tight py-tight text-left text-sm transition-colors',
                            selected
                              ? 'border-primary bg-primary-subtle text-fg'
                              : 'border-line bg-surface text-fg hover:bg-surface-hover',
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              'mt-px flex size-4 flex-none items-center justify-center border',
                              isMulti ? 'rounded-xs' : 'rounded-full',
                              selected ? 'border-primary bg-primary text-white' : 'border-line-strong',
                            )}
                          >
                            {selected && <Check className="size-3" />}
                          </span>
                          <span className="min-w-0">{option}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </Card>

          <div className="flex items-center justify-between gap-group">
            <Button
              variant="secondary"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
            >
              <ArrowLeft className="size-4" aria-hidden />
              Previous
            </Button>

            {index < questions.length - 1 ? (
              <Button onClick={() => setIndex((i) => i + 1)}>
                Next
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            ) : (
              <Button onClick={() => setConfirmOpen(true)} disabled={submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : 'Submit'}
              </Button>
            )}
          </div>

          {/* Every question is reachable, so a skipped one is not a dead end. */}
          <nav aria-label="Questions" className="flex flex-wrap gap-hair">
            {questions.map((q, i) => {
              const done =
                (answers[q.id]?.choiceIds.length ?? 0) > 0 ||
                (answers[q.id]?.text ?? '').trim().length > 0
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Question ${i + 1}${done ? ', answered' : ', not answered'}`}
                  aria-current={i === index || undefined}
                  className={cn(
                    'size-7 rounded border text-2xs font-medium tabular-nums transition-colors',
                    i === index
                      ? 'border-fg bg-fg text-fg-inverted'
                      : done
                        ? 'border-primary bg-primary-subtle text-primary-subtle-fg'
                        : 'border-line bg-surface text-fg-tertiary hover:bg-surface-hover',
                  )}
                >
                  {i + 1}
                </button>
              )
            })}
          </nav>
        </div>

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Submit this assessment?"
          description={
            answeredCount < questions.length
              ? `You have answered ${answeredCount} of ${questions.length} questions. Unanswered questions score zero.`
              : 'Your answers will be scored and recorded. You cannot change them afterwards.'
          }
          confirmLabel="Submit"
          onConfirm={() => {
            setConfirmOpen(false)
            void submit()
          }}
        />
      </Page>
    )
  }

  /* ------------------------------------------------------------ result ---- */

  if (!attempt) return <MaterialSkeleton />

  return (
    <Page>
      <PageHeader
        title="Your result"
        description={assessment.title}
        crumbs={crumbs}
        actions={
          <>
            {attemptsLeft !== 0 && (
              <Button variant="secondary" onClick={start} disabled={starting}>
                Try again
              </Button>
            )}
            <LinkButton to="/training/assessments">Done</LinkButton>
          </>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-rhythm p-card">
          <div>
            <p className="text-2xs font-medium uppercase tracking-wider text-fg-tertiary">Score</p>
            <p
              className={cn(
                'text-4xl font-semibold tabular-nums',
                attempt.passed ? 'text-success-fg' : 'text-danger-fg',
              )}
            >
              {attempt.score}%
            </p>
            {attempt.points && (
              <p className="text-xs text-fg-tertiary">
                {attempt.points.earned} of {attempt.points.total} points
              </p>
            )}
          </div>

          <div className="space-y-hair">
            <Badge tone={attempt.passed ? 'success' : 'danger'}>
              {attempt.passed ? (
                <Check className="size-3" aria-hidden />
              ) : (
                <X className="size-3" aria-hidden />
              )}
              {attempt.passed ? 'Passed' : 'Did not pass'}
            </Badge>
            <p className="text-sm text-fg-secondary">
              Pass mark {assessment.passingScore}% · attempt {attempt.attemptNumber}
            </p>
          </div>
        </div>

        {!attempt.passed && (
          <div className="border-t border-line p-card">
            <Callout variant="info" title="What next">
              Read through the answers below, then revisit the module before trying again.
              {attemptsLeft !== null && attemptsLeft > 0 && ` You have ${plural(attemptsLeft, 'attempt')} left.`}
            </Callout>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Review"
          description="Your answer, the correct answer, and why."
        />
        {review === null ? (
          <div className="p-card">
            <Loader2 className="size-4 animate-spin text-fg-tertiary" aria-label="Loading review" />
          </div>
        ) : review.length === 0 ? (
          <p className="p-card pt-0 text-sm text-fg-secondary">
            This assessment does not reveal its answers.
          </p>
        ) : (
          <ol className="divide-y divide-line">
            {review.map((row, i) => (
              <ReviewRow key={row.questionId} row={row} index={i + 1} />
            ))}
          </ol>
        )}
      </Card>
    </Page>
  )
}

function ReviewRow({ row, index }: { row: AttemptReviewRow; index: number }) {
  // correctChoiceIds is empty when the assessment withholds the key, so the
  // row degrades to "your answer and whether it was right".
  const keyHidden = row.correctChoiceIds.length === 0 && !row.correctText

  return (
    <li className="space-y-tight p-card">
      <div className="flex items-start gap-tight">
        <span
          aria-hidden
          className={cn(
            'mt-px flex size-5 flex-none items-center justify-center rounded-full',
            row.isCorrect ? 'bg-success text-white' : 'bg-danger text-white',
          )}
        >
          {row.isCorrect ? <Check className="size-3" /> : <X className="size-3" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg">
            <span className="text-fg-tertiary">{index}. </span>
            {row.prompt}
          </p>
          <p className="mt-hair text-xs text-fg-tertiary">
            {row.pointsAwarded} of {row.points} {row.points === 1 ? 'point' : 'points'}
          </p>
        </div>
      </div>

      {row.type === 'short_answer' ? (
        <dl className="field-grid pl-7">
          <dt className="text-xs text-fg-tertiary">Your answer</dt>
          <dd className="text-sm text-fg">{row.textAnswer || <em>Not answered</em>}</dd>
          {row.correctText && (
            <>
              <dt className="text-xs text-fg-tertiary">Expected</dt>
              <dd className="text-sm text-fg">{row.correctText}</dd>
            </>
          )}
        </dl>
      ) : (
        <ul className="space-y-hair pl-7">
          {row.options.map((option) => {
            const picked = row.selectedChoiceIds.includes(option.id)
            const correct = row.correctChoiceIds.includes(option.id)

            return (
              <li
                key={option.id}
                className={cn(
                  'flex items-start gap-tight rounded border px-tight py-hair text-sm',
                  correct
                    ? 'border-success/40 bg-success-subtle text-success-fg'
                    : picked
                      ? 'border-danger/40 bg-danger-subtle text-danger-fg'
                      : 'border-transparent text-fg-tertiary',
                )}
              >
                <span className="mt-px flex size-4 flex-none items-center justify-center">
                  {correct ? (
                    <Check className="size-3.5" aria-label="Correct answer" />
                  ) : picked ? (
                    <X className="size-3.5" aria-label="Your answer" />
                  ) : null}
                </span>
                <span className="min-w-0">{option.text}</span>
                {picked && (
                  <span className="ml-auto shrink-0 text-2xs uppercase tracking-wide">You</span>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {row.explanation && (
        <p className="pl-7 text-sm text-fg-secondary">
          <span className="font-medium text-fg">Why: </span>
          {row.explanation}
        </p>
      )}

      {keyHidden && (
        <p className="flex items-center gap-hair pl-7 text-xs text-fg-tertiary">
          <AlertCircle className="size-3.5" aria-hidden />
          This assessment is configured not to reveal correct answers.
        </p>
      )}
    </li>
  )
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
