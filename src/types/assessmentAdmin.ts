import type { QuestionType } from '@/types'

/**
 * Assessment authoring types (§16).
 *
 * Distinct from the learner-facing `AssessmentQuestion` because they carry the
 * answer key. That separation is not cosmetic: on the Supabase backend the key
 * is unreadable to a learner's client at the column level, so a single type
 * holding both views of a question would be a type that is only ever half
 * populated.
 */

export interface DraftChoice {
  /** Absent for a choice that has not been saved yet. */
  id?: string
  text: string
  isCorrect: boolean
}

export interface DraftQuestion {
  id?: string
  type: QuestionType
  prompt: string
  explanation: string
  points: number
  sortOrder: number
  choices: DraftChoice[]
  /** short_answer only. */
  correctText?: string
}

export interface AssessmentDraft {
  id: string
  slug: string
  title: string
  description: string
  instructions: string
  moduleId: string | null
  passingScore: number
  timeLimitMinutes: number | null
  attemptsAllowed: number
  randomizeQuestions: boolean
  randomizeChoices: boolean
  showCorrectAnswers: boolean
  status: 'draft' | 'published' | 'archived'
  questions: DraftQuestion[]
}

/**
 * Validates a question before it is sent.
 *
 * The database enforces these rules too - `validate_question_choices()` raises
 * on a malformed question - but a builder that only found out at save time
 * would be miserable to use. Returns the reasons a question is not ready, so
 * the UI can point at them.
 */
export function questionProblems(q: DraftQuestion): string[] {
  const problems: string[] = []

  if (!q.prompt.trim()) problems.push('The question needs a prompt.')
  if (q.points < 1) problems.push('Points must be at least 1.')

  if (q.type === 'short_answer') {
    if (!q.correctText?.trim()) problems.push('A short answer needs an expected answer to score against.')
    return problems
  }

  const filled = q.choices.filter((c) => c.text.trim())
  if (filled.length < 2) problems.push('Give at least two options.')

  const correct = filled.filter((c) => c.isCorrect).length
  if (q.type === 'multiple_select') {
    if (correct < 1) problems.push('Mark at least one option correct.')
  } else if (correct !== 1) {
    problems.push(
      correct === 0 ? 'Mark the correct option.' : 'Only one option can be correct for this type.',
    )
  }

  return problems
}

/** An assessment is publishable when every question is valid and there is one. */
export function assessmentProblems(a: AssessmentDraft): string[] {
  const problems: string[] = []
  if (!a.title.trim()) problems.push('The assessment needs a title.')
  if (a.questions.length === 0) problems.push('Add at least one question.')

  a.questions.forEach((q, i) => {
    questionProblems(q).forEach((p) => problems.push(`Question ${i + 1}: ${p}`))
  })

  return problems
}

export const QUESTION_TYPES: { value: QuestionType; label: string; hint: string }[] = [
  { value: 'multiple_choice', label: 'Multiple choice', hint: 'One correct option' },
  { value: 'true_false', label: 'True / False', hint: 'Two options, one correct' },
  { value: 'multiple_select', label: 'Multiple select', hint: 'Several correct options' },
  { value: 'short_answer', label: 'Short answer', hint: 'Typed, matched case-insensitively' },
]

/** A blank question of the requested type, with the right starting options. */
export function blankQuestion(type: QuestionType, sortOrder: number): DraftQuestion {
  const base = { type, prompt: '', explanation: '', points: 1, sortOrder }

  if (type === 'short_answer') return { ...base, choices: [], correctText: '' }
  if (type === 'true_false') {
    return {
      ...base,
      choices: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ],
    }
  }
  return {
    ...base,
    choices: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
  }
}
