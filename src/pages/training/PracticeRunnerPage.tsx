import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react'
import type { PracticeScenario, PracticeTurn } from '@/types'
import { trainingService } from '@/services'
import { personalityMeta } from '@/data/scenarios'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/cn'
import { plural } from '@/lib/format'
import { Emoji } from '@/components/common/Emoji'
import { EmojiTile } from '@/components/common/EmojiTile'
import { Page, PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button, LinkButton } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { ProgressBar } from '@/components/ui/progress'
import { DifficultyBadge } from '@/components/ui/status'
import { ErrorState } from '@/components/ui/states'
import { MaterialSkeleton } from '@/components/ui/skeleton'
import { NotFoundPage } from '@/pages/NotFoundPage'

type Verdict = PracticeTurn['choices'][number]['verdict']

const verdictMeta: Record<Verdict, { label: string; tone: 'success' | 'warning' | 'danger'; score: number }> = {
  best: { label: 'Best response', tone: 'success', score: 2 },
  ok: { label: 'Workable', tone: 'warning', score: 1 },
  poor: { label: 'Costly', tone: 'danger', score: 0 },
}

/**
 * Choices are authored best-first, so presenting them in source order would give
 * the answer away. Shuffle deterministically from the turn id: stable across
 * re-renders, different per turn.
 */
function shuffleOrder(turn: PracticeTurn): number[] {
  const seed = [...turn.id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return turn.choices
    .map((_, i) => ({ i, key: (seed * (i + 7)) % 101 }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.i)
}

export function PracticeRunnerPage() {
  const { slug = '' } = useParams()

  const { data, loading, error, reload } = useAsync<PracticeScenario | null>(
    () => trainingService.scenario(slug),
    [slug],
  )

  const [picks, setPicks] = useState<Record<string, number>>({})
  const [turnIndex, setTurnIndex] = useState(0)
  const [finished, setFinished] = useState(false)

  const scenario = data ?? null
  const orders = useMemo(
    () => new Map((scenario?.turns ?? []).map((t) => [t.id, shuffleOrder(t)])),
    [scenario],
  )

  if (loading && !data) {
    return (
      <Page>
        <MaterialSkeleton />
      </Page>
    )
  }
  if (error) {
    return (
      <Page>
        <ErrorState onRetry={reload} />
      </Page>
    )
  }
  if (!scenario) return <NotFoundPage />

  const meta = personalityMeta[scenario.personality]
  const crumbs = [
    { label: 'Training' },
    { label: 'Practice Scenarios', to: '/training/practice' },
    { label: scenario.title },
  ]

  const restart = () => {
    setPicks({})
    setTurnIndex(0)
    setFinished(false)
  }

  const earned = scenario.turns.reduce((sum, t) => {
    const pick = picks[t.id]
    if (pick === undefined) return sum
    return sum + verdictMeta[t.choices[pick]!.verdict].score
  }, 0)
  const possible = scenario.turns.length * 2

  /* ------------------------------------------------------------ summary --- */
  if (finished) {
    const rate = Math.round((earned / possible) * 100)
    return (
      <Page className="max-w-[760px]">
        <PageHeader crumbs={crumbs} title="Scenario debrief" description={scenario.title} />

        <div className="chunk p-card">
          <div className="flex items-center justify-between gap-snug">
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wider text-fg-tertiary">Handling score</p>
              <p className="mt-hair text-3xl font-semibold tracking-tight text-fg tnum">{rate}%</p>
            </div>
            <Badge tone={rate >= 80 ? 'success' : rate >= 50 ? 'warning' : 'danger'}>
              {rate >= 80 ? 'Strong' : rate >= 50 ? 'Passable' : 'Needs work'}
            </Badge>
          </div>
          <ProgressBar
            value={rate}
            className="mt-snug"
            tone={rate >= 80 ? 'success' : rate >= 50 ? 'warning' : 'danger'}
            label="Handling score"
          />
          <p className="mt-tight text-sm text-fg-secondary">
            {earned} of {possible} points across {plural(scenario.turns.length, 'turn')}.
          </p>
        </div>

        <section className="space-y-group">
          <h2 className="text-lg font-semibold tracking-tight text-fg">Turn by turn</h2>
          {scenario.turns.map((turn, i) => {
            const pick = picks[turn.id]
            const choice = pick === undefined ? null : turn.choices[pick]!
            const best = turn.choices[0]!
            return (
              <div key={turn.id} className="chunk p-card">
                <p className="text-2xs font-semibold uppercase tracking-wider text-fg-tertiary tnum">Turn {i + 1}</p>
                <p className="mt-hair text-base italic text-fg-secondary">“{turn.customer}”</p>

                {choice ? (
                  <div className="mt-snug space-y-snug">
                    <div className="flex items-start gap-tight">
                      <Badge tone={verdictMeta[choice.verdict].tone}>{verdictMeta[choice.verdict].label}</Badge>
                      <p className="min-w-0 text-base text-fg">“{choice.text}”</p>
                    </div>
                    <p className="text-sm leading-[1.55] text-fg-secondary">{choice.feedback}</p>
                    {choice.verdict !== 'best' && (
                      <p className="rounded-md bg-bg-inset px-snug py-tight text-sm text-fg-secondary">
                        <span className="font-medium text-fg">Model answer: </span>“{best.text}”
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-snug text-sm text-fg-tertiary">Skipped.</p>
                )}
              </div>
            )
          })}
        </section>

        <section className="space-y-group">
          <h2 className="text-lg font-semibold tracking-tight text-fg">Coaching notes</h2>
          <ul className="space-y-tight">
            {scenario.coaching.map((c, i) => (
              <li key={i} className="flex gap-tight text-md leading-[1.6] text-fg-secondary">
                <Emoji name="idea" size={16} className="mt-hair" />
                {c}
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-wrap gap-tight">
          <Button variant="primary" size="sm" icon={<RotateCcw className="size-3.5" />} onClick={restart}>
            Run it again
          </Button>
          <LinkButton to="/training/practice" variant="secondary" size="sm" icon={<ArrowLeft className="size-3.5" />}>
            All scenarios
          </LinkButton>
        </div>
      </Page>
    )
  }

  /* ------------------------------------------------------------ running --- */
  const turn = scenario.turns[turnIndex]!
  const order = orders.get(turn.id) ?? turn.choices.map((_, i) => i)
  const pick = picks[turn.id]
  const answered = pick !== undefined
  const isLast = turnIndex === scenario.turns.length - 1

  return (
    <Page className="max-w-[720px]">
      <PageHeader
        crumbs={crumbs}
        title={scenario.title}
        meta={
          <>
            <Badge tone="neutral">
              <Emoji name={meta.emoji} size={14} play="loop" />
              {meta.label}
            </Badge>
            <DifficultyBadge level={scenario.difficulty} />
            <span className="text-2xs text-fg-tertiary tnum">
              Turn {turnIndex + 1} of {scenario.turns.length}
            </span>
          </>
        }
      />

      <Callout variant="info" title="Setup">
        {scenario.setup}
      </Callout>

      <p className="flex items-start gap-tight text-sm text-fg-secondary">
        <Emoji name="goal" size={16} className="mt-hair" />
        <span>
          <span className="font-medium text-fg">Your goal: </span>
          {scenario.goal}
        </span>
      </p>

      <ProgressBar
        value={((turnIndex + (answered ? 1 : 0)) / scenario.turns.length) * 100}
        label="Scenario progress"
      />

      <div className="chunk p-card">
        <div className="flex items-start gap-snug">
          <EmojiTile name={meta.emoji} tone="neutral" size="md" play="loop" className="rounded-full" />
          <div className="min-w-0">
            <p className="text-2xs font-semibold uppercase tracking-wider text-fg-tertiary">Customer</p>
            <p className="mt-hair text-md leading-[1.6] text-fg">“{turn.customer}”</p>
          </div>
        </div>

        <p className="mb-tight mt-group text-2xs font-semibold uppercase tracking-wider text-fg-tertiary">
          {answered ? 'Your reply' : 'How do you reply?'}
        </p>

        <div className="space-y-group">
          {order.map((choiceIndex) => {
            const choice = turn.choices[choiceIndex]!
            const picked = pick === choiceIndex
            const v = verdictMeta[choice.verdict]

            return (
              <div key={choiceIndex}>
                <button
                  type="button"
                  disabled={answered}
                  onClick={() => setPicks((p) => ({ ...p, [turn.id]: choiceIndex }))}
                  className={cn(
                    'flex w-full items-start gap-snug rounded-md border px-card py-snug text-left text-base transition-colors',
                    !answered && 'border-line bg-surface text-fg-secondary hover:border-line-strong hover:bg-surface-hover',
                    answered && picked && v.tone === 'success' && 'border-success bg-success-subtle text-success-fg',
                    answered && picked && v.tone === 'warning' && 'border-warning bg-warning-subtle text-warning-fg',
                    answered && picked && v.tone === 'danger' && 'border-danger bg-danger-subtle text-danger-fg',
                    answered && !picked && 'border-line text-fg-tertiary',
                  )}
                >
                  <span>“{choice.text}”</span>
                  {answered && picked && <Badge tone={v.tone}>{v.label}</Badge>}
                </button>

                {answered && picked && (
                  <p className="mt-tight px-snug text-sm leading-[1.55] text-fg-secondary">{choice.feedback}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-tight">
        <Button
          variant="ghost"
          size="sm"
          disabled={turnIndex === 0}
          onClick={() => setTurnIndex((i) => i - 1)}
          icon={<ArrowLeft className="size-3.5" />}
        >
          Previous turn
        </Button>

        <Button
          variant="primary"
          size="sm"
          disabled={!answered}
          onClick={() => (isLast ? setFinished(true) : setTurnIndex((i) => i + 1))}
          trailing={<ArrowRight className="size-3.5" />}
        >
          {isLast ? 'See debrief' : 'Next turn'}
        </Button>
      </div>
    </Page>
  )
}
