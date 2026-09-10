-- ============================================================================
-- 0006 - Assignments, progress, favourites, notifications, announcements,
--        and the activity log.
--
-- This is the layer that turns published content into a person's workload and
-- records what they did with it.
-- ============================================================================

-- ------------------------------------------------------------- assignments --

create table public.assignments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  target_type  public.assignment_target not null,
  -- Polymorphic by design: a single "my assignments" query should not need a
  -- four-way union. Referential integrity is enforced by the trigger below,
  -- since a FK cannot point at four different tables.
  target_id    uuid not null,

  assigned_by  uuid references public.profiles (id) on delete set null,
  assigned_at  timestamptz not null default now(),
  due_at       timestamptz,
  status       public.assignment_status not null default 'not-started',
  note         text not null default '',
  completed_at timestamptz,

  -- Re-assigning the same thing to the same person should update, not stack.
  constraint assignments_unique_target unique (user_id, target_type, target_id)
);

create index assignments_user_idx    on public.assignments (user_id, status);
create index assignments_status_idx  on public.assignments (status);
create index assignments_due_idx     on public.assignments (due_at);
create index assignments_target_idx  on public.assignments (target_type, target_id);

-- Stands in for the foreign key a polymorphic column cannot have. Without it
-- an assignment could point at a deleted or non-existent module and the
-- learner's dashboard would show a row that opens nothing.
create or replace function public.assignments_check_target()
returns trigger
language plpgsql
as $$
declare
  v_exists boolean;
begin
  select case new.target_type
    when 'module'     then exists (select 1 from public.modules             where id = new.target_id)
    when 'path'       then exists (select 1 from public.learning_paths      where id = new.target_id)
    when 'assessment' then exists (select 1 from public.assessments         where id = new.target_id)
    when 'activity'   then exists (select 1 from public.training_activities where id = new.target_id)
  end into v_exists;

  if not v_exists then
    raise exception 'No % exists with id %', new.target_type, new.target_id;
  end if;
  return new;
end;
$$;

create trigger assignments_check_target
  before insert or update of target_type, target_id on public.assignments
  for each row execute function public.assignments_check_target();

-- Derives 'overdue' rather than storing it, so an assignment becomes overdue
-- by the passage of time instead of by a cron job that might not have run.
create or replace function public.assignment_effective_status(
  p_status public.assignment_status,
  p_due_at timestamptz
) returns public.assignment_status
language sql
immutable
as $$
  select case
    when p_status = 'completed' then 'completed'::public.assignment_status
    when p_due_at is not null and p_due_at < now() then 'overdue'::public.assignment_status
    else p_status
  end;
$$;

-- ---------------------------------------------------------------- progress --

-- One row per (learner, module). Lesson-level detail lives in
-- lesson_progress; this table carries the roll-up the dashboard reads.
create table public.module_progress (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  module_id  uuid not null references public.modules (id) on delete cascade,
  state      public.progress_state not null default 'not-started',
  started_at timestamptz,
  completed_at timestamptz,
  last_viewed_at timestamptz,
  last_viewed_lesson_id uuid references public.lessons (id) on delete set null,
  updated_at timestamptz not null default now(),

  constraint module_progress_unique unique (user_id, module_id)
);

create index module_progress_user_idx   on public.module_progress (user_id, state);
create index module_progress_module_idx on public.module_progress (module_id);

create trigger module_progress_set_updated_at before update on public.module_progress
  for each row execute function public.set_updated_at();

create table public.lesson_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  lesson_id    uuid not null references public.lessons (id) on delete cascade,
  module_id    uuid not null references public.modules (id) on delete cascade,
  completed    boolean not null default false,
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),

  constraint lesson_progress_unique unique (user_id, lesson_id)
);

create index lesson_progress_user_module_idx on public.lesson_progress (user_id, module_id);

create trigger lesson_progress_set_updated_at before update on public.lesson_progress
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Roll-up. Marking a lesson complete recomputes the parent module's state in
-- the same transaction, so the two can never disagree - which they would if
-- the client wrote both and the second call failed.
-- ---------------------------------------------------------------------------
create or replace function public.sync_module_progress()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_total int;
  v_done  int;
  v_state public.progress_state;
begin
  select count(*) into v_total
    from public.lessons where module_id = new.module_id and status <> 'archived';

  select count(*) into v_done
    from public.lesson_progress lp
    join public.lessons l on l.id = lp.lesson_id and l.status <> 'archived'
   where lp.user_id = new.user_id and lp.module_id = new.module_id and lp.completed;

  v_state := case
    when v_total > 0 and v_done >= v_total then 'completed'
    when v_done > 0 then 'in-progress'
    else 'not-started'
  end;

  insert into public.module_progress as mp
    (user_id, module_id, state, started_at, completed_at, last_viewed_at, last_viewed_lesson_id)
  values (
    new.user_id, new.module_id, v_state,
    now(),
    case when v_state = 'completed' then now() end,
    now(), new.lesson_id
  )
  on conflict (user_id, module_id) do update set
    state = v_state,
    -- started_at is set once and never moved, so "when did you begin" survives.
    started_at = coalesce(mp.started_at, now()),
    completed_at = case
      when v_state = 'completed' then coalesce(mp.completed_at, now())
      else null
    end,
    last_viewed_at = now(),
    last_viewed_lesson_id = new.lesson_id;

  -- Completing the last lesson of an assigned module closes the assignment.
  if v_state = 'completed' then
    update public.assignments
       set status = 'completed', completed_at = now()
     where user_id = new.user_id
       and target_type = 'module'
       and target_id = new.module_id
       and status <> 'completed';
  end if;

  return new;
end;
$$;

create trigger lesson_progress_sync_module
  after insert or update on public.lesson_progress
  for each row execute function public.sync_module_progress();

-- --------------------------------------------------------------- favourites --

-- Polymorphic like assignments, and for the same reason: one query powers the
-- learner's favourites list across five content types.
create table public.favorites (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  target_type  text not null check (target_type in
                 ('module','lesson','script','objection','quick_reference','activity')),
  target_id    uuid not null,
  created_at   timestamptz not null default now(),

  constraint favorites_unique unique (user_id, target_type, target_id)
);

create index favorites_user_idx on public.favorites (user_id, target_type);

-- ------------------------------------------------------------ notifications --

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       public.notification_kind not null,
  title      text not null,
  body       text not null default '',
  href       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- Partial index: the bell only ever counts unread rows, so indexing read ones
-- would be dead weight.
create index notifications_unread_idx
  on public.notifications (user_id, created_at desc) where not read;
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ----------------------------------------------------------- announcements --

create table public.announcements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  content      text not null default '',
  priority     public.announcement_priority not null default 'normal',
  audience     public.user_role[] not null default array['admin','sales']::public.user_role[],
  status       public.content_status not null default 'draft',
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  published_at timestamptz,
  expires_at   timestamptz,

  constraint announcements_expiry_after_publish
    check (expires_at is null or published_at is null or expires_at > published_at)
);

create index announcements_status_idx on public.announcements (status, published_at desc);

create trigger announcements_set_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------ activity log --

-- §38: meaningful events only. Page views are not logged.
create table public.activity_logs (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references public.profiles (id) on delete set null,
  action       text not null,
  entity_type  text not null default '',
  entity_id    uuid,
  target_label text not null default '',
  meta         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index activity_logs_created_idx on public.activity_logs (created_at desc);
create index activity_logs_actor_idx   on public.activity_logs (actor_id, created_at desc);
create index activity_logs_action_idx  on public.activity_logs (action);

-- Writes an audit row as the caller. SECURITY DEFINER because the RLS policy
-- on activity_logs denies direct inserts to sales users - they must not be
-- able to forge an entry, but their genuine actions still need recording.
create or replace function public.log_activity(
  p_action text,
  p_entity_type text default '',
  p_entity_id uuid default null,
  p_target_label text default '',
  p_meta jsonb default '{}'::jsonb
) returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.activity_logs (actor_id, action, entity_type, entity_id, target_label, meta)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_target_label, p_meta);
$$;
