import type {
  AnswerInput,
  Assessment,
  AssessmentAttempt,
  AssessmentQuestion,
  AttemptDraft,
  AttemptReviewRow,
  QuestionType,
} from '@/types'
import { requireDb, unwrap, unwrapMaybe } from '@/lib/supabase'
import type { assessmentService as DemoApi } from '../demo/assessmentService'
import { rowToAssessment } from '../mappers'
import { logActivity } from './activity'

/**
 * Assessments, backed by Supabase.
 *
 * The important property of this file is what it does NOT do: it never scores
 * anything. `answerIndex` on every question it returns is -1, because the
 * answer key is withheld from this client at the column level and cannot be
 * fetched. Scoring happens in `submit_assessment_attempt()`, and the key is
 * released only afterwards, by `attempt_review()`.
 *
 * That is why the flow is start -> save -> submit rather than a single POST of
 * the finished paper: the attempt has to exist server-side before answers can
 * be attached to it, and the server has to own the transition to "submitted".
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Questions and choices, minus the withheld columns. */
const QUESTION_TREE = `
  *,
  assessment_questions (
    id, assessment_id, type, prompt, explanation, points, sort_order,
    assessment_choices ( id, question_id, text, sort_order )
  )
`

type NestedAssessment = Record<string, unknown> & {
  assessment_questions?: (Record<string, unknown> & {
    assessment_choices?: Record<string, unknown>[]
  })[]
}

function assemble(row: NestedAssessment): Assessment {
  const questions = [...(row.assessment_questions ?? [])]
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
    .map<AssessmentQuestion>((q) => {
      const choices = [...(q.assessment_choices ?? [])].sort(
        (a, b) => Number(a.sort_order) - Number(b.sort_order),
      )
      return {
        id: String(q.id),
        prompt: String(q.prompt),
        type: q.type as QuestionType,
        options: choices.map((c) => String(c.text)),
        choiceIds: choices.map((c) => String(c.id)),
        // Deliberately unknown to this client. See the file comment.
        answerIndex: -1,
        explanation: String(q.explanation ?? ''),
        points: Number(q.points ?? 1),
      }
    })

  return rowToAssessment(row as never, questions)
}

export const assessmentService: typeof DemoApi = {
  async list(): Promise<Assessment[]> {
    const db = requireDb()
    // RLS already restricts a learner to published assessments; the explicit
    // filter is what makes this correct for an admin too.
    const rows = unwrap(
      await db.from('assessments').select(QUESTION_TREE).eq('status', 'published').order('title'),
    )
    return (rows as NestedAssessment[]).map(assemble)
  },

  async all(): Promise<Assessment[]> {
    const db = requireDb()
    const rows = unwrap(await db.from('assessments').select(QUESTION_TREE).order('title'))
    return (rows as NestedAssessment[]).map(assemble)
  },

  async get(idOrSlug: string): Promise<Assessment | null> {
    const db = requireDb()
    const column = UUID_RE.test(idOrSlug) ? 'id' : 'slug'
    const row = unwrapMaybe(
      await db.from('assessments').select(QUESTION_TREE).eq(column, idOrSlug).maybeSingle(),
    )
    return row ? assemble(row as NestedAssessment) : null
  },

  async attemptsFor(userId: string, assessmentId?: string): Promise<AssessmentAttempt[]> {
    const db = requireDb()

    let q = db
      .from('assessment_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false })

    if (assessmentId) q = q.eq('assessment_id', assessmentId)

    const rows = unwrap(await q)
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      assessmentId: r.assessment_id,
      score: Number(r.percentage ?? 0),
      points: { earned: r.score ?? 0, total: r.max_score ?? 0 },
      attemptNumber: r.attempt_number,
      passed: r.passed ?? false,
      startedAt: r.started_at,
      submittedAt: r.submitted_at ?? r.started_at,
    }))
  },

  async startAttempt(_userId: string, assessmentId: string): Promise<AttemptDraft> {
    const db = requireDb()

    // The RPC allocates the attempt number, enforces attempts_allowed, and
    // reuses an abandoned in-progress attempt rather than stacking rows up.
    const res = await db.rpc('start_assessment_attempt', { p_assessment_id: assessmentId })
    if (res.error) throw new Error(res.error.message)

    const row = res.data as unknown as {
      id: string
      attempt_number: number
      started_at: string
    }
    return { id: row.id, attemptNumber: row.attempt_number, startedAt: row.started_at }
  },

  /**
   * Saves one answer as the learner moves through the paper.
   *
   * Called per question rather than once at the end, so closing the tab
   * mid-assessment does not lose the work - `start_assessment_attempt` returns
   * the same open attempt on the way back in.
   */
  async saveAnswer(attemptId: string, answer: AnswerInput): Promise<void> {
    const db = requireDb()
    const res = await db.rpc('save_answer', {
      p_attempt_id: attemptId,
      p_question_id: answer.questionId,
      p_choice_ids: answer.choiceIds,
      p_text_answer: answer.text ?? null,
    })
    if (res.error) throw new Error(res.error.message)
  },

  async submit(
    _userId: string,
    assessment: Assessment,
    attempt: AttemptDraft,
    answers: AnswerInput[],
  ): Promise<AssessmentAttempt> {
    const db = requireDb()

    // Flush anything not yet saved. Answers are upserted, so re-sending one
    // that already landed is harmless.
    for (const answer of answers) {
      await this.saveAnswer(attempt.id, answer)
    }

    const res = await db.rpc('submit_assessment_attempt', { p_attempt_id: attempt.id })
    if (res.error) throw new Error(res.error.message)

    const row = res.data as unknown as {
      id: string
      user_id: string
      assessment_id: string
      score: number
      max_score: number
      percentage: number
      passed: boolean
      attempt_number: number
      started_at: string
      submitted_at: string
    }

    await logActivity('assessment.submitted', 'assessment', assessment.id, assessment.title, {
      percentage: row.percentage,
      passed: row.passed,
    })

    return {
      id: row.id,
      userId: row.user_id,
      assessmentId: row.assessment_id,
      score: Number(row.percentage),
      points: { earned: row.score, total: row.max_score },
      attemptNumber: row.attempt_number,
      passed: row.passed,
      startedAt: row.started_at,
      submittedAt: row.submitted_at,
    }
  },

  /**
   * The results screen (§17).
   *
   * `attempt_review` is the only path by which this client ever learns a
   * correct answer, and it refuses to answer for an attempt that is still open
   * or that belongs to someone else. The option text is fetched alongside,
   * since the RPC returns ids.
   */
  async review(attemptId: string): Promise<AttemptReviewRow[]> {
    const db = requireDb()

    const res = await db.rpc('attempt_review', { p_attempt_id: attemptId })
    if (res.error) throw new Error(res.error.message)

    const rows = (res.data ?? []) as unknown as {
      question_id: string
      prompt: string
      type: QuestionType
      points: number
      explanation: string
      selected_choice_ids: string[]
      correct_choice_ids: string[]
      text_answer: string | null
      correct_text: string | null
      is_correct: boolean | null
      points_awarded: number
    }[]

    if (rows.length === 0) return []

    const choices = unwrap(
      await db
        .from('assessment_choices')
        .select('id, question_id, text, sort_order')
        .in('question_id', rows.map((r) => r.question_id))
        .order('sort_order'),
    )

    const byQuestion = new Map<string, { id: string; text: string }[]>()
    choices.forEach((c) => {
      const list = byQuestion.get(c.question_id) ?? []
      list.push({ id: c.id, text: c.text })
      byQuestion.set(c.question_id, list)
    })

    return rows.map((r) => ({
      questionId: r.question_id,
      prompt: r.prompt,
      type: r.type,
      points: r.points,
      explanation: r.explanation,
      options: byQuestion.get(r.question_id) ?? [],
      selectedChoiceIds: r.selected_choice_ids ?? [],
      correctChoiceIds: r.correct_choice_ids ?? [],
      textAnswer: r.text_answer ?? undefined,
      correctText: r.correct_text ?? undefined,
      isCorrect: r.is_correct,
      pointsAwarded: r.points_awarded,
    }))
  },
}
