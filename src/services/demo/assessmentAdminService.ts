import type { AssessmentDraft, DraftQuestion } from '@/types/assessmentAdmin'
import type { Assessment, AssessmentQuestion } from '@/types'
import { delay } from '@/lib/delay'
import { uid } from '@/lib/id'
import { db, logActivity, persist } from '../store'

/**
 * Assessment authoring, offline.
 *
 * Mirrors the Supabase contract. The one structural difference is that the
 * demo store holds `Assessment` (the learner-facing shape, which has
 * `answerIndex` rather than per-choice ids), so this module translates between
 * the two rather than storing drafts separately - otherwise editing an
 * assessment offline would not change the one a learner sees.
 */

const drafts = new Map<string, AssessmentDraft>()

/** Learner-facing assessment -> editable draft. */
function toDraft(a: Assessment): AssessmentDraft {
  const stored = drafts.get(a.id)

  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    description: a.description,
    instructions: stored?.instructions ?? '',
    moduleId: a.materialId ?? null,
    passingScore: a.passingScore,
    timeLimitMinutes: a.timeLimitMinutes ?? null,
    attemptsAllowed: a.attemptsAllowed,
    randomizeQuestions: stored?.randomizeQuestions ?? false,
    randomizeChoices: stored?.randomizeChoices ?? false,
    showCorrectAnswers: stored?.showCorrectAnswers ?? true,
    status: a.status,
    questions: a.questions.map<DraftQuestion>((q, i) => ({
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      explanation: q.explanation,
      points: q.points,
      sortOrder: i,
      correctText: undefined,
      choices: q.options.map((text, oi) => ({
        id: `${q.id}-${oi}`,
        text,
        isCorrect: oi === q.answerIndex,
      })),
    })),
  }
}

/** Draft question -> the learner-facing shape the demo store keeps. */
function toStored(q: DraftQuestion): AssessmentQuestion {
  const filled = q.choices.filter((c) => c.text.trim())
  return {
    id: q.id ?? uid('q'),
    prompt: q.prompt,
    type: q.type,
    options: filled.map((c) => c.text),
    // Offline scoring compares a single index, so multi-select collapses to
    // its first correct option. The Supabase backend scores by set equality.
    answerIndex: Math.max(0, filled.findIndex((c) => c.isCorrect)),
    explanation: q.explanation,
    points: q.points,
  }
}

const save = () => persist('assessments', db.assessments)

function find(id: string): Assessment {
  const a = db.assessments.find((x) => x.id === id)
  if (!a) throw new Error('Assessment not found')
  return a
}

export const assessmentAdminService = {
  async list() {
    return delay(
      db.assessments
        .map((a) => ({
          id: a.id,
          slug: a.slug,
          title: a.title,
          status: a.status as string,
          questionCount: a.questions.length,
          passingScore: a.passingScore,
          updatedAt: new Date().toISOString(),
        }))
        .sort((x, y) => x.title.localeCompare(y.title)),
      120,
    )
  },

  async get(id: string): Promise<AssessmentDraft | null> {
    const a = db.assessments.find((x) => x.id === id)
    return delay(a ? toDraft(a) : null, 140)
  },

  async create(input: { title: string; moduleId?: string | null }): Promise<string> {
    const created: Assessment = {
      id: uid('asm'),
      slug: `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`,
      title: input.title,
      description: '',
      materialId: input.moduleId ?? undefined,
      passingScore: 80,
      attemptsAllowed: 3,
      questions: [],
      status: 'draft',
    }
    db.assessments.unshift(created)
    save()
    logActivity({ actorId: 'admin', action: 'assessment.created', targetLabel: created.title, targetId: created.id })
    return delay(created.id, 200)
  },

  async updateSettings(
    id: string,
    patch: Partial<Omit<AssessmentDraft, 'id' | 'questions'>>,
  ): Promise<void> {
    const a = find(id)
    if (patch.title !== undefined) a.title = patch.title
    if (patch.description !== undefined) a.description = patch.description
    if (patch.passingScore !== undefined) a.passingScore = patch.passingScore
    if (patch.timeLimitMinutes !== undefined) {
      a.timeLimitMinutes = patch.timeLimitMinutes || undefined
    }
    if (patch.attemptsAllowed !== undefined) a.attemptsAllowed = patch.attemptsAllowed
    if (patch.moduleId !== undefined) a.materialId = patch.moduleId ?? undefined

    // Fields the learner-facing type does not carry are kept alongside.
    drafts.set(id, { ...toDraft(a), ...patch } as AssessmentDraft)
    save()
    return delay(undefined, 180)
  },

  async setStatus(id: string, status: 'draft' | 'published' | 'archived'): Promise<void> {
    const a = find(id)
    a.status = status
    save()
    logActivity({
      actorId: 'admin',
      action: 'assessment.published',
      targetLabel: `${a.title} (${status})`,
      targetId: a.id,
    })
    return delay(undefined, 180)
  },

  async saveQuestion(assessmentId: string, question: DraftQuestion): Promise<string> {
    const a = find(assessmentId)
    const stored = toStored(question)

    const index = question.id ? a.questions.findIndex((q) => q.id === question.id) : -1
    if (index >= 0) a.questions[index] = stored
    else a.questions.push(stored)

    a.questions.sort((x, y) => {
      const xi = x.id === stored.id ? question.sortOrder : a.questions.indexOf(x)
      const yi = y.id === stored.id ? question.sortOrder : a.questions.indexOf(y)
      return xi - yi
    })

    save()
    return delay(stored.id, 200)
  },

  async deleteQuestion(id: string): Promise<void> {
    db.assessments.forEach((a) => {
      a.questions = a.questions.filter((q) => q.id !== id)
    })
    save()
    return delay(undefined, 160)
  },

  async reorderQuestions(assessmentId: string, orderedIds: string[]): Promise<void> {
    const a = find(assessmentId)
    a.questions = orderedIds
      .map((id) => a.questions.find((q) => q.id === id))
      .filter((q): q is AssessmentQuestion => Boolean(q))
    save()
    return delay(undefined, 160)
  },

  async duplicate(id: string): Promise<string> {
    const source = find(id)
    const copy: Assessment = JSON.parse(JSON.stringify(source)) as Assessment
    copy.id = uid('asm')
    copy.slug = `${source.slug}-copy-${Date.now().toString(36)}`
    copy.title = `${source.title} (copy)`
    copy.status = 'draft'
    copy.questions = copy.questions.map((q) => ({ ...q, id: uid('q') }))
    db.assessments.unshift(copy)
    save()
    return delay(copy.id, 240)
  },

  async archive(id: string): Promise<void> {
    return this.setStatus(id, 'archived')
  },
}
