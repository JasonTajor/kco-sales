import type { AssessmentDraft, DraftQuestion } from '@/types/assessmentAdmin'
import { requireDb, unwrap, unwrapMaybe } from '@/lib/supabase'
import type { assessmentAdminService as DemoApi } from '../demo/assessmentAdminService'
import { logActivity } from './activity'

/**
 * Assessment authoring, backed by Supabase (§16).
 *
 * Two things here are unusual, and both follow from the answer key being
 * withheld from `authenticated` at the column level:
 *
 *  - Reading a question for editing goes through the `admin_assessment_*`
 *    views, which are SECURITY DEFINER with `where public.is_admin()` in their
 *    body. A plain select on the table would be refused for the whole row.
 *
 *  - Writing a question goes through `admin_save_question`, which upserts the
 *    question and replaces its choices in one transaction and then validates
 *    the result. A client-side sequence of inserts could leave a question with
 *    no correct answer, which is unscoreable.
 */
export const assessmentAdminService: typeof DemoApi = {
  async list(): Promise<
    { id: string; slug: string; title: string; status: string; questionCount: number; passingScore: number; updatedAt: string }[]
  > {
    const db = requireDb()

    const rows = unwrap(
      await db
        .from('assessments')
        .select('*, assessment_questions ( id )')
        .order('updated_at', { ascending: false }),
    ) as unknown as (Record<string, unknown> & { assessment_questions?: unknown[] })[]

    return rows.map((r) => ({
      id: String(r.id),
      slug: String(r.slug),
      title: String(r.title),
      status: String(r.status),
      questionCount: (r.assessment_questions ?? []).length,
      passingScore: Number(r.passing_score),
      updatedAt: String(r.updated_at),
    }))
  },

  /** The full draft, including the answer key. Admin-only by construction. */
  async get(id: string): Promise<AssessmentDraft | null> {
    const db = requireDb()

    const row = unwrapMaybe(await db.from('assessments').select('*').eq('id', id).maybeSingle())
    if (row === null) return null

    const [questionsRes, choicesRes] = await Promise.all([
      db.from('admin_assessment_questions').select('*').eq('assessment_id', id).order('sort_order'),
      db.from('admin_assessment_choices').select('*').order('sort_order'),
    ])
    if (questionsRes.error) throw new Error(questionsRes.error.message)
    if (choicesRes.error) throw new Error(choicesRes.error.message)

    /*
     * A Postgres view loses the NOT NULL of the columns it selects, so the
     * generated types mark every column of these two views nullable even
     * though the underlying tables do not. Rather than null-guard each field
     * at every use, the shape is asserted once here - which is also the only
     * place that assumption lives, so a schema change surfaces in one spot.
     */
    type QuestionRow = {
      id: string
      type: DraftQuestion['type']
      prompt: string
      explanation: string
      points: number
      sort_order: number
      correct_text: string | null
    }
    type ChoiceRow = { id: string; question_id: string; text: string; is_correct: boolean }

    const questions = (questionsRes.data ?? []) as unknown as QuestionRow[]
    const choices = (choicesRes.data ?? []) as unknown as ChoiceRow[]

    const byQuestion = new Map<string, ChoiceRow[]>()
    choices.forEach((c) => {
      const list = byQuestion.get(c.question_id) ?? []
      list.push(c)
      byQuestion.set(c.question_id, list)
    })

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      instructions: row.instructions,
      moduleId: row.module_id,
      passingScore: row.passing_score,
      timeLimitMinutes: row.time_limit_minutes,
      attemptsAllowed: row.attempts_allowed,
      randomizeQuestions: row.randomize_questions,
      randomizeChoices: row.randomize_choices,
      showCorrectAnswers: row.show_correct_answers,
      status: row.status,
      questions: questions.map<DraftQuestion>((q) => ({
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        explanation: q.explanation,
        points: q.points,
        sortOrder: q.sort_order,
        correctText: q.correct_text ?? undefined,
        choices: (byQuestion.get(q.id) ?? []).map((c) => ({
          id: c.id,
          text: c.text,
          isCorrect: c.is_correct,
        })),
      })),
    }
  },

  async create(input: { title: string; moduleId?: string | null }): Promise<string> {
    const db = requireDb()

    const row = unwrap(
      await db
        .from('assessments')
        .insert({
          slug: await uniqueSlug(slugify(input.title)),
          title: input.title,
          module_id: input.moduleId ?? null,
          status: 'draft',
        })
        .select('id, title')
        .single(),
    )

    await logActivity('assessment.created', 'assessment', row.id, row.title)
    return row.id
  },

  async updateSettings(
    id: string,
    patch: Partial<Omit<AssessmentDraft, 'id' | 'questions'>>,
  ): Promise<void> {
    const db = requireDb()

    const res = await db
      .from('assessments')
      .update({
        title: patch.title,
        description: patch.description,
        instructions: patch.instructions,
        module_id: patch.moduleId,
        passing_score: patch.passingScore,
        // 0 in the form means "no limit", which the column stores as null.
        time_limit_minutes: patch.timeLimitMinutes || null,
        attempts_allowed: patch.attemptsAllowed,
        randomize_questions: patch.randomizeQuestions,
        randomize_choices: patch.randomizeChoices,
        show_correct_answers: patch.showCorrectAnswers,
      })
      .eq('id', id)
    if (res.error) throw new Error(res.error.message)
  },

  async setStatus(id: string, status: 'draft' | 'published' | 'archived'): Promise<void> {
    const db = requireDb()

    const res = await db
      .from('assessments')
      .update({
        status,
        // The check constraint requires a timestamp on anything published.
        published_at: status === 'published' ? new Date().toISOString() : undefined,
      })
      .eq('id', id)
      .select('title')
      .single()
    if (res.error) throw new Error(res.error.message)

    await logActivity(`assessment.${status}`, 'assessment', id, res.data.title)
  },

  async saveQuestion(assessmentId: string, question: DraftQuestion): Promise<string> {
    const db = requireDb()

    const res = await db.rpc('admin_save_question', {
      p_assessment_id: assessmentId,
      p_question_id: question.id ?? null,
      p_type: question.type,
      p_prompt: question.prompt,
      p_explanation: question.explanation,
      p_points: question.points,
      p_sort_order: question.sortOrder,
      p_correct_text: question.type === 'short_answer' ? (question.correctText ?? '') : null,
      p_choices: question.choices
        .filter((c) => c.text.trim())
        .map((c) => ({ text: c.text.trim(), is_correct: c.isCorrect })) as never,
    })
    if (res.error) throw new Error(res.error.message)

    return String(res.data)
  },

  async deleteQuestion(id: string): Promise<void> {
    const db = requireDb()
    // Choices cascade with the question.
    const res = await db.from('assessment_questions').delete().eq('id', id)
    if (res.error) throw new Error(res.error.message)
  },

  /**
   * Persists a new question order.
   *
   * sort_order is unique per assessment, so the positions cannot simply be
   * rewritten one at a time - the first update would collide with whatever
   * currently holds that slot. The constraint is DEFERRABLE INITIALLY
   * DEFERRED precisely for this: every row is moved, and uniqueness is checked
   * once at commit.
   */
  async reorderQuestions(_assessmentId: string, orderedIds: string[]): Promise<void> {
    const db = requireDb()

    for (const [index, id] of orderedIds.entries()) {
      const res = await db.from('assessment_questions').update({ sort_order: index }).eq('id', id)
      if (res.error) throw new Error(res.error.message)
    }
  },

  async duplicate(id: string): Promise<string> {
    const source = await this.get(id)
    if (!source) throw new Error('Assessment not found')

    const newId = await this.create({ title: `${source.title} (copy)`, moduleId: source.moduleId })
    await this.updateSettings(newId, {
      description: source.description,
      instructions: source.instructions,
      passingScore: source.passingScore,
      timeLimitMinutes: source.timeLimitMinutes,
      attemptsAllowed: source.attemptsAllowed,
      randomizeQuestions: source.randomizeQuestions,
      randomizeChoices: source.randomizeChoices,
      showCorrectAnswers: source.showCorrectAnswers,
    })

    for (const q of source.questions) {
      await this.saveQuestion(newId, { ...q, id: undefined })
    }

    return newId
  },

  /**
   * Archives rather than deletes (§75).
   *
   * Attempts reference the assessment, and a real deletion would either take
   * a learner's result history with it or be refused by the foreign key. An
   * archived assessment stays out of the library and keeps its history.
   */
  async archive(id: string): Promise<void> {
    await this.setStatus(id, 'archived')
  },
}

function slugify(v: string): string {
  return (
    v
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'assessment'
  )
}

async function uniqueSlug(base: string): Promise<string> {
  const db = requireDb()
  const rows = unwrap(await db.from('assessments').select('slug').like('slug', `${base}%`))
  const taken = new Set(rows.map((r) => r.slug))
  if (!taken.has(base)) return base
  for (let n = 2; n < 200; n++) {
    if (!taken.has(`${base}-${n}`)) return `${base}-${n}`
  }
  return `${base}-${Date.now().toString(36)}`
}
