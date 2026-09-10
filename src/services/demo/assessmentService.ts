import type {
  AnswerInput,
  Assessment,
  AssessmentAttempt,
  AttemptDraft,
  AttemptReviewRow,
} from '@/types'
import { delay } from '@/lib/delay'
import { uid } from '@/lib/id'
import { db, logActivity, persistAttempts } from '../store'

/**
 * Assessments, offline.
 *
 * Mirrors the Supabase contract exactly, including its shape: an attempt is
 * opened, answers are saved against it, and it is submitted for scoring. That
 * is more ceremony than an offline store needs, but the two backends must be
 * interchangeable - and the ceremony is what makes server-side scoring
 * possible in the real one.
 *
 * The one honest difference: here the browser scores the attempt, because
 * there is nowhere else to do it. Against Supabase the client never sees the
 * answer key at all.
 */

/** Answers held per open attempt, mirroring assessment_answers. */
const pending = new Map<string, AnswerInput[]>()

export const assessmentService = {
  async list(): Promise<Assessment[]> {
    return delay(db.assessments.filter((a) => a.status === 'published'))
  },

  async all(): Promise<Assessment[]> {
    return delay(db.assessments, 120)
  },

  async get(idOrSlug: string): Promise<Assessment | null> {
    return delay(db.assessments.find((a) => a.id === idOrSlug || a.slug === idOrSlug) ?? null, 160)
  },

  async attemptsFor(userId: string, assessmentId?: string): Promise<AssessmentAttempt[]> {
    return delay(
      db.attempts
        .filter((a) => a.userId === userId && (!assessmentId || a.assessmentId === assessmentId))
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
      120,
    )
  },

  async startAttempt(userId: string, assessmentId: string): Promise<AttemptDraft> {
    const assessment = db.assessments.find((a) => a.id === assessmentId)
    if (!assessment) throw new Error('Assessment not found')

    const used = db.attempts.filter((a) => a.userId === userId && a.assessmentId === assessmentId).length
    if (assessment.attemptsAllowed > 0 && used >= assessment.attemptsAllowed) {
      throw new Error(`You have used all ${assessment.attemptsAllowed} attempts for this assessment.`)
    }

    const draft: AttemptDraft = {
      id: uid('att'),
      attemptNumber: used + 1,
      startedAt: new Date().toISOString(),
    }
    pending.set(draft.id, [])
    return delay(draft, 200)
  },

  async saveAnswer(attemptId: string, answer: AnswerInput): Promise<void> {
    const list = pending.get(attemptId)
    if (!list) throw new Error('That attempt is no longer open.')
    const existing = list.findIndex((a) => a.questionId === answer.questionId)
    if (existing >= 0) list[existing] = answer
    else list.push(answer)
  },

  async submit(
    userId: string,
    assessment: Assessment,
    attempt: AttemptDraft,
    answers: AnswerInput[],
  ): Promise<AssessmentAttempt> {
    const total = assessment.questions.reduce((s, q) => s + q.points, 0)

    const earned = assessment.questions.reduce((sum, q) => {
      const given = answers.find((a) => a.questionId === q.id)
      if (!given) return sum
      // Options are addressed by index offline, since there are no choice ids.
      const picked = given.choiceIds[0]
      return picked !== undefined && Number(picked) === q.answerIndex ? sum + q.points : sum
    }, 0)

    const score = total > 0 ? Math.round((earned / total) * 100) : 0

    const record: AssessmentAttempt = {
      id: attempt.id,
      userId,
      assessmentId: assessment.id,
      score,
      points: { earned, total },
      attemptNumber: attempt.attemptNumber,
      passed: score >= assessment.passingScore,
      startedAt: attempt.startedAt,
      submittedAt: new Date().toISOString(),
    }

    db.attempts.unshift(record)
    persistAttempts()
    reviews.set(record.id, { assessment, answers })
    pending.delete(attempt.id)

    logActivity({
      actorId: userId,
      action: 'assessment.submitted',
      targetLabel: assessment.title,
      targetId: assessment.id,
    })
    return delay(record, 420)
  },

  async review(attemptId: string): Promise<AttemptReviewRow[]> {
    const stored = reviews.get(attemptId)
    if (!stored) throw new Error('That attempt cannot be reviewed.')

    const { assessment, answers } = stored
    return delay(
      assessment.questions.map<AttemptReviewRow>((q) => {
        const given = answers.find((a) => a.questionId === q.id)
        const pickedIndex = given?.choiceIds[0] !== undefined ? Number(given.choiceIds[0]) : -1
        const isCorrect = pickedIndex === q.answerIndex

        return {
          questionId: q.id,
          prompt: q.prompt,
          type: q.type,
          points: q.points,
          explanation: q.explanation,
          options: q.options.map((text, i) => ({ id: String(i), text })),
          selectedChoiceIds: pickedIndex >= 0 ? [String(pickedIndex)] : [],
          correctChoiceIds: [String(q.answerIndex)],
          isCorrect,
          pointsAwarded: isCorrect ? q.points : 0,
        }
      }),
      140,
    )
  },
}

/**
 * Submitted answers, kept so the results screen can be revisited.
 *
 * Not persisted: this is the one piece of state the offline backend cannot
 * reasonably keep, and inventing a review for an attempt from a previous
 * session would be worse than saying it is unavailable.
 */
const reviews = new Map<string, { assessment: Assessment; answers: AnswerInput[] }>()
