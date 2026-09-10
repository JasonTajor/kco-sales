-- ============================================================================
-- 0010 - Attempt review.
--
-- §17 requires the results screen to show which answers were right, which were
-- wrong, and the explanation - while §17 equally requires that none of that is
-- available before submission.
--
-- Those two rules cannot both be satisfied by a table grant: the answer key is
-- withheld from `authenticated` at the column level (0007), so there is no
-- query a learner can run that returns it. This function is the one controlled
-- exception. It is SECURITY DEFINER, and it releases the key only when all of
-- the following hold:
--
--   * the attempt belongs to the caller (or the caller is an admin),
--   * the attempt has actually been submitted, and
--   * the assessment has show_correct_answers = true.
--
-- Miss any one and it raises. The key is therefore reachable exactly once the
-- learner can no longer use it to answer.
-- ============================================================================

create or replace function public.attempt_review(p_attempt_id uuid)
returns table (
  question_id     uuid,
  prompt          text,
  type            public.question_type,
  points          int,
  sort_order      int,
  explanation     text,
  -- What the learner picked, and what was right.
  selected_choice_ids uuid[],
  correct_choice_ids  uuid[],
  text_answer     text,
  correct_text    text,
  is_correct      boolean,
  points_awarded  int
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempt public.assessment_attempts;
  v_reveal  boolean;
begin
  select * into v_attempt from public.assessment_attempts where id = p_attempt_id;

  if v_attempt.id is null then
    raise exception 'Attempt not found';
  end if;

  if v_attempt.user_id <> auth.uid() and not public.is_admin() then
    raise exception 'That attempt is not yours';
  end if;

  if v_attempt.status <> 'submitted' then
    raise exception 'This attempt has not been submitted yet';
  end if;

  select a.show_correct_answers into v_reveal
    from public.assessments a where a.id = v_attempt.assessment_id;

  -- An admin reviewing someone's attempt always sees the key; a learner sees
  -- it only if the assessment was configured to reveal it.
  v_reveal := coalesce(v_reveal, true) or public.is_admin();

  return query
  select
    q.id,
    q.prompt,
    q.type,
    q.points,
    q.sort_order,
    -- The explanation is part of the feedback, so it follows the same gate.
    case when v_reveal then q.explanation else '' end,
    coalesce(ans.choice_ids, '{}'),
    case
      when v_reveal then coalesce(
        (select array_agg(c.id order by c.sort_order)
           from public.assessment_choices c
          where c.question_id = q.id and c.is_correct),
        '{}')
      else '{}'
    end,
    ans.text_answer,
    case when v_reveal then q.correct_text end,
    -- Written by the scoring function at submission, so this is the verdict
    -- that produced the score rather than a re-derivation.
    ans.is_correct,
    coalesce(ans.points_awarded, 0)
  from public.assessment_questions q
  left join public.assessment_answers ans
    on ans.question_id = q.id and ans.attempt_id = p_attempt_id
  where q.assessment_id = v_attempt.assessment_id
  order by q.sort_order;
end;
$$;

comment on function public.attempt_review(uuid) is
  'Post-submission review including the answer key. The only sanctioned path to '
  'assessment_choices.is_correct for a non-admin, gated on the attempt being '
  'submitted and owned by the caller.';

revoke execute on function public.attempt_review(uuid) from public, anon;
grant execute on function public.attempt_review(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Records an answer while an attempt is open.
--
-- Exists so the runner can save progress with one upsert per question without
-- needing to know whether a row already exists. The RLS policies on
-- assessment_answers still apply: this is SECURITY INVOKER, unlike the
-- functions above, precisely so a learner cannot use it to write into someone
-- else's attempt.
-- ---------------------------------------------------------------------------
create or replace function public.save_answer(
  p_attempt_id  uuid,
  p_question_id uuid,
  p_choice_ids  uuid[] default '{}',
  p_text_answer text default null
) returns void
language sql
set search_path = public, pg_temp
as $$
  insert into public.assessment_answers (attempt_id, question_id, choice_ids, text_answer)
  values (p_attempt_id, p_question_id, coalesce(p_choice_ids, '{}'), p_text_answer)
  on conflict (attempt_id, question_id) do update
    set choice_ids  = excluded.choice_ids,
        text_answer = excluded.text_answer,
        answered_at = now();
$$;

revoke execute on function public.save_answer(uuid, uuid, uuid[], text) from public, anon;
grant execute on function public.save_answer(uuid, uuid, uuid[], text) to authenticated;
