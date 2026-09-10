-- ============================================================================
-- 0004 - Assessments, attempts, and answers.
--
-- The security-critical detail in this file is that correct answers live in
-- `assessment_choices.is_correct` and `assessment_questions.correct_text`,
-- both of which are withheld from sales users by the policies in 0007. A
-- learner's client literally cannot read the key, so "don't reveal answers
-- before submission" (§17) is enforced by the database, not by careful UI.
-- ============================================================================

create table public.assessments (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title          text not null check (length(trim(title)) between 1 and 160),
  description    text not null default '',
  instructions   text not null default '',
  module_id      uuid references public.modules (id) on delete set null,

  passing_score  int not null default 80 check (passing_score between 0 and 100),
  time_limit_minutes int check (time_limit_minutes is null or time_limit_minutes > 0),
  -- 0 means unlimited. Negative would be meaningless, so it is excluded.
  attempts_allowed int not null default 3 check (attempts_allowed >= 0),
  randomize_questions boolean not null default false,
  randomize_choices   boolean not null default false,
  show_correct_answers boolean not null default true,

  status         public.content_status not null default 'draft',
  version        int not null default 1,
  created_by     uuid references public.profiles (id) on delete set null,
  updated_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  published_at   timestamptz,

  constraint assessments_published_has_timestamp
    check (status <> 'published' or published_at is not null)
);

create index assessments_status_idx on public.assessments (status);
create index assessments_module_idx on public.assessments (module_id);

create trigger assessments_set_updated_at before update on public.assessments
  for each row execute function public.set_updated_at();

-- Deferred FK from 0003, now that the target exists.
alter table public.learning_path_items
  add constraint learning_path_items_assessment_fk
  foreign key (assessment_id) references public.assessments (id) on delete cascade;

-- -------------------------------------------------------------- questions --

create table public.assessment_questions (
  id            uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  type          public.question_type not null default 'multiple_choice',
  prompt        text not null check (length(trim(prompt)) > 0),
  explanation   text not null default '',
  points        int  not null default 1 check (points > 0),
  sort_order    int  not null default 0,

  -- Only used by 'short_answer'. Compared case-insensitively and trimmed by
  -- the scoring function below.
  correct_text  text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint questions_unique_order unique (assessment_id, sort_order) deferrable initially deferred,
  -- A short-answer question with no key cannot be scored, and a choice-based
  -- question with a key would be ambiguous.
  constraint questions_short_answer_has_key check (
    (type = 'short_answer' and correct_text is not null and length(trim(correct_text)) > 0)
    or (type <> 'short_answer' and correct_text is null)
  )
);

create index assessment_questions_assessment_idx
  on public.assessment_questions (assessment_id, sort_order);

create trigger assessment_questions_set_updated_at before update on public.assessment_questions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- choices --

create table public.assessment_choices (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.assessment_questions (id) on delete cascade,
  text        text not null check (length(trim(text)) > 0),
  is_correct  boolean not null default false,
  sort_order  int not null default 0,

  constraint choices_unique_order unique (question_id, sort_order) deferrable initially deferred
);

create index assessment_choices_question_idx on public.assessment_choices (question_id, sort_order);

-- Guards the builder's output at write time: a choice-based question must have
-- at least two options and the right number of correct ones. Without this a
-- half-finished question could be published and would be unscoreable.
create or replace function public.validate_question_choices(p_question_id uuid)
returns void
language plpgsql
as $$
declare
  q_type   public.question_type;
  n_total  int;
  n_correct int;
begin
  select type into q_type from public.assessment_questions where id = p_question_id;
  if q_type is null or q_type = 'short_answer' then
    return;
  end if;

  select count(*), count(*) filter (where is_correct)
    into n_total, n_correct
    from public.assessment_choices where question_id = p_question_id;

  if n_total < 2 then
    raise exception 'Question % needs at least two choices (has %)', p_question_id, n_total;
  end if;

  if q_type in ('multiple_choice', 'true_false') and n_correct <> 1 then
    raise exception 'Question % must have exactly one correct choice (has %)', p_question_id, n_correct;
  end if;

  if q_type = 'multiple_select' and n_correct < 1 then
    raise exception 'Question % must have at least one correct choice', p_question_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------- attempts --

create table public.assessment_attempts (
  id             uuid primary key default gen_random_uuid(),
  assessment_id  uuid not null references public.assessments (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,

  attempt_number int not null check (attempt_number > 0),
  status         public.attempt_status not null default 'in_progress',

  -- Written only by submit_assessment_attempt(); see the policy in 0007 that
  -- prevents a learner from setting their own score.
  score          int,
  max_score      int,
  percentage     numeric(5,2),
  passed         boolean,

  started_at     timestamptz not null default now(),
  submitted_at   timestamptz,

  constraint attempts_unique_number unique (user_id, assessment_id, attempt_number),
  constraint attempts_submitted_is_scored check (
    status <> 'submitted'
    or (score is not null and percentage is not null and passed is not null and submitted_at is not null)
  )
);

create index attempts_user_idx       on public.assessment_attempts (user_id, submitted_at desc);
create index attempts_assessment_idx on public.assessment_attempts (assessment_id);
create index attempts_status_idx     on public.assessment_attempts (status);

-- ----------------------------------------------------------------- answers --

create table public.assessment_answers (
  id           uuid primary key default gen_random_uuid(),
  attempt_id   uuid not null references public.assessment_attempts (id) on delete cascade,
  question_id  uuid not null references public.assessment_questions (id) on delete cascade,

  -- Choice ids for choice questions; free text for short answers.
  choice_ids   uuid[] not null default '{}',
  text_answer  text,

  -- Filled in by the scoring function at submission, not by the client.
  is_correct   boolean,
  points_awarded int not null default 0,

  answered_at  timestamptz not null default now(),

  constraint answers_unique_question unique (attempt_id, question_id)
);

create index assessment_answers_attempt_idx on public.assessment_answers (attempt_id);

-- ---------------------------------------------------------------------------
-- Scoring.
--
-- Runs SECURITY DEFINER so it can read is_correct, which the calling learner
-- cannot. This is the only path by which a score is ever written: the RLS
-- policy in 0007 forbids a client from updating score/passed directly, so a
-- learner cannot award themselves a pass.
-- ---------------------------------------------------------------------------
create or replace function public.submit_assessment_attempt(p_attempt_id uuid)
returns public.assessment_attempts
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempt public.assessment_attempts;
  v_pass    int;
  v_total   int := 0;
  v_earned  int := 0;
  v_pct     numeric(5,2);
  r         record;
begin
  select * into v_attempt from public.assessment_attempts where id = p_attempt_id for update;

  if v_attempt is null then
    raise exception 'Attempt % not found', p_attempt_id;
  end if;

  -- An attempt belongs to exactly one person and only they may submit it.
  if v_attempt.user_id <> auth.uid() then
    raise exception 'You cannot submit an attempt that is not yours';
  end if;

  if v_attempt.status <> 'in_progress' then
    raise exception 'This attempt has already been submitted';
  end if;

  select passing_score into v_pass from public.assessments where id = v_attempt.assessment_id;

  -- Score every question on the assessment, not merely the answered ones, so
  -- skipping a question costs its points rather than shrinking the denominator.
  for r in
    select q.id, q.type, q.points, q.correct_text,
           a.choice_ids, a.text_answer
      from public.assessment_questions q
      left join public.assessment_answers a
        on a.question_id = q.id and a.attempt_id = p_attempt_id
     where q.assessment_id = v_attempt.assessment_id
  loop
    v_total := v_total + r.points;

    declare
      v_ok boolean := false;
      v_correct uuid[];
    begin
      if r.type = 'short_answer' then
        v_ok := r.text_answer is not null
                and lower(trim(r.text_answer)) = lower(trim(r.correct_text));
      else
        select coalesce(array_agg(c.id order by c.id), '{}')
          into v_correct
          from public.assessment_choices c
         where c.question_id = r.id and c.is_correct;

        -- Set equality: every correct choice selected and nothing else. For
        -- multiple_select this means partial credit is not awarded, which
        -- matches how the results screen reports a question as right or wrong.
        v_ok := v_correct <> '{}'
                and (select coalesce(array_agg(x order by x), '{}')
                       from unnest(coalesce(r.choice_ids, '{}')) x) = v_correct;
      end if;

      if v_ok then
        v_earned := v_earned + r.points;
      end if;

      -- Record the verdict so the review screen does not re-derive it.
      update public.assessment_answers
         set is_correct = v_ok,
             points_awarded = case when v_ok then r.points else 0 end
       where attempt_id = p_attempt_id and question_id = r.id;
    end;
  end loop;

  v_pct := case when v_total > 0 then round((v_earned::numeric / v_total) * 100, 2) else 0 end;

  update public.assessment_attempts
     set status = 'submitted',
         score = v_earned,
         max_score = v_total,
         percentage = v_pct,
         passed = v_pct >= v_pass,
         submitted_at = now()
   where id = p_attempt_id
   returning * into v_attempt;

  return v_attempt;
end;
$$;

-- Opens an attempt, allocating the next attempt number and refusing to exceed
-- the configured limit. Server-side because the limit is a rule, not a hint.
create or replace function public.start_assessment_attempt(p_assessment_id uuid)
returns public.assessment_attempts
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_allowed int;
  v_status  public.content_status;
  v_used    int;
  v_attempt public.assessment_attempts;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select attempts_allowed, status into v_allowed, v_status
    from public.assessments where id = p_assessment_id;

  if v_status is null then
    raise exception 'Assessment not found';
  end if;

  -- Admins may open a draft to test it; learners may not.
  if v_status <> 'published' and not public.is_admin() then
    raise exception 'This assessment is not available';
  end if;

  select count(*) into v_used
    from public.assessment_attempts
   where user_id = auth.uid() and assessment_id = p_assessment_id
     and status = 'submitted';

  if v_allowed > 0 and v_used >= v_allowed then
    raise exception 'You have used all % attempts for this assessment', v_allowed;
  end if;

  -- Reuse an abandoned in-progress attempt rather than stacking up rows when
  -- a learner closes the tab and comes back.
  select * into v_attempt
    from public.assessment_attempts
   where user_id = auth.uid() and assessment_id = p_assessment_id and status = 'in_progress'
   order by started_at desc limit 1;

  if v_attempt.id is not null then
    return v_attempt;
  end if;

  insert into public.assessment_attempts (assessment_id, user_id, attempt_number)
  values (p_assessment_id, auth.uid(), v_used + 1)
  returning * into v_attempt;

  return v_attempt;
end;
$$;
