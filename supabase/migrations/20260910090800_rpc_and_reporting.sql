-- ============================================================================
-- 0009 - Remote procedures.
--
-- Two kinds of thing live here:
--   1. Writes that must be atomic or must run with elevated rights.
--   2. Aggregates that would otherwise mean shipping every row to the browser
--      and reducing it in React (§28: "Do not calculate everything only in
--      React"). A dashboard tile should cost one round trip, not a table scan
--      over the network.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Saves a question and its choices as one unit.
--
-- The builder's UI edits a question and its options together, so they must
-- commit together: a question that lands without its choices is unanswerable,
-- and half-written choices would fail validate_question_choices() later at
-- an unhelpful moment. Deleting and re-inserting the choices is deliberate -
-- it keeps sort_order contiguous without a diffing algorithm on the client.
-- ---------------------------------------------------------------------------
create or replace function public.admin_save_question(
  p_assessment_id uuid,
  p_question_id   uuid,          -- null to create
  p_type          public.question_type,
  p_prompt        text,
  p_explanation   text,
  p_points        int,
  p_sort_order    int,
  p_correct_text  text,          -- short_answer only
  p_choices       jsonb          -- [{ text, is_correct }] in display order
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_choice jsonb;
  v_i int := 0;
begin
  if not public.is_admin() then
    raise exception 'Only an admin may edit assessment questions';
  end if;

  if p_question_id is null then
    insert into public.assessment_questions
      (assessment_id, type, prompt, explanation, points, sort_order, correct_text)
    values
      (p_assessment_id, p_type, p_prompt, coalesce(p_explanation,''), coalesce(p_points,1),
       coalesce(p_sort_order,0), case when p_type = 'short_answer' then p_correct_text end)
    returning id into v_id;
  else
    update public.assessment_questions
       set type = p_type,
           prompt = p_prompt,
           explanation = coalesce(p_explanation,''),
           points = coalesce(p_points,1),
           sort_order = coalesce(p_sort_order, sort_order),
           correct_text = case when p_type = 'short_answer' then p_correct_text end
     where id = p_question_id and assessment_id = p_assessment_id
     returning id into v_id;

    if v_id is null then
      raise exception 'Question % does not belong to assessment %', p_question_id, p_assessment_id;
    end if;

    delete from public.assessment_choices where question_id = v_id;
  end if;

  if p_type <> 'short_answer' then
    for v_choice in select * from jsonb_array_elements(coalesce(p_choices, '[]'::jsonb))
    loop
      insert into public.assessment_choices (question_id, text, is_correct, sort_order)
      values (
        v_id,
        v_choice ->> 'text',
        coalesce((v_choice ->> 'is_correct')::boolean, false),
        v_i
      );
      v_i := v_i + 1;
    end loop;

    -- Raises if the shape is wrong, rolling the whole call back.
    perform public.validate_question_choices(v_id);
  end if;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Bulk assignment (§27). One call for "assign to all sales users" instead of
-- N inserts from the browser, and it fans out the notifications in the same
-- transaction so nobody is assigned work they are never told about.
-- ---------------------------------------------------------------------------
create or replace function public.admin_assign(
  p_user_ids    uuid[],
  p_target_type public.assignment_target,
  p_target_id   uuid,
  p_due_at      timestamptz default null,
  p_note        text default ''
) returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int;
  v_label text;
begin
  if not public.is_admin() then
    raise exception 'Only an admin may assign training';
  end if;

  select case p_target_type
    when 'module'     then (select title from public.modules             where id = p_target_id)
    when 'path'       then (select title from public.learning_paths      where id = p_target_id)
    when 'assessment' then (select title from public.assessments         where id = p_target_id)
    when 'activity'   then (select title from public.training_activities where id = p_target_id)
  end into v_label;

  if v_label is null then
    raise exception 'No % exists with id %', p_target_type, p_target_id;
  end if;

  with upserted as (
    insert into public.assignments (user_id, target_type, target_id, assigned_by, due_at, note)
    select uid, p_target_type, p_target_id, auth.uid(), p_due_at, coalesce(p_note,'')
      from unnest(p_user_ids) as uid
    -- Re-assigning refreshes the deadline rather than erroring or duplicating.
    on conflict (user_id, target_type, target_id) do update
      set due_at = excluded.due_at,
          note = excluded.note,
          assigned_by = excluded.assigned_by,
          assigned_at = now()
    returning user_id
  )
  select count(*) into v_count from upserted;

  insert into public.notifications (user_id, kind, title, body)
  select uid, 'assignment', 'New training assigned', v_label
    from unnest(p_user_ids) as uid;

  perform public.log_activity(
    'assignment.created', p_target_type::text, p_target_id, v_label,
    jsonb_build_object('recipients', coalesce(array_length(p_user_ids, 1), 0))
  );

  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Role and status changes.
--
-- Routed through a function rather than a plain UPDATE so that (a) the last
-- admin cannot be demoted or deactivated, locking everyone out of the console,
-- and (b) every change is audited without relying on the caller to log it.
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_user_role(
  p_user_id uuid,
  p_role    public.user_role
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admins int;
  v_current public.user_role;
  v_name text;
begin
  if not public.is_admin() then
    raise exception 'Only an admin may change roles';
  end if;

  select role, full_name into v_current, v_name from public.profiles where id = p_user_id;
  if v_current is null then
    raise exception 'No such user';
  end if;

  if v_current = 'admin' and p_role <> 'admin' then
    select count(*) into v_admins
      from public.profiles where role = 'admin' and status = 'active';
    if v_admins <= 1 then
      raise exception 'Cannot remove the last active admin';
    end if;
  end if;

  update public.profiles set role = p_role where id = p_user_id;

  perform public.log_activity('user.role_changed', 'profile', p_user_id, v_name,
    jsonb_build_object('from', v_current, 'to', p_role));
end;
$$;

create or replace function public.admin_set_user_status(
  p_user_id uuid,
  p_status  public.user_status
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admins int;
  v_name text;
  v_role public.user_role;
begin
  if not public.is_admin() then
    raise exception 'Only an admin may change account status';
  end if;

  select full_name, role into v_name, v_role from public.profiles where id = p_user_id;
  if v_name is null then
    raise exception 'No such user';
  end if;

  if v_role = 'admin' and p_status <> 'active' then
    select count(*) into v_admins from public.profiles where role = 'admin' and status = 'active';
    if v_admins <= 1 then
      raise exception 'Cannot deactivate the last active admin';
    end if;
  end if;

  update public.profiles set status = p_status where id = p_user_id;

  perform public.log_activity('user.status_changed', 'profile', p_user_id, v_name,
    jsonb_build_object('to', p_status));
end;
$$;

-- ---------------------------------------------------------------------------
-- Marks a lesson complete. Thin, but it exists so the client never has to know
-- the module_id or the upsert conflict target, and so the roll-up trigger is
-- guaranteed to fire through one code path.
-- ---------------------------------------------------------------------------
create or replace function public.complete_lesson(p_lesson_id uuid, p_completed boolean default true)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_module uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select module_id into v_module from public.lessons where id = p_lesson_id;
  if v_module is null then
    raise exception 'No such lesson';
  end if;

  insert into public.lesson_progress (user_id, lesson_id, module_id, completed, completed_at)
  values (auth.uid(), p_lesson_id, v_module, p_completed,
          case when p_completed then now() end)
  on conflict (user_id, lesson_id) do update
    set completed = p_completed,
        completed_at = case when p_completed then coalesce(lesson_progress.completed_at, now()) end;
end;
$$;

-- Records that a module was opened, so "Continue learning" has something to
-- point at before any lesson is finished.
create or replace function public.touch_module_view(p_module_id uuid, p_lesson_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then return; end if;

  insert into public.module_progress as mp
    (user_id, module_id, state, started_at, last_viewed_at, last_viewed_lesson_id)
  values (auth.uid(), p_module_id, 'in-progress', now(), now(), p_lesson_id)
  on conflict (user_id, module_id) do update
    set last_viewed_at = now(),
        last_viewed_lesson_id = coalesce(p_lesson_id, mp.last_viewed_lesson_id),
        started_at = coalesce(mp.started_at, now()),
        -- Viewing must never downgrade a finished module back to in-progress.
        state = case when mp.state = 'completed' then 'completed' else 'in-progress' end;
end;
$$;

-- ===========================================================================
-- Reporting
-- ===========================================================================

-- Admin dashboard tiles (§30) in a single round trip. Returns zeros rather
-- than nulls on an empty database so the UI can distinguish "no data yet"
-- from "query failed".
create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  select jsonb_build_object(
    'sales_users',        (select count(*) from public.profiles where role = 'sales'),
    'active_users',       (select count(*) from public.profiles where status = 'active'),
    'pending_users',      (select count(*) from public.profiles where status = 'pending'),
    'published_modules',  (select count(*) from public.modules where status = 'published'),
    'draft_modules',      (select count(*) from public.modules where status = 'draft'),
    'active_paths',       (select count(*) from public.learning_paths where status = 'published'),
    'published_assessments', (select count(*) from public.assessments where status = 'published'),
    'pending_assignments',(select count(*) from public.assignments where status <> 'completed'),
    'overdue_assignments',(select count(*) from public.assignments
                            where status <> 'completed' and due_at is not null and due_at < now()),
    'avg_completion',     coalesce((
        -- Completion is measured per learner across published modules, so a
        -- newly published module correctly drags the average down.
        select round(avg(pct), 1) from (
          select p.id,
                 case when total.n = 0 then 0
                      else (count(mp.*) filter (where mp.state = 'completed')::numeric / total.n) * 100
                 end as pct
            from public.profiles p
            cross join (select count(*) as n from public.modules where status = 'published') total
            left join public.module_progress mp on mp.user_id = p.id
           where p.role = 'sales' and p.status = 'active'
           group by p.id, total.n
        ) per_user
      ), 0),
    'avg_assessment_score', coalesce((
        select round(avg(percentage), 1) from public.assessment_attempts where status = 'submitted'
      ), 0),
    'pass_rate', coalesce((
        select round(100.0 * count(*) filter (where passed) / nullif(count(*), 0), 1)
          from public.assessment_attempts where status = 'submitted'
      ), 0),
    'attempts_last_30d', (
        select count(*) from public.assessment_attempts
         where status = 'submitted' and submitted_at > now() - interval '30 days'
      ),
    'lessons_completed_last_7d', (
        select count(*) from public.lesson_progress
         where completed and completed_at > now() - interval '7 days'
      )
  ) into v;

  return v;
end;
$$;

-- Per-learner training completion (§31). One row per active sales user.
create or replace function public.report_training_completion()
returns table (
  user_id uuid,
  full_name text,
  department text,
  -- Included rather than filtered on: a deactivated employee's training record
  -- is still part of the history, and hiding the row would silently change the
  -- denominator of any average taken over this report. The admin table filters.
  status public.user_status,
  modules_completed bigint,
  modules_in_progress bigint,
  modules_total bigint,
  completion_percent numeric,
  assessments_taken bigint,
  avg_score numeric
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    p.id,
    p.full_name,
    coalesce(p.department, ''),
    p.status,
    count(mp.*) filter (where mp.state = 'completed'),
    count(mp.*) filter (where mp.state = 'in-progress'),
    total.n,
    case when total.n = 0 then 0
         else round((count(mp.*) filter (where mp.state = 'completed')::numeric / total.n) * 100, 1)
    end,
    (select count(*) from public.assessment_attempts a
      where a.user_id = p.id and a.status = 'submitted'),
    coalesce((select round(avg(a.percentage), 1) from public.assessment_attempts a
      where a.user_id = p.id and a.status = 'submitted'), 0)
  from public.profiles p
  cross join (select count(*) as n from public.modules where status = 'published') total
  left join public.module_progress mp on mp.user_id = p.id
  where public.is_admin() and p.role = 'sales'
  group by p.id, p.full_name, p.department, p.status, total.n
  order by p.full_name;
$$;

-- Per-assessment performance (§31).
create or replace function public.report_assessment_performance()
returns table (
  assessment_id uuid,
  title text,
  attempts bigint,
  unique_takers bigint,
  avg_score numeric,
  pass_rate numeric,
  passing_score int
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    a.id,
    a.title,
    count(t.*),
    count(distinct t.user_id),
    coalesce(round(avg(t.percentage), 1), 0),
    coalesce(round(100.0 * count(*) filter (where t.passed) / nullif(count(t.*), 0), 1), 0),
    a.passing_score
  from public.assessments a
  left join public.assessment_attempts t
    on t.assessment_id = a.id and t.status = 'submitted'
  where public.is_admin()
  group by a.id, a.title, a.passing_score
  order by a.title;
$$;

-- Engagement per module: what gets opened, what gets finished, what stalls.
create or replace function public.report_module_engagement()
returns table (
  module_id uuid,
  title text,
  status public.content_status,
  learners_started bigint,
  learners_completed bigint,
  completion_percent numeric
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    m.id,
    m.title,
    m.status,
    count(mp.*) filter (where mp.state <> 'not-started'),
    count(mp.*) filter (where mp.state = 'completed'),
    coalesce(round(
      100.0 * count(mp.*) filter (where mp.state = 'completed')
      / nullif(count(mp.*) filter (where mp.state <> 'not-started'), 0), 1), 0)
  from public.modules m
  left join public.module_progress mp on mp.module_id = m.id
  where public.is_admin()
  group by m.id, m.title, m.status
  order by m.title;
$$;

-- The learner's own dashboard roll-up, mirroring admin_dashboard_stats().
create or replace function public.my_progress_summary()
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'modules_total',     (select count(*) from public.modules where status = 'published'),
    'modules_completed', (select count(*) from public.module_progress
                           where user_id = auth.uid() and state = 'completed'),
    'modules_in_progress',(select count(*) from public.module_progress
                           where user_id = auth.uid() and state = 'in-progress'),
    'lessons_completed', (select count(*) from public.lesson_progress
                           where user_id = auth.uid() and completed),
    'assignments_open',  (select count(*) from public.assignments
                           where user_id = auth.uid() and status <> 'completed'),
    'assignments_overdue',(select count(*) from public.assignments
                           where user_id = auth.uid() and status <> 'completed'
                             and due_at is not null and due_at < now()),
    'attempts',          (select count(*) from public.assessment_attempts
                           where user_id = auth.uid() and status = 'submitted'),
    'avg_score',         coalesce((select round(avg(percentage),1) from public.assessment_attempts
                           where user_id = auth.uid() and status = 'submitted'), 0),
    'passed',            (select count(*) from public.assessment_attempts
                           where user_id = auth.uid() and status = 'submitted' and passed)
  );
$$;

-- --------------------------------------------------------------- grants ----

-- Same reasoning as 0007: strip the implicit PUBLIC grant, then hand EXECUTE
-- back to `authenticated` one function at a time. Anything omitted below is
-- reachable only from inside another definer function or a trigger.
revoke execute on all functions in schema public from public, anon;

grant execute on function public.admin_save_question(uuid, uuid, public.question_type, text, text, int, int, text, jsonb) to authenticated;
grant execute on function public.admin_assign(uuid[], public.assignment_target, uuid, timestamptz, text) to authenticated;
grant execute on function public.admin_set_user_role(uuid, public.user_role) to authenticated;
grant execute on function public.admin_set_user_status(uuid, public.user_status) to authenticated;
grant execute on function public.complete_lesson(uuid, boolean) to authenticated;
grant execute on function public.touch_module_view(uuid, uuid) to authenticated;
grant execute on function public.admin_dashboard_stats() to authenticated;
grant execute on function public.report_training_completion() to authenticated;
grant execute on function public.report_assessment_performance() to authenticated;
grant execute on function public.report_module_engagement() to authenticated;
grant execute on function public.my_progress_summary() to authenticated;
grant execute on function public.submit_assessment_attempt(uuid) to authenticated;
grant execute on function public.start_assessment_attempt(uuid) to authenticated;
grant execute on function public.log_activity(text, text, uuid, text, jsonb) to authenticated;
grant execute on function public.touch_last_login() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.assignment_effective_status(public.assignment_status, timestamptz) to authenticated;
