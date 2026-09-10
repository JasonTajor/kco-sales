-- ============================================================================
-- RLS and authorization test suite.
--
-- §67: "Test RLS policies. Do not assume they work."
--
-- Run against a database with all migrations applied:
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/rls.test.sql
--
-- The whole run happens inside a transaction that is rolled back at the end,
-- so it is safe against a seeded development database.
--
-- Impersonation works the way PostgREST does it: `set role authenticated`
-- plus a request.jwt.claim.sub GUC that auth.uid() reads. Tests must never
-- run as superuser, because superusers bypass RLS entirely and every
-- assertion would pass for the wrong reason.
-- ============================================================================

begin;

create or replace function pg_temp.ok(p_condition boolean, p_label text)
returns void language plpgsql as $$
begin
  if p_condition then
    raise notice '  PASS  %', p_label;
  else
    raise exception 'FAIL  %', p_label;
  end if;
end;
$$;

-- Asserts that a statement is rejected. Takes the SQL as text because the
-- point is to catch the error, which requires a savepoint the caller cannot
-- express inline.
create or replace function pg_temp.denied(p_sql text, p_label text)
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    raise notice '  PASS  % (%)', p_label, replace(split_part(sqlerrm, E'\n', 1), '%', '%%');
    return;
  end;
  raise exception 'FAIL  % - the statement was allowed but should have been denied', p_label;
end;
$$;

-- A write that RLS filters rather than rejects returns zero rows instead of
-- raising. This checks the row count, which is the honest test for UPDATE.
create or replace function pg_temp.affected_rows(p_sql text)
returns bigint language plpgsql as $$
declare n bigint;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ------------------------------------------------------------- fixtures ----

-- Signup is invitation-only (0011), so an invitation has to exist first.
-- This is the same path the application uses: an admin records who may join
-- and with what access, then the person signs up and the trigger consumes it.
do $$ begin
  perform pg_temp.denied(
    $q$insert into auth.users (id, email) values (gen_random_uuid(), 'stranger@kco.test')$q$,
    'signing up without an invitation is refused (§ invitation-only)');
end $$;

insert into public.invitations (email, full_name, role) values
  ('admin@kco.test',  'Ada Admin',  'admin'),
  ('sales@kco.test',  'Sam Sales',  'sales'),
  ('sales2@kco.test', 'Sol Sales',  'sales'),
  ('off@kco.test',    'Otto Off',   'sales');

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'admin@kco.test',  '{"full_name":"Ada Admin"}'),
  ('22222222-2222-2222-2222-222222222222', 'sales@kco.test',  '{"full_name":"Sam Sales"}'),
  ('33333333-3333-3333-3333-333333333333', 'sales2@kco.test', '{"full_name":"Sol Sales"}'),
  ('44444444-4444-4444-4444-444444444444', 'off@kco.test',    '{"full_name":"Otto Off"}');

do $$ begin
  perform pg_temp.ok(
    (select count(*) from public.profiles) = 4,
    'accepting an invitation creates the profile (incl. via OAuth)');

  perform pg_temp.ok(
    (select bool_and(accepted_at is not null) from public.invitations),
    'the invitation is consumed, so it cannot be reused');

  perform pg_temp.ok(
    (select role from public.profiles where email = 'admin@kco.test') = 'admin',
    'the role comes from the invitation, not from the person signing up');

  perform pg_temp.ok(
    (select bool_and(status = 'active') from public.profiles),
    'an invited account is active immediately - the admin already approved it');

  perform pg_temp.denied(
    $q$insert into auth.users (id, email) values (gen_random_uuid(), 'admin@kco.test')$q$,
    'a consumed invitation cannot be used a second time');
end $$;

-- Otto is deactivated later in the suite; set that up now.
update public.profiles set status = 'inactive'
  where id = '44444444-4444-4444-4444-444444444444';

insert into public.categories (id, slug, name) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'phone', 'Phone');

insert into public.modules (id, slug, title, category_id, status, published_at) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'published-mod', 'Published Module',
   'aaaaaaaa-0000-0000-0000-000000000001', 'published', now()),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'draft-mod', 'Draft Module',
   'aaaaaaaa-0000-0000-0000-000000000001', 'draft', null),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'admin-only-mod', 'Admin Only Module',
   'aaaaaaaa-0000-0000-0000-000000000001', 'published', now());

update public.modules set audience = array['admin']::public.user_role[]
  where id = 'bbbbbbbb-0000-0000-0000-000000000003';

insert into public.lessons (id, module_id, title, sort_order) values
  ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Lesson One', 0),
  ('cccccccc-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', 'Lesson Two', 1);

insert into public.assessments (id, slug, title, status, passing_score, published_at, attempts_allowed)
values ('dddddddd-0000-0000-0000-000000000001', 'quiz', 'Quiz', 'published', 80, now(), 2);

insert into public.assessment_questions (id, assessment_id, type, prompt, points, sort_order) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001',
   'multiple_choice', 'Pick B', 1, 0),
  ('eeeeeeee-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000001',
   'multiple_select', 'Pick A and C', 3, 1);

insert into public.assessment_choices (id, question_id, text, is_correct, sort_order) values
  ('ffffffff-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001', 'A', false, 0),
  ('ffffffff-0000-0000-0000-000000000002', 'eeeeeeee-0000-0000-0000-000000000001', 'B', true,  1),
  ('ffffffff-0000-0000-0000-000000000003', 'eeeeeeee-0000-0000-0000-000000000002', 'A', true,  0),
  ('ffffffff-0000-0000-0000-000000000004', 'eeeeeeee-0000-0000-0000-000000000002', 'B', false, 1),
  ('ffffffff-0000-0000-0000-000000000005', 'eeeeeeee-0000-0000-0000-000000000002', 'C', true,  2);

insert into public.activity_logs (actor_id, action, target_label)
values ('11111111-1111-1111-1111-111111111111', 'module.published', 'Published Module');

-- Give Ada a password-less identity marker used by nothing; kept out.

-- ===========================================================================
--  SALES USER
-- ===========================================================================
\echo ''
\echo '=== SALES (Sam) ==='

set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

do $$ begin
  perform pg_temp.ok(not public.is_admin(), 'is_admin() is false for a sales user');
  perform pg_temp.ok(public.is_active_user(), 'is_active_user() is true for an active sales user');
end $$;

-- ------------------------------------------------------------ content read --
do $$ begin
  perform pg_temp.ok(
    (select count(*) from public.modules) = 1,
    'sales sees only the published module aimed at their role (1 of 3)');

  perform pg_temp.ok(
    not exists (select 1 from public.modules where slug = 'draft-mod'),
    'sales cannot read a draft module');

  perform pg_temp.ok(
    not exists (select 1 from public.modules where slug = 'admin-only-mod'),
    'sales cannot read a published module whose audience excludes them');

  perform pg_temp.ok(
    (select count(*) from public.lessons) = 2,
    'sales reads the lessons of a visible module');
end $$;

-- ----------------------------------------------------------- content write --
do $$ begin
  perform pg_temp.ok(
    pg_temp.affected_rows(
      $q$update public.modules set title = 'Hacked' where slug = 'published-mod'$q$) = 0,
    'sales cannot update a module (§67)');

  perform pg_temp.denied(
    $q$insert into public.modules (slug, title) values ('evil','Evil')$q$,
    'sales cannot create a module');

  perform pg_temp.denied(
    $q$insert into public.assessments (slug, title) values ('evil-quiz','Evil')$q$,
    'sales cannot create an assessment (§67)');

  perform pg_temp.denied(
    $q$insert into public.lessons (module_id, title, sort_order)
       values ('bbbbbbbb-0000-0000-0000-000000000001','Evil',9)$q$,
    'sales cannot create a lesson');

  perform pg_temp.ok(
    pg_temp.affected_rows($q$delete from public.modules where slug = 'published-mod'$q$) = 0,
    'sales cannot delete a module');
end $$;

-- --------------------------------------------------------- the answer key --
do $$ begin
  perform pg_temp.denied(
    $q$select is_correct from public.assessment_choices limit 1$q$,
    'sales cannot read assessment_choices.is_correct (§17)');

  perform pg_temp.denied(
    $q$select correct_text from public.assessment_questions limit 1$q$,
    'sales cannot read assessment_questions.correct_text');

  perform pg_temp.denied(
    $q$select * from public.assessment_choices limit 1$q$,
    'select * on choices fails for sales - no query returns the key');

  perform pg_temp.ok(
    (select count(*) from public.assessment_choices) = 5,
    'sales can still read the choice text needed to answer');

  perform pg_temp.ok(
    (select count(*) from public.admin_assessment_choices) = 0,
    'the admin answer-key view returns nothing to a sales user');
end $$;

-- ------------------------------------------------------- self-promotion ----
do $$ begin
  -- These raise rather than filtering. USING decides which rows the UPDATE may
  -- touch (own row: yes), then WITH CHECK inspects the resulting row and
  -- rejects it outright. The louder failure is the better one here.
  perform pg_temp.denied(
    $q$update public.profiles set role = 'admin' where id = auth.uid()$q$,
    'sales cannot promote themselves to admin (§56)');

  -- Must be a value that differs from the current one: writing the same
  -- status back is a genuine no-op and correctly allowed.
  perform pg_temp.denied(
    $q$update public.profiles set status = 'pending' where id = auth.uid()$q$,
    'sales cannot change their own account status');

  perform pg_temp.ok(
    pg_temp.affected_rows(
      $q$update public.profiles set full_name = 'Sam Renamed' where id = auth.uid()$q$) = 1,
    'sales CAN edit their own display fields');

  perform pg_temp.ok(
    pg_temp.affected_rows(
      $q$update public.profiles set full_name = 'Nope'
         where id = '33333333-3333-3333-3333-333333333333'$q$) = 0,
    'sales cannot edit another user''s profile');

  perform pg_temp.denied(
    $q$select public.admin_set_user_role(auth.uid(), 'admin')$q$,
    'the role-change RPC refuses a non-admin caller');
end $$;

-- ------------------------------------------------------------ own progress --

/*
 * Opening a module.
 *
 * Tested because it was NOT, and shipped broken: an uncast enum in
 * touch_module_view's ON CONFLICT clause made every module open fail with
 * 42804. complete_lesson passed its own tests because plpgsql coerces on
 * assignment to a typed variable, so the gap was invisible.
 *
 * Called twice on purpose - the first insert and the conflicting update take
 * different code paths, and it was the update that was broken.
 */
do $$
declare v_state public.progress_state;
begin
  perform public.touch_module_view('bbbbbbbb-0000-0000-0000-000000000001');

  select state into v_state from public.module_progress
   where user_id = auth.uid() and module_id = 'bbbbbbbb-0000-0000-0000-000000000001';
  perform pg_temp.ok(v_state = 'in-progress',
    'opening a module records it as in-progress');

  -- The ON CONFLICT path.
  perform public.touch_module_view(
    'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001');

  perform pg_temp.ok(
    (select last_viewed_lesson_id from public.module_progress
      where user_id = auth.uid() and module_id = 'bbbbbbbb-0000-0000-0000-000000000001')
      = 'cccccccc-0000-0000-0000-000000000001',
    're-opening updates the last viewed lesson (ON CONFLICT path)');

  perform pg_temp.ok(
    (select count(*) from public.module_progress
      where user_id = auth.uid() and module_id = 'bbbbbbbb-0000-0000-0000-000000000001') = 1,
    'opening a module twice does not create a second progress row');
end $$;

do $$ begin
  perform public.complete_lesson('cccccccc-0000-0000-0000-000000000001');

  perform pg_temp.ok(
    (select completed from public.lesson_progress
      where user_id = auth.uid() and lesson_id = 'cccccccc-0000-0000-0000-000000000001'),
    'sales can record their own lesson progress');

  perform pg_temp.ok(
    (select state from public.module_progress
      where user_id = auth.uid() and module_id = 'bbbbbbbb-0000-0000-0000-000000000001')
      = 'in-progress',
    'the roll-up trigger moves the module to in-progress after one of two lessons');

  perform public.complete_lesson('cccccccc-0000-0000-0000-000000000002');

  perform pg_temp.ok(
    (select state from public.module_progress
      where user_id = auth.uid() and module_id = 'bbbbbbbb-0000-0000-0000-000000000001')
      = 'completed',
    'the module completes once every lesson is done');

  perform pg_temp.denied(
    $q$insert into public.lesson_progress (user_id, lesson_id, module_id, completed)
       values ('33333333-3333-3333-3333-333333333333',
               'cccccccc-0000-0000-0000-000000000001',
               'bbbbbbbb-0000-0000-0000-000000000001', true)$q$,
    'sales cannot write progress on behalf of another user');

  -- Re-opening a finished module must not demote it, which is the whole
  -- reason that CASE expression exists.
  perform public.touch_module_view('bbbbbbbb-0000-0000-0000-000000000001');
  perform pg_temp.ok(
    (select state from public.module_progress
      where user_id = auth.uid() and module_id = 'bbbbbbbb-0000-0000-0000-000000000001')
      = 'completed',
    'viewing a completed module does not reset it to in-progress');
end $$;

-- ------------------------------------------------------------- attempts ----
do $$
declare
  v_attempt public.assessment_attempts;
  v_other   uuid;
begin
  v_attempt := public.start_assessment_attempt('dddddddd-0000-0000-0000-000000000001');
  perform pg_temp.ok(v_attempt.attempt_number = 1, 'first attempt is numbered 1');

  -- Two of three questions right: 1 of 4 points -> 25%, below the 80% pass mark.
  insert into public.assessment_answers (attempt_id, question_id, choice_ids) values
    (v_attempt.id, 'eeeeeeee-0000-0000-0000-000000000001',
     array['ffffffff-0000-0000-0000-000000000002']::uuid[]),
    (v_attempt.id, 'eeeeeeee-0000-0000-0000-000000000002',
     array['ffffffff-0000-0000-0000-000000000003']::uuid[]);   -- partial: A only

  perform pg_temp.denied(
    format($q$update public.assessment_answers set is_correct = true where attempt_id = %L$q$,
           v_attempt.id),
    'sales cannot mark their own answer correct');

  -- The row is theirs, so USING admits it; WITH CHECK then rejects the new
  -- values because it pins the scoring columns to null.
  perform pg_temp.denied(
    format($q$update public.assessment_attempts set score = 100, passed = true where id = %L$q$,
      v_attempt.id),
    'sales cannot write their own score or pass flag');

  v_attempt := public.submit_assessment_attempt(v_attempt.id);

  perform pg_temp.ok(v_attempt.score = 1 and v_attempt.max_score = 4,
    'scoring awards the multiple-choice point and withholds partial multi-select credit');
  perform pg_temp.ok(v_attempt.percentage = 25.00, 'percentage computed as 25%');
  perform pg_temp.ok(v_attempt.passed = false, 'below the 80% passing score, so failed');

  perform pg_temp.denied(
    format($q$select public.submit_assessment_attempt(%L)$q$, v_attempt.id),
    'an attempt cannot be submitted twice');

  perform pg_temp.ok(
    pg_temp.affected_rows(format(
      $q$update public.assessment_answers set choice_ids = '{}' where attempt_id = %L$q$,
      v_attempt.id)) = 0,
    'answers are frozen once the attempt is submitted');
end $$;

-- --------------------------------------------------------- attempt review ---
do $$
declare
  v_open   uuid;
  v_closed uuid;
  v_rows   int;
begin
  -- The submitted attempt from the block above.
  select id into v_closed from public.assessment_attempts
   where user_id = auth.uid() and status = 'submitted' limit 1;

  perform pg_temp.ok(
    (select count(*) from public.attempt_review(v_closed)) = 2,
    'review returns one row per question of the assessment');

  perform pg_temp.ok(
    (select correct_choice_ids from public.attempt_review(v_closed)
      where prompt = 'Pick B')
      = array['ffffffff-0000-0000-0000-000000000002']::uuid[],
    'review reveals the answer key AFTER submission (§17)');

  perform pg_temp.ok(
    (select is_correct from public.attempt_review(v_closed) where prompt = 'Pick B'),
    'review reports the stored verdict for a correct answer');

  perform pg_temp.ok(
    not (select is_correct from public.attempt_review(v_closed) where prompt = 'Pick A and C'),
    'review reports a partial multi-select as incorrect');

  -- A second attempt, left open, must reveal nothing.
  v_open := (public.start_assessment_attempt('dddddddd-0000-0000-0000-000000000001')).id;

  perform pg_temp.denied(
    format($q$select * from public.attempt_review(%L)$q$, v_open),
    'review is refused while the attempt is still open (§17)');

  -- And someone else's submitted attempt stays closed.
  perform set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  perform pg_temp.denied(
    format($q$select * from public.attempt_review(%L)$q$, v_closed),
    'review is refused for another learner''s attempt');
  perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);

  -- save_answer runs as the caller, so RLS still governs it.
  perform pg_temp.denied(
    format($q$select public.save_answer(%L, 'eeeeeeee-0000-0000-0000-000000000001',
             array['ffffffff-0000-0000-0000-000000000002']::uuid[])$q$, v_closed),
    'save_answer cannot write into a submitted attempt');

  perform public.save_answer(v_open, 'eeeeeeee-0000-0000-0000-000000000001',
    array['ffffffff-0000-0000-0000-000000000001']::uuid[]);
  perform pg_temp.ok(
    (select count(*) from public.assessment_answers where attempt_id = v_open) = 1,
    'save_answer records an answer in an open attempt');

  -- Upsert, not duplicate: answering the same question again replaces it.
  perform public.save_answer(v_open, 'eeeeeeee-0000-0000-0000-000000000001',
    array['ffffffff-0000-0000-0000-000000000002']::uuid[]);
  perform pg_temp.ok(
    (select count(*) from public.assessment_answers where attempt_id = v_open) = 1,
    'answering a question twice updates rather than duplicating');

  -- Attempt limit: this assessment allows 2, and one is already submitted.
  perform public.submit_assessment_attempt(v_open);
  perform pg_temp.denied(
    $q$select public.start_assessment_attempt('dddddddd-0000-0000-0000-000000000001')$q$,
    'the attempts_allowed limit is enforced server-side');
end $$;

-- ------------------------------------------------ other people's results ---
do $$
declare v_other uuid;
begin
  -- Give the other learner an attempt, using a definer function so it exists
  -- without needing admin rights here.
  perform set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  v_other := (public.start_assessment_attempt('dddddddd-0000-0000-0000-000000000001')).id;
  perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);

  perform pg_temp.ok(
    not exists (select 1 from public.assessment_attempts where id = v_other),
    'sales cannot read another learner''s attempt (§39)');

  perform pg_temp.ok(
    (select count(*) from public.assessment_attempts) = 2,
    'the attempts table shows a learner only their own rows');
end $$;

-- ------------------------------------------------------------ admin areas --
do $$ begin
  perform pg_temp.ok(
    (select count(*) from public.activity_logs) = 0,
    'sales cannot read the activity log (§39)');

  perform pg_temp.denied(
    $q$select public.admin_dashboard_stats()$q$,
    'sales cannot call the admin dashboard RPC');

  perform pg_temp.ok(
    (select count(*) from public.report_training_completion()) = 0,
    'admin reports return no rows to a sales user');

  perform pg_temp.denied(
    $q$insert into public.assignments (user_id, target_type, target_id)
       values (auth.uid(), 'module', 'bbbbbbbb-0000-0000-0000-000000000001')$q$,
    'sales cannot assign training to themselves');

  perform pg_temp.denied(
    $q$select public.admin_assign(array[auth.uid()], 'module',
        'bbbbbbbb-0000-0000-0000-000000000001', null, '')$q$,
    'the bulk-assign RPC refuses a non-admin caller');

  perform pg_temp.denied(
    $q$insert into public.user_competencies (user_id, competency_id, level)
       values (auth.uid(), gen_random_uuid(), 5)$q$,
    'sales cannot rate their own competencies');
end $$;

-- ===========================================================================
--  DEACTIVATED USER
-- ===========================================================================
\echo ''
\echo '=== DEACTIVATED (Otto) ==='

set local request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';

do $$ begin
  perform pg_temp.ok(not public.is_active_user(), 'a deactivated account is not an active user');

  perform pg_temp.denied(
    $q$update public.profiles set status = 'active' where id = auth.uid()$q$,
    'a deactivated account cannot reinstate itself');
  perform pg_temp.ok(
    (select count(*) from public.modules) = 0,
    'a deactivated account reads no content at all');
  perform pg_temp.ok(
    (select count(*) from public.categories) = 0,
    'deactivation revokes access immediately, without deleting the auth user');
end $$;

-- ===========================================================================
--  ANONYMOUS
-- ===========================================================================
\echo ''
\echo '=== ANONYMOUS ==='

set local role anon;
set local request.jwt.claim.sub = '';

do $$ begin
  perform pg_temp.denied($q$select count(*) from public.modules$q$,
    'anon is denied at the privilege layer, before any policy runs');
  perform pg_temp.denied($q$select count(*) from public.profiles$q$,
    'anon cannot enumerate profiles');
  perform pg_temp.denied($q$select public.is_admin()$q$,
    'anon cannot execute helper functions');
  perform pg_temp.denied($q$select public.can('content.edit')$q$,
    'anon cannot execute the permission check');
end $$;

/*
 * EVERY table, not a hand-picked few.
 *
 * This exists because three tables were found readable by anon on a live
 * project: 0007's `revoke all ... from anon` is a point-in-time statement, and
 * Supabase default privileges re-granted anon access to the four tables
 * migration 0011 created afterwards. Naming tables individually is precisely
 * what missed it, so this iterates the catalog instead - a table added by a
 * future migration is covered the moment it exists.
 */
do $$
declare
  t record;
  leaked text[] := '{}';
begin
  for t in
    select tablename from pg_tables where schemaname = 'public' order by tablename
  loop
    begin
      execute format('select 1 from public.%I limit 1', t.tablename);
      -- No exception means anon holds SELECT on it.
      leaked := leaked || t.tablename;
    exception when insufficient_privilege then
      null;  -- denied, which is the point
    when others then
      -- Any other error also means anon did not get data out.
      null;
    end;
  end loop;

  perform pg_temp.ok(
    leaked = '{}',
    format('anon is denied SELECT on every table in public (%s tables checked)',
           (select count(*) from pg_tables where schemaname = 'public'))
  );

  if leaked <> '{}' then
    raise exception 'anon can read: %', array_to_string(leaked, ', ');
  end if;
end $$;

-- ===========================================================================
--  ADMIN
-- ===========================================================================
\echo ''
\echo '=== ADMIN (Ada) ==='

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

do $$ begin
  perform pg_temp.ok(public.is_admin(), 'is_admin() is true for an active admin');

  perform pg_temp.ok((select count(*) from public.modules) = 3,
    'admin sees drafts and every audience');

  perform pg_temp.ok(
    pg_temp.affected_rows(
      $q$update public.modules set title = 'Renamed' where slug = 'draft-mod'$q$) = 1,
    'admin can edit a module');

  perform pg_temp.ok(
    (select version from public.modules where slug = 'draft-mod') = 2,
    'the version trigger bumps on a title change (§58)');

  perform pg_temp.ok(
    (select count(*) from public.admin_assessment_choices where is_correct) = 3,
    'admin reads the answer key through the definer view');

  perform pg_temp.ok((select count(*) from public.activity_logs) >= 1,
    'admin can read the activity log');

  perform pg_temp.ok(
    (select count(*) from public.assessment_attempts) = 3,
    'admin sees every learner''s attempts for reporting');

  perform pg_temp.ok(
    (public.admin_dashboard_stats() ->> 'published_modules')::int = 2,
    'the admin dashboard RPC returns real counts');

  perform pg_temp.ok(
    (select count(*) from public.report_training_completion()) = 3,
    'the completion report covers every sales user, deactivated included');

  -- Two modules are published at this point (draft-mod is still a draft) and
  -- Sam finished one. The report runs SECURITY DEFINER, so its denominator is
  -- every published module, not just the ones the caller could read.
  perform pg_temp.ok(
    (select completion_percent from public.report_training_completion()
      where full_name = 'Sam Renamed') = 50.0,
    'completion is measured against all published modules (1 of 2)');
end $$;

-- ------------------------------------------------------ publish metadata ---
do $$ begin
  perform pg_temp.denied(
    $q$insert into public.modules (slug, title, status) values ('bad','Bad','published')$q$,
    'a module cannot be published without a published_at timestamp');

  update public.modules set status = 'published' where slug = 'draft-mod';
  perform pg_temp.ok(
    (select published_at is not null and published_by = auth.uid()
       from public.modules where slug = 'draft-mod'),
    'publishing stamps published_at and published_by automatically');
end $$;

-- -------------------------------------------------- assessment authoring ---
do $$
declare v_q uuid;
begin
  v_q := public.admin_save_question(
    'dddddddd-0000-0000-0000-000000000001', null, 'multiple_choice',
    'New question', 'Because.', 2, 5, null,
    '[{"text":"Wrong","is_correct":false},{"text":"Right","is_correct":true}]'::jsonb);

  perform pg_temp.ok(
    (select count(*) from public.assessment_choices where question_id = v_q) = 2,
    'admin_save_question writes the question and its choices atomically');

  perform pg_temp.denied(
    format($q$select public.admin_save_question(
      'dddddddd-0000-0000-0000-000000000001', %L, 'multiple_choice',
      'Broken', '', 1, 6, null,
      '[{"text":"A","is_correct":true},{"text":"B","is_correct":true}]'::jsonb)$q$, v_q),
    'a multiple-choice question with two correct answers is rejected');

  perform pg_temp.ok(
    (select count(*) from public.assessment_choices where question_id = v_q) = 2,
    'the rejected save rolled back - the original choices are intact');

  perform pg_temp.denied(
    $q$insert into public.assessment_questions (assessment_id, type, prompt, sort_order)
       values ('dddddddd-0000-0000-0000-000000000001','short_answer','No key?',9)$q$,
    'a short-answer question without an answer key is rejected');
end $$;

-- --------------------------------------------------------- admin guards ----
do $$ begin
  perform pg_temp.denied(
    $q$select public.admin_set_user_role('11111111-1111-1111-1111-111111111111', 'sales')$q$,
    'the last active admin cannot be demoted');

  perform pg_temp.denied(
    $q$select public.admin_set_user_status('11111111-1111-1111-1111-111111111111', 'inactive')$q$,
    'the last active admin cannot be deactivated');

  perform pg_temp.ok(
    public.admin_assign(
      array['22222222-2222-2222-2222-222222222222',
            '33333333-3333-3333-3333-333333333333']::uuid[],
      'module', 'bbbbbbbb-0000-0000-0000-000000000001',
      now() + interval '7 days', 'Please finish') = 2,
    'bulk assignment reaches both learners');

  perform pg_temp.ok(
    (select count(*) from public.notifications where kind = 'assignment') = 2,
    'assigning notifies every recipient in the same transaction');

  perform pg_temp.denied(
    $q$insert into public.assignments (user_id, target_type, target_id)
       values ('22222222-2222-2222-2222-222222222222','module', gen_random_uuid())$q$,
    'an assignment cannot point at a target that does not exist');
end $$;

-- ------------------------------------------------------------- favourites --
-- ===========================================================================
--  PERMISSIONS (RBAC)
-- ===========================================================================
\echo ''
\echo '=== PERMISSIONS ==='

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

do $$ begin
  perform pg_temp.ok(public.can('content.edit'),
    'an admin holds every permission by role default');
  perform pg_temp.ok(
    (select count(*) from public.my_permissions()) = (select count(*) from public.permissions),
    'my_permissions() lists the full catalogue for an admin');

  -- Grant a single content permission to a sales user.
  perform public.admin_set_permission(
    '22222222-2222-2222-2222-222222222222', 'content.edit', true, 'trial');
end $$;

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

do $$ begin
  perform pg_temp.ok(public.can('content.edit'),
    'a granted permission reaches a sales user');
  perform pg_temp.ok(not public.can('content.create'),
    'granting one permission does not grant its neighbours');
  perform pg_temp.ok(not public.is_admin(),
    'a permission does not make somebody an admin');

  perform pg_temp.ok(
    pg_temp.affected_rows(
      $q$update public.modules set description = 'edited by permission'
          where slug = 'published-mod'$q$) = 1,
    'content.edit genuinely lets a sales user edit a module');

  perform pg_temp.denied(
    $q$insert into public.modules (slug, title) values ('nope','Nope')$q$,
    'without content.create they still cannot create one');

  perform pg_temp.ok(
    (select count(*) from public.activity_logs) = 0,
    'content.edit does not leak the activity log');

  perform pg_temp.denied(
    $q$select public.admin_set_permission(auth.uid(), 'users.permissions', true)$q$,
    'a sales user cannot grant themselves permission management');
end $$;

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

do $$ begin
  -- Revoke a permission the role grants: the explicit false must win.
  perform public.admin_set_permission(
    '11111111-1111-1111-1111-111111111111', 'logs.view', false, 'test');
  perform pg_temp.ok(not public.can('logs.view'),
    'an explicit revoke overrides the role default');
  perform pg_temp.ok(
    (select count(*) from public.activity_logs) = 0,
    'the revoke takes effect in RLS immediately');

  -- Clearing the override restores the default.
  perform public.admin_set_permission('11111111-1111-1111-1111-111111111111', 'logs.view', null);
  perform pg_temp.ok(public.can('logs.view'),
    'clearing an override falls back to the role default');

  perform pg_temp.denied(
    $q$select public.admin_set_permission(
        '11111111-1111-1111-1111-111111111111', 'users.permissions', false)$q$,
    'the last permission-manager cannot revoke their own permission management');

  perform pg_temp.denied(
    $q$select public.admin_set_permission(auth.uid(), 'not.areal_permission', true)$q$,
    'an unknown permission key is rejected');
end $$;

-- ------------------------------------------------------------- invitations --
do $$
declare v_id uuid;
begin
  v_id := public.admin_invite_user('new.hire@kco.test', 'New Hire', 'sales',
            'Chat Support', 'Chat Support Agent', array['content.view_drafts'], 'starts Monday');

  perform pg_temp.ok(
    (select permissions from public.invitations where id = v_id)
      = array['content.view_drafts']::text[],
    'an invitation records the access the admin chose');

  perform pg_temp.ok(public.invitation_exists('NEW.HIRE@kco.test'),
    'invitation lookup is case-insensitive');

  perform pg_temp.denied(
    $q$select public.admin_invite_user('sales@kco.test')$q$,
    'inviting somebody who already has an account is refused');
end $$;

/*
 * Accepting an invitation.
 *
 * The insert into auth.users has to run without the `authenticated` role: in a
 * real project GoTrue writes that row as a privileged role, and `authenticated`
 * has no rights on the auth schema at all. Dropping the role here reproduces
 * how the signup actually happens rather than testing a path nobody uses.
 */
reset role;
insert into auth.users (id, email) values
  ('55555555-5555-5555-5555-555555555555', 'new.hire@kco.test');
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

do $$ begin
  perform pg_temp.ok(
    (select department from public.profiles
      where id = '55555555-5555-5555-5555-555555555555') = 'Chat Support',
    'the department from the invitation is applied');

  perform pg_temp.ok(
    (select granted from public.user_permissions
      where user_id = '55555555-5555-5555-5555-555555555555'
        and permission_key = 'content.view_drafts'),
    'the invitation''s chosen permissions are granted on acceptance');

  perform pg_temp.ok(not public.invitation_exists('new.hire@kco.test'),
    'an accepted invitation is no longer usable');
end $$;

do $$
declare v_id uuid;
begin
  v_id := public.admin_invite_user('revoke.me@kco.test');
  perform public.admin_revoke_invitation(v_id);
  perform pg_temp.ok(not public.invitation_exists('revoke.me@kco.test'),
    'a revoked invitation is no longer usable');
end $$;

reset role;
do $$ begin
  perform pg_temp.denied(
    $q$insert into auth.users (id, email)
       values (gen_random_uuid(), 'revoke.me@kco.test')$q$,
    'signing up against a revoked invitation is refused');
end $$;
set local role authenticated;

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$ begin
  perform pg_temp.denied(
    $q$select public.admin_invite_user('sneaky@kco.test')$q$,
    'a sales user cannot invite anybody');
  perform pg_temp.ok(
    (select count(*) from public.invitations) = 0,
    'a sales user cannot even read the invitation list');
end $$;

-- ===========================================================================
--  EVERY REMAINING RPC
--
--  Not for their authorization rules - those are covered above - but simply to
--  execute them. touch_module_view shipped with an uncast enum that failed on
--  every call, and no test had ever invoked it. A function that compiles is not
--  a function that runs.
-- ===========================================================================
\echo ''
\echo '=== RPC SMOKE ==='

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

do $$
declare
  v jsonb;
  v_status public.assignment_status;
begin
  -- A learner's own dashboard roll-up.
  v := public.my_progress_summary();
  perform pg_temp.ok(v ? 'modules_total' and v ? 'avg_score',
    'my_progress_summary returns the keys the dashboard reads');
  perform pg_temp.ok((v ->> 'modules_completed')::int >= 1,
    'my_progress_summary counts the module completed earlier in this run');

  -- Records the sign-in timestamp.
  perform public.touch_last_login();
  perform pg_temp.ok(
    (select last_login_at is not null from public.profiles where id = auth.uid()),
    'touch_last_login stamps the caller''s own profile');

  -- Audit write. Definer, so a learner's genuine action is recorded even
  -- though they cannot insert into activity_logs directly.
  perform public.log_activity('material.viewed', 'module',
    'bbbbbbbb-0000-0000-0000-000000000001', 'Published Module');
  perform pg_temp.ok(true, 'log_activity accepts a write from a sales user');

  -- Overdue is derived, not stored.
  v_status := public.assignment_effective_status('not-started', now() - interval '1 day');
  perform pg_temp.ok(v_status = 'overdue',
    'assignment_effective_status derives overdue from a past due date');
  v_status := public.assignment_effective_status('completed', now() - interval '1 day');
  perform pg_temp.ok(v_status = 'completed',
    'a completed assignment is never reported as overdue');
end $$;

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

do $$ begin
  -- The learner's log_activity call above must be visible to an admin.
  perform pg_temp.ok(
    exists (select 1 from public.activity_logs
             where action = 'material.viewed'
               and actor_id = '22222222-2222-2222-2222-222222222222'),
    'log_activity stamped the real actor, not the definer');

  perform pg_temp.ok(
    (select count(*) from public.report_assessment_performance()) >= 1,
    'report_assessment_performance runs and returns the assessment');

  perform pg_temp.ok(
    (select count(*) from public.report_module_engagement()) >= 1,
    'report_module_engagement runs and returns the modules');

  perform pg_temp.ok(
    (select avg_score from public.report_assessment_performance() limit 1) is not null,
    'assessment performance reports a score rather than null');
end $$;

-- ===========================================================================
--  USERNAME ACCOUNTS (0014)
-- ===========================================================================
\echo ''
\echo '=== USERNAME ACCOUNTS ==='

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

do $$
declare
  v_id    uuid;
  v_email text;
begin
  select invitation_id, login_email into v_id, v_email
    from public.admin_create_account(
      'andrea.lopez', 'Andrea Lopez', 'sales', 'Chat Support', 'Chat Support Agent',
      array['content.view_drafts'], null, 'starts Monday');

  perform pg_temp.ok(v_email = 'andrea.lopez@kco.local',
    'a username maps to the internal login address');

  perform pg_temp.ok(
    (select username from public.invitations where id = v_id) = 'andrea.lopez',
    'the pending account records the username');

  -- Format is enforced in the database, not only in the form.
  perform pg_temp.denied(
    $q$select public.admin_create_account('ab')$q$,
    'a username shorter than 3 characters is refused');
  perform pg_temp.denied(
    $q$select public.admin_create_account('Andrea Lopez')$q$,
    'a username with spaces or capitals is refused');
  perform pg_temp.denied(
    $q$select public.admin_create_account('has@at.sign')$q$,
    'a username containing @ is refused');

  /*
   * Calling again for the same username supersedes the pending record rather
   * than erroring. That is deliberate: the signup happens seconds after this
   * call, so a lingering pending record means the signup failed - and an admin
   * retrying must not be blocked by their own half-finished attempt.
   *
   * Only one pending record may exist, which the partial unique index
   * enforces; duplicate protection against a *real* account is the profiles
   * check, asserted below once the account exists.
   */
  -- A separate username, so this does not clobber the permissions asserted
  -- against andrea.lopez further down.
  perform public.admin_create_account('retry.me', 'First Attempt');
  perform public.admin_create_account('retry.me', 'Second Attempt');

  perform pg_temp.ok(
    (select count(*) from public.invitations
      where username = 'retry.me' and accepted_at is null and revoked_at is null) = 1,
    'retrying supersedes the pending record rather than stacking a second');

  perform pg_temp.ok(
    (select count(*) from public.invitations
      where username = 'retry.me' and revoked_at is not null) = 1,
    'the superseded record is marked revoked, not deleted');

  perform pg_temp.ok(
    (select full_name from public.invitations
      where username = 'retry.me' and revoked_at is null) = 'Second Attempt',
    'the surviving record is the most recent attempt');
end $$;

/*
 * The signup that consumes it. Runs without the `authenticated` role because
 * GoTrue writes auth.users as a privileged role.
 */
reset role;
insert into auth.users (id, email) values
  ('66666666-6666-6666-6666-666666666666', 'andrea.lopez@kco.local');
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

do $$ begin
  perform pg_temp.ok(
    (select username from public.profiles
      where id = '66666666-6666-6666-6666-666666666666') = 'andrea.lopez',
    'the username lands on the profile');

  perform pg_temp.ok(
    (select status from public.profiles
      where id = '66666666-6666-6666-6666-666666666666') = 'active',
    'the account is active immediately - no acceptance step');

  perform pg_temp.ok(
    (select granted from public.user_permissions
      where user_id = '66666666-6666-6666-6666-666666666666'
        and permission_key = 'content.view_drafts'),
    'the chosen permissions are applied on creation');

  perform pg_temp.ok(
    (select department from public.profiles
      where id = '66666666-6666-6666-6666-666666666666') = 'Chat Support',
    'the team from the form is applied');

  -- The username must be unique across accounts, case-insensitively.
  perform pg_temp.denied(
    $q$select public.admin_create_account('ANDREA.LOPEZ')$q$,
    'usernames are unique regardless of capitalisation');
end $$;

-- A pending account can be withdrawn so the username is reusable.
do $$
declare v_id uuid;
begin
  select invitation_id into v_id from public.admin_create_account('temp.user');
  perform public.admin_discard_pending_account(v_id);
  perform pg_temp.ok(
    not exists (select 1 from public.invitations where id = v_id),
    'a pending account can be withdrawn, freeing the username');
  perform pg_temp.ok(
    (select login_email from public.admin_create_account('temp.user')) = 'temp.user@kco.local',
    'the freed username can be used again straight away');
end $$;

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$ begin
  perform pg_temp.denied(
    $q$select public.admin_create_account('sneaky.user')$q$,
    'a sales user cannot create an account');
end $$;

\echo ''
\echo '=== PRIVACY ==='

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.favorites (user_id, target_type, target_id)
  values (auth.uid(), 'module', 'bbbbbbbb-0000-0000-0000-000000000001');

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
do $$ begin
  perform pg_temp.ok(
    (select count(*) from public.favorites) = 0,
    'favourites are private even from an admin');
end $$;

\echo ''
\echo '=== ALL TESTS PASSED ==='

rollback;
