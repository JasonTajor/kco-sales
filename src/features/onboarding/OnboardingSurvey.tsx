import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { duration, easeOut } from '@/lib/motion'
import { Button, LinkButton } from '@/components/ui/button'
import { Emoji } from '@/components/common/Emoji'
import { EmojiTile } from '@/components/common/EmojiTile'
import { Logo } from '@/components/common/Logo'
import { Mascot } from '@/components/gamification/Mascot'
import {
  DEFAULT_ANSWERS,
  QUESTIONS,
  SETUP_XP,
  STEP_COUNT,
  planFrom,
  resourceFor,
  type Choice,
  type OnboardingAnswers,
} from './model'

/**
 * First-run setup for a sales agent.
 *
 * Four questions, one per screen, then the plan those answers produced. The
 * plan screen is the point of the whole flow: it is where the learner sees
 * that answering changed something, so it shows the goal they picked, the
 * module we will open, and the XP waiting in it.
 *
 * Setup can be skipped from any step. Skipping applies DEFAULT_ANSWERS rather
 * than leaving the app unconfigured.
 */
export function OnboardingSurvey({
  name,
  onComplete,
  onSkipSetup,
  onStartTour,
  onDeclineTour,
}: {
  name: string
  /** Answers are saved as soon as the last question is answered. */
  onComplete: (answers: OnboardingAnswers) => void
  /** Abandon the questions; sensible defaults are applied instead. */
  onSkipSetup: () => void
  /** Take the walkthrough now. */
  onStartTour: () => void
  /** Decline the walkthrough for good and go straight to the first module. */
  onDeclineTour: () => void
}) {
  // -1 is the welcome screen, STEP_COUNT is the finished plan.
  const [step, setStep] = useState(-1)
  const [draft, setDraft] = useState<Partial<OnboardingAnswers>>({})
  const reduce = useReducedMotion()
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Each screen is a new context for a screen reader and for the eye, so move
  // focus to the heading rather than leaving it on the button that was pressed.
  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  const answers = useMemo<OnboardingAnswers>(() => ({ ...DEFAULT_ANSWERS, ...draft }), [draft])

  const question = step >= 0 && step < STEP_COUNT ? QUESTIONS[step] : null
  const chosen = question ? draft[question.key] : undefined

  const back = useCallback(() => setStep((s) => s - 1), [])

  const next = useCallback(() => {
    setStep((s) => {
      const to = s + 1
      if (to === STEP_COUNT) onComplete({ ...DEFAULT_ANSWERS, ...draft })
      return to
    })
  }, [draft, onComplete])

  return (
    <div className="min-h-[100dvh] bg-bg">
      {/* A quiet green wash at the top, the same ramp the learner dashboard
          uses, so setup already looks like the place they are heading. */}
      <div aria-hidden className="kco-gradient-fade h-[168px] w-full sm:h-[200px]" />

      <div className="mx-auto -mt-[136px] w-full max-w-[600px] px-gutter pb-16 sm:-mt-[152px] sm:px-gutter-sm">
        <div className="flex items-center justify-between gap-group pb-group">
          <Logo />
          {step < STEP_COUNT && (
            <button
              type="button"
              onClick={onSkipSetup}
              className="touch-target relative rounded-md text-sm font-medium text-kco-ink/70 underline-offset-4 hover:text-kco-ink hover:underline"
            >
              Skip setup
            </button>
          )}
        </div>

        <div className="chunk p-card sm:p-8">
          {step >= 0 && step < STEP_COUNT && (
            <Progress step={step} />
          )}

          <motion.div
            key={step}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: duration.base, ease: easeOut }}
          >
            {step === -1 && (
              <Welcome name={name} headingRef={headingRef} onStart={() => setStep(0)} />
            )}

            {question && (
              <fieldset className="border-0 p-0">
                <legend className="sr-only">{question.title}</legend>
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className="text-2xl font-extrabold tracking-[-0.02em] text-fg focus-visible:outline-none sm:text-3xl"
                >
                  {question.title}
                </h1>
                <p className="mt-tight text-base text-fg-secondary">{question.description}</p>

                <ChoiceGroup
                  label={question.title}
                  choices={question.choices as readonly Choice<unknown>[]}
                  value={chosen}
                  onChange={(v) => setDraft((d) => ({ ...d, [question.key]: v }))}
                  onConfirm={next}
                />
              </fieldset>
            )}

            {step === STEP_COUNT && (
              <Plan
                answers={answers}
                headingRef={headingRef}
                onStartTour={onStartTour}
                onDeclineTour={onDeclineTour}
              />
            )}
          </motion.div>

          {question && (
            <div className="mt-8 flex items-center justify-between gap-snug border-t border-line pt-group">
              <Button variant="ghost" size="md" onClick={back} icon={<ArrowLeft className="size-4" />}>
                Back
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={next}
                disabled={chosen === undefined}
                trailing={<ArrowRight className="size-4" />}
              >
                {step === STEP_COUNT - 1 ? 'See my plan' : 'Continue'}
              </Button>
            </div>
          )}
        </div>

        {question && (
          <p className="mt-group text-center text-sm text-fg-tertiary">
            Nothing here is a test. You can change all of it later in Settings.
          </p>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- progress --- */

function Progress({ step }: { step: number }) {
  // Counts the step you are on, not the ones behind you: 0% while actively
  // answering question one reads as broken rather than as honest.
  const percent = Math.round(((step + 1) / STEP_COUNT) * 100)
  return (
    <div className="mb-8">
      <div className="flex items-baseline justify-between gap-snug">
        <p className="text-2xs font-semibold uppercase tracking-wider text-fg-tertiary tnum">
          Step {step + 1} of {STEP_COUNT}
        </p>
        <p className="text-2xs font-semibold text-primary tnum">{percent}%</p>
      </div>
      <div
        className="meter mt-tight w-full"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Setup progress"
      >
        <motion.div
          className="meter-fill bg-cta"
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- welcome --- */

function Welcome({
  name,
  headingRef,
  onStart,
}: {
  name: string
  headingRef: React.RefObject<HTMLHeadingElement | null>
  onStart: () => void
}) {
  return (
    <div className="text-center">
      <div className="flex justify-center">
        <Mascot pose="wave" size="lg" float bloom />
      </div>

      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-group flex flex-wrap items-center justify-center gap-tight text-2xl font-extrabold tracking-[-0.02em] text-fg focus-visible:outline-none sm:text-3xl"
      >
        Welcome, {name.split(' ')[0]}
        <Emoji name="party" size={30} play="once" />
      </h1>

      <p className="mx-auto mt-snug max-w-[42ch] text-base text-fg-secondary">
        Four quick questions and we will build your training plan. It takes about a minute, and it
        decides what this app opens for you every day.
      </p>

      <div className="mt-8">
        <Button
          variant="primary"
          size="md"
          className="h-12 w-full px-6 text-md sm:w-auto"
          onClick={onStart}
          trailing={<ArrowRight className="size-4" />}
        >
          Let's set you up
        </Button>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- choices --- */

/**
 * A radiogroup of chunky tiles. Buttons rather than inputs, to match the
 * assessment runner, with the roving tabindex and arrow keys that pattern owes
 * the keyboard: one tab stop for the group, arrows to move inside it.
 */
function ChoiceGroup({
  label,
  choices,
  value,
  onChange,
  onConfirm,
}: {
  label: string
  choices: readonly Choice<unknown>[]
  value: unknown
  onChange: (value: unknown) => void
  onConfirm: () => void
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const selected = choices.findIndex((c) => c.value === value)
  // With nothing chosen the first tile takes the tab stop, so the group is
  // always reachable in one press.
  const focusIndex = selected < 0 ? 0 : selected

  const move = (from: number, delta: number) => {
    const to = (from + delta + choices.length) % choices.length
    onChange(choices[to]!.value)
    refs.current[to]?.focus()
  }

  return (
    <div role="radiogroup" aria-label={label} className="mt-8 space-y-snug">
      {choices.map((choice, i) => {
        const isSelected = choice.value === value
        return (
          <button
            key={String(choice.value)}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={i === focusIndex ? 0 : -1}
            onClick={() => onChange(choice.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault()
                move(i, 1)
              } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault()
                move(i, -1)
              } else if (e.key === 'Enter' && isSelected) {
                e.preventDefault()
                onConfirm()
              }
            }}
            data-emoji-group
            className={cn(
              'flex w-full items-center gap-snug chunk p-card text-left chunk-press',
              'focus-visible:outline-offset-2',
              isSelected
                ? '[--chunk-edge:var(--cta-lip)] [--chunk-face:var(--primary-subtle)]'
                : 'hover:bg-surface-hover',
            )}
          >
            <EmojiTile name={choice.emoji} tone={choice.tone} size="md" play={isSelected ? 'loop' : 'hover'} />

            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  'block text-base font-bold',
                  isSelected ? 'text-primary-subtle-fg' : 'text-fg',
                )}
              >
                {choice.label}
              </span>
              <span className="mt-hair block text-sm text-fg-secondary">{choice.hint}</span>
            </span>

            {/* The selected mark is a shape, not only a colour change. */}
            <span
              aria-hidden
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                isSelected
                  ? 'border-cta-lip bg-cta text-cta-fg'
                  : 'border-line-chunk bg-surface text-transparent',
              )}
            >
              <Check className="size-3.5" strokeWidth={3} />
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ plan --- */

/** The payoff screen: what the four answers actually produced. */
function Plan({
  answers,
  headingRef,
  onStartTour,
  onDeclineTour,
}: {
  answers: OnboardingAnswers
  headingRef: React.RefObject<HTMLHeadingElement | null>
  onStartTour: () => void
  onDeclineTour: () => void
}) {
  const plan = planFrom(answers)
  const resource = resourceFor(answers.channel)
  const reduce = useReducedMotion()

  return (
    <div>
      <div className="text-center">
        <div className="flex justify-center">
          <Mascot pose="cheer" size="md" bloom />
        </div>

        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mt-group flex flex-wrap items-center justify-center gap-tight text-2xl font-extrabold tracking-[-0.02em] text-fg focus-visible:outline-none sm:text-3xl"
        >
          Your plan is ready
          <Emoji name="rocket" size={28} play="once" />
        </h1>

        <p className="mx-auto mt-snug max-w-[40ch] text-base text-fg-secondary">
          Here is what changed. All of it is adjustable later.
        </p>

        {/* The XP award. Earned for finishing setup, so it reads as a first
            win rather than a participation prize. */}
        <motion.div
          initial={reduce ? false : { scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4, ease: easeOut }}
          className="mt-group inline-flex items-center gap-tight rounded-full border-2 border-xp/35 bg-xp-subtle px-snug py-hair text-base font-bold text-xp tnum"
        >
          <Emoji name="xp" size={16} play="once" />+{SETUP_XP} XP
          <span className="font-medium opacity-70">for setting up</span>
        </motion.div>
      </div>

      <dl className="mt-8 space-y-snug">
        <PlanRow
          emoji="goal"
          tone="primary"
          term="Your daily goal"
          detail={`${answers.dailyMinutes} minutes a day`}
        />
        <PlanRow
          emoji="books"
          tone="lightblue"
          term="We will open this first"
          detail={plan.startLabel}
        />
        <PlanRow emoji="flag" tone="ube" term="Your learning path" detail={plan.pathLabel} />
        <PlanRow
          emoji="bolt"
          tone="cheese"
          term="Pinned for your shift"
          detail={`${resource.label}, one tap from anywhere`}
        />
      </dl>

      <div className="mt-8 space-y-snug border-t border-line pt-group">
        <Button
          variant="primary"
          size="md"
          className="h-12 w-full px-6 text-md"
          onClick={onStartTour}
          trailing={<ArrowRight className="size-4" />}
        >
          Show me around (60 seconds)
        </Button>
        <LinkButton
          to={`/learning/materials/${plan.startSlug}`}
          variant="ghost"
          size="md"
          className="w-full"
          onClick={onDeclineTour}
        >
          Skip the tour, start learning
        </LinkButton>
      </div>
    </div>
  )
}

function PlanRow({
  emoji,
  tone,
  term,
  detail,
}: {
  emoji: Parameters<typeof EmojiTile>[0]['name']
  tone: Parameters<typeof EmojiTile>[0]['tone']
  term: string
  detail: string
}) {
  return (
    <div data-emoji-group className="flex items-center gap-snug rounded-xl bg-bg-inset p-card">
      <EmojiTile name={emoji} tone={tone} size="sm" />
      <div className="min-w-0 flex-1">
        <dt className="text-2xs font-semibold uppercase tracking-wider text-fg-tertiary">{term}</dt>
        <dd className="mt-hair text-base font-bold text-fg">{detail}</dd>
      </div>
    </div>
  )
}
