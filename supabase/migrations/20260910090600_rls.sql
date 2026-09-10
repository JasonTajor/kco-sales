-- ============================================================================
-- 0007 - Row Level Security.
--
-- Everything below is the real authorization boundary. The React route guards
-- are a usability feature; this file is the security control (§39).
--
-- Two predicates do most of the work:
--   public.is_admin()        - active admin
--   public.is_active_user()  - any signed-in, non-deactivated account
--
-- Deactivating a profile therefore revokes data access immediately, without
-- needing to delete the auth user or wait for their JWT to expire.
--
-- Reading order: each table gets (1) enable RLS, (2) read policies, (3) write
-- policies. A table with RLS enabled and no matching policy denies by default,
-- which is the behaviour we want for anything not listed.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Baseline privileges.
--
-- Supabase grants the anon/authenticated roles broad table access by default.
-- We keep that (RLS is what constrains it) but revoke it from `anon` outright:
-- nothing in this product is public, so an unauthenticated request should fail
-- at the privilege layer before any policy is even consulted.
--
-- !! REQUIRES A DEDICATED SUPABASE PROJECT !!
--
-- The two statements below are schema-wide. Run in a database that also hosts
-- another application and they will strip anonymous access from that
-- application's tables and functions too - which for a public storefront means
-- taking it offline for logged-out visitors. This migration set also creates
-- `public.profiles`, which collides with the table most Supabase starter
-- templates already define.
--
-- If the LMS ever has to share a project, replace these with explicit
-- per-object REVOKEs against the tables this schema owns.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;

-- Functions are EXECUTE-able by PUBLIC unless told otherwise, and `anon`
-- inherits that. Revoking from the role alone leaves the PUBLIC grant in
-- place and changes nothing, so PUBLIC has to be named explicitly.
revoke all on all functions in schema public from public, anon;

-- =========================================================== profiles ======

alter table public.profiles enable row level security;

-- Everyone signed in can see the team roster. This is an internal company
-- tool: names, roles and departments are not secrets, and the assignment UI
-- needs them. Progress and results are guarded separately below.
create policy profiles_select_self_or_active on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_active_user());

-- A user may edit their own profile, but NOT their role or status - those are
-- the two columns that would let them promote themselves (§56). The WITH CHECK
-- re-reads the committed row and rejects the write if either changed.
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role   = (select p.role   from public.profiles p where p.id = auth.uid())
    and status = (select p.status from public.profiles p where p.id = auth.uid())
  );

create policy profiles_admin_all on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admins create profiles through the invite flow; the signup trigger inserts
-- as the definer, so no general INSERT policy is needed for self-signup.

-- ========================================================== content ========
--
-- Read rule for every content table: admins see everything, learners see only
-- what is published. Write rule: admins only.
-- ---------------------------------------------------------------------------

alter table public.categories enable row level security;

create policy categories_select on public.categories
  for select to authenticated using (public.is_active_user());
create policy categories_admin on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- modules --

alter table public.modules enable row level security;

create policy modules_select_published on public.modules
  for select to authenticated
  using (
    public.is_admin()
    or (
      public.is_active_user()
      and status = 'published'
      -- Honour the module's audience list, so an admin-only module stays
      -- invisible to sales even once published.
      and (select p.role from public.profiles p where p.id = auth.uid()) = any (audience)
    )
  );

create policy modules_admin on public.modules
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- lessons --

-- A lesson is visible exactly when its module is. Expressed as an EXISTS over
-- modules so the module policy above is the single place the rule is written -
-- change it once and lessons follow.
alter table public.lessons enable row level security;

create policy lessons_select on public.lessons
  for select to authenticated
  using (
    public.is_admin()
    or (
      status = 'published'
      and exists (select 1 from public.modules m where m.id = module_id)
    )
  );

create policy lessons_admin on public.lessons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- --------------------------------------------------------- content_blocks --

alter table public.content_blocks enable row level security;

create policy content_blocks_select on public.content_blocks
  for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.lessons l where l.id = lesson_id)
  );

create policy content_blocks_admin on public.content_blocks
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------- learning paths --

alter table public.learning_paths enable row level security;

create policy learning_paths_select on public.learning_paths
  for select to authenticated
  using (
    public.is_admin()
    or (public.is_active_user() and status = 'published'
        and (select p.role from public.profiles p where p.id = auth.uid()) = any (audience))
  );

create policy learning_paths_admin on public.learning_paths
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.learning_path_items enable row level security;

create policy learning_path_items_select on public.learning_path_items
  for select to authenticated
  using (public.is_admin() or exists (select 1 from public.learning_paths p where p.id = path_id));

create policy learning_path_items_admin on public.learning_path_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ======================================================== assessments =====

alter table public.assessments enable row level security;

create policy assessments_select on public.assessments
  for select to authenticated
  using (public.is_admin() or (public.is_active_user() and status = 'published'));

create policy assessments_admin on public.assessments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.assessment_questions enable row level security;

create policy assessment_questions_select on public.assessment_questions
  for select to authenticated
  using (public.is_admin() or exists (select 1 from public.assessments a where a.id = assessment_id));

create policy assessment_questions_admin on public.assessment_questions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.assessment_choices enable row level security;

create policy assessment_choices_select on public.assessment_choices
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.assessment_questions q where q.id = question_id
    )
  );

create policy assessment_choices_admin on public.assessment_choices
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Hiding the answer key.
--
-- RLS filters rows, not columns - and a learner must be able to read the
-- choice rows in order to see the options. So the key is protected with
-- column privileges instead: `authenticated` simply has no SELECT right on
-- assessment_choices.is_correct or assessment_questions.correct_text.
--
-- The effect is that `select * from assessment_choices` fails for everyone,
-- and a learner has no query at all that returns the key - not a filtered one,
-- not a crafted one. There is no policy to get wrong.
--
-- Admins reach the key through the two definer views below, which re-admit it
-- behind an explicit is_admin() check.
-- ---------------------------------------------------------------------------
-- The table-level grant must go first. A column-level REVOKE against a role
-- that holds SELECT on the whole table does nothing at all - table-level
-- SELECT already covers every column, including ones added later. Supabase
-- grants exactly that to `authenticated` by default, so the sequence is:
-- drop the table-wide right, then hand back only the safe columns.
revoke select on public.assessment_choices   from authenticated;
revoke select on public.assessment_questions from authenticated;

grant select (id, question_id, text, sort_order)
  on public.assessment_choices to authenticated;
grant select (id, assessment_id, type, prompt, explanation, points, sort_order, created_at, updated_at)
  on public.assessment_questions to authenticated;

-- Definer views: they run as the owner, so they can read the withheld columns,
-- and their own WHERE clause is what limits them to admins.
create view public.admin_assessment_choices
  with (security_invoker = false) as
  select c.id, c.question_id, c.text, c.is_correct, c.sort_order
    from public.assessment_choices c
   where public.is_admin();

create view public.admin_assessment_questions
  with (security_invoker = false) as
  select q.id, q.assessment_id, q.type, q.prompt, q.explanation,
         q.points, q.sort_order, q.correct_text
    from public.assessment_questions q
   where public.is_admin();

revoke all on public.admin_assessment_choices   from anon;
revoke all on public.admin_assessment_questions from anon;
grant select on public.admin_assessment_choices   to authenticated;
grant select on public.admin_assessment_questions to authenticated;

comment on view public.admin_assessment_choices is
  'Admin-only read path for assessment_choices.is_correct, which is revoked from authenticated.';

-- ------------------------------------------------------------- attempts ----

alter table public.assessment_attempts enable row level security;

-- A learner sees only their own attempts (§39). Admins see all, which is what
-- the assessment-performance report is built on.
create policy attempts_select_own on public.assessment_attempts
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Attempts are opened by start_assessment_attempt(), which is definer, so no
-- INSERT policy is granted to learners - they cannot fabricate an attempt row
-- with a chosen attempt_number.
create policy attempts_admin on public.assessment_attempts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- The one thing a learner may change directly is abandoning their own attempt.
-- Scoring columns are pinned to their current values, so this update can never
-- be used to write a score - only submit_assessment_attempt() does that.
create policy attempts_abandon_own on public.assessment_attempts
  for update to authenticated
  using (user_id = auth.uid() and status = 'in_progress')
  with check (
    user_id = auth.uid()
    and status in ('in_progress', 'abandoned')
    and score is null
    and passed is null
    and percentage is null
  );

-- -------------------------------------------------------------- answers ----

alter table public.assessment_answers enable row level security;

create policy answers_select_own on public.assessment_answers
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.assessment_attempts t
       where t.id = attempt_id and t.user_id = auth.uid()
    )
  );

-- A learner may record and change answers only while their own attempt is
-- still open. Once submitted, the attempt is frozen: the USING clause stops
-- matching, so no further write is possible.
create policy answers_write_own_open_attempt on public.assessment_answers
  for insert to authenticated
  with check (
    exists (
      select 1 from public.assessment_attempts t
       where t.id = attempt_id and t.user_id = auth.uid() and t.status = 'in_progress'
    )
  );

create policy answers_update_own_open_attempt on public.assessment_answers
  for update to authenticated
  using (
    exists (
      select 1 from public.assessment_attempts t
       where t.id = attempt_id and t.user_id = auth.uid() and t.status = 'in_progress'
    )
  )
  with check (
    exists (
      select 1 from public.assessment_attempts t
       where t.id = attempt_id and t.user_id = auth.uid() and t.status = 'in_progress'
    )
  );

create policy answers_admin on public.assessment_answers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- is_correct / points_awarded are written only by the definer scoring
-- function, which runs as the owner and is unaffected by these grants.
--
-- As with the answer key above, the table-level right has to be dropped first:
-- a column-level REVOKE against a role holding table-wide INSERT/UPDATE
-- changes nothing. After this, a learner can write an answer but cannot mark
-- it correct - not on insert, and not on a later update.
revoke insert, update on public.assessment_answers from authenticated;

grant insert (attempt_id, question_id, choice_ids, text_answer, answered_at)
  on public.assessment_answers to authenticated;
grant update (choice_ids, text_answer, answered_at)
  on public.assessment_answers to authenticated;

-- ==================================== training, resources, reference ======
--
-- Uniform rule: published is readable by any active user; admins do everything.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  published_read_tables text[] := array[
    'training_activities',
    'practice_scenarios',
    'objections',
    'scripts',
    'wording_pairs',
    'quick_reference_items',
    'competencies'
  ];
begin
  foreach t in array published_read_tables loop
    execute format('alter table public.%I enable row level security', t);

    execute format($f$
      create policy %I on public.%I
        for select to authenticated
        using (public.is_admin() or (public.is_active_user() and status = 'published'))
    $f$, t || '_select', t);

    execute format($f$
      create policy %I on public.%I
        for all to authenticated
        using (public.is_admin()) with check (public.is_admin())
    $f$, t || '_admin', t);
  end loop;
end
$$;

-- Reference tables with no status column: readable by all, writable by admin.
do $$
declare
  t text;
  open_read_tables text[] := array[
    'competency_levels',
    'sales_bible_sections',
    'sales_bible_entries'
  ];
begin
  foreach t in array open_read_tables loop
    execute format('alter table public.%I enable row level security', t);
    execute format($f$
      create policy %I on public.%I
        for select to authenticated using (public.is_active_user())
    $f$, t || '_select', t);
    execute format($f$
      create policy %I on public.%I
        for all to authenticated
        using (public.is_admin()) with check (public.is_admin())
    $f$, t || '_admin', t);
  end loop;
end
$$;

alter table public.scenario_runs enable row level security;

create policy scenario_runs_own on public.scenario_runs
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy scenario_runs_insert_own on public.scenario_runs
  for insert to authenticated with check (user_id = auth.uid());

-- ------------------------------------------------------- user_competencies --

-- A learner may read their own competency ratings but never write one -
-- self-assessment would make the framework meaningless. Only admins rate.
alter table public.user_competencies enable row level security;

create policy user_competencies_select on public.user_competencies
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy user_competencies_admin on public.user_competencies
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ======================================= assignments, progress, favourites =

alter table public.assignments enable row level security;

create policy assignments_select_own on public.assignments
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Learners may move their own assignment forward (start it), but may not
-- create one, reassign it, or change its due date. Pinning the identity
-- columns in WITH CHECK is what prevents an assignment being retargeted.
create policy assignments_update_own on public.assignments
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    -- Qualify with the target table's name: a bare `id` would resolve to the
    -- subquery's own alias and match every row.
    and target_type = (select a.target_type from public.assignments a where a.id = assignments.id)
    and target_id   = (select a.target_id   from public.assignments a where a.id = assignments.id)
    and due_at      is not distinct from
        (select a.due_at from public.assignments a where a.id = assignments.id)
  );

create policy assignments_admin on public.assignments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- progress --

alter table public.module_progress enable row level security;

create policy module_progress_own on public.module_progress
  for all to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

alter table public.lesson_progress enable row level security;

create policy lesson_progress_own on public.lesson_progress
  for all to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- -------------------------------------------------------------- favourites --

alter table public.favorites enable row level security;

-- Strictly private: not even an admin needs to see what someone bookmarked.
create policy favorites_own on public.favorites
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ----------------------------------------------------------- notifications --

alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = auth.uid());

-- Marking as read is the only self-service change; the row is otherwise
-- immutable to its recipient.
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notifications_admin on public.notifications
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------- announcements --

alter table public.announcements enable row level security;

create policy announcements_select on public.announcements
  for select to authenticated
  using (
    public.is_admin()
    or (
      public.is_active_user()
      and status = 'published'
      and (published_at is null or published_at <= now())
      and (expires_at is null or expires_at > now())
      and (select p.role from public.profiles p where p.id = auth.uid()) = any (audience)
    )
  );

create policy announcements_admin on public.announcements
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------ activity log --

alter table public.activity_logs enable row level security;

-- Admin-only, read-only (§38). Writes go through log_activity(), which is
-- definer - so a learner's genuine actions are recorded while a learner's
-- client cannot insert a fabricated entry or read anyone's history.
create policy activity_logs_admin_select on public.activity_logs
  for select to authenticated using (public.is_admin());

create policy activity_logs_admin_write on public.activity_logs
  for insert to authenticated with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Function execution rights. Definer functions are the privileged paths in
-- this schema, so their EXECUTE grants are as much a part of the security
-- surface as the policies above.
-- ---------------------------------------------------------------------------
revoke execute on function public.submit_assessment_attempt(uuid) from public, anon;
revoke execute on function public.start_assessment_attempt(uuid)  from public, anon;
revoke execute on function public.log_activity(text, text, uuid, text, jsonb) from public, anon;
revoke execute on function public.touch_last_login() from public, anon;

grant execute on function public.submit_assessment_attempt(uuid) to authenticated;
grant execute on function public.start_assessment_attempt(uuid)  to authenticated;
grant execute on function public.log_activity(text, text, uuid, text, jsonb) to authenticated;
grant execute on function public.touch_last_login() to authenticated;
grant execute on function public.is_admin()        to authenticated;
grant execute on function public.is_active_user()  to authenticated;
