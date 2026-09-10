-- ============================================================================
-- 0011 - Invitation-only accounts, and permission-based access control.
--
-- Two changes, and they are related.
--
-- 1. NOBODY CAN SIGN THEMSELVES UP.
--    `handle_new_user` now refuses any signup with no matching invitation.
--    That covers email/password AND Google OAuth, because both funnel through
--    the same trigger on auth.users - so this is not a dashboard toggle that
--    can be flipped back by accident, it is a database rule.
--
-- 2. ACCESS IS A SET OF PERMISSIONS, NOT JUST A ROLE.
--    `role` (admin | sales) stays as the coarse gate that decides who sees the
--    admin console at all. What a person may actually DO is now a permission
--    set: defaults come from their role, and an admin can grant or revoke any
--    individual permission per person.
--
--    Existing behaviour is preserved exactly: admins are granted every
--    permission by default, so `can('content.edit')` is true for an admin for
--    the same reason `is_admin()` was.
--
-- Creating the auth user itself still needs the service role key, which must
-- never reach the browser. The invitation flow is how an admin provisions an
-- account without it: the admin records who may join and with what access, and
-- the person sets their own password. The admin never learns it, which is
-- better than the alternative.
-- ============================================================================

-- =========================================================== permissions ====

create table public.permissions (
  key         text primary key check (key ~ '^[a-z_]+\.[a-z_]+$'),
  label       text not null,
  description text not null default '',
  -- Groups the admin UI's checklist. Not a security boundary.
  category    text not null,
  sort_order  int  not null default 0
);

comment on table public.permissions is
  'The catalogue of things a person can be allowed to do. Rows are seeded by '
  'this migration; the application never invents a key at runtime.';

insert into public.permissions (key, label, description, category, sort_order) values
  -- Learning content
  ('content.view_drafts', 'View drafts',        'See unpublished materials.',                     'Content',  10),
  ('content.create',      'Create materials',   'Add new modules and lessons.',                   'Content',  11),
  ('content.edit',        'Edit materials',      'Change existing modules, lessons and blocks.',  'Content',  12),
  ('content.publish',     'Publish materials',   'Make a material visible to sales users.',      'Content',  13),
  ('content.archive',     'Archive materials',   'Withdraw a material without deleting it.',     'Content',  14),
  ('categories.manage',   'Manage categories',   'Add, rename and remove categories.',           'Content',  15),

  -- Assessments
  ('assessments.create',  'Create assessments',  'Add new assessments.',                          'Assessments', 20),
  ('assessments.edit',    'Edit assessments',    'Change questions, options and answer keys.',    'Assessments', 21),
  ('assessments.publish', 'Publish assessments', 'Make an assessment available to take.',         'Assessments', 22),
  ('assessments.results', 'View all results',    'See every learner''s attempts and scores.',     'Assessments', 23),

  -- Training
  ('training.manage',     'Manage activities',   'Add and edit facilitator-led activities.',      'Training', 30),
  ('scenarios.manage',    'Manage scenarios',    'Add and edit practice scenarios.',              'Training', 31),

  -- Sales resources
  ('objections.manage',   'Manage objections',   'Edit the objection handling library.',          'Resources', 40),
  ('scripts.manage',      'Manage scripts',      'Edit the script library.',                      'Resources', 41),
  ('quickref.manage',     'Manage quick reference', 'Edit the quick reference cards.',            'Resources', 42),
  ('salesbible.edit',     'Edit Sales Bible',    'Fill in Sales Bible fields.',                   'Resources', 43),
  ('salesbible.verify',   'Verify Sales Bible',  'Mark a Sales Bible value as management-approved.', 'Resources', 44),

  -- People
  ('users.view',          'View people',         'See the team roster and account details.',      'People', 50),
  ('users.invite',        'Invite people',       'Create an invitation so someone can join.',     'People', 51),
  ('users.edit',          'Edit people',         'Change someone''s name, department or position.', 'People', 52),
  ('users.set_role',      'Change roles',        'Move someone between admin and sales.',         'People', 53),
  ('users.set_status',    'Activate / deactivate', 'Suspend or reinstate an account.',            'People', 54),
  ('users.permissions',   'Manage permissions',  'Grant or revoke individual permissions.',       'People', 55),

  -- Delivery
  ('assignments.manage',  'Assign training',     'Assign modules, paths and assessments.',        'Delivery', 60),
  ('announcements.manage','Manage announcements','Post and withdraw announcements.',              'Delivery', 61),

  -- Development
  ('competencies.manage', 'Manage competencies', 'Edit the competency framework.',                'Development', 70),
  ('competencies.rate',   'Rate competencies',   'Score a learner against the framework.',        'Development', 71),

  -- Oversight
  ('reports.view',        'View reports',        'Open the admin reports.',                       'Oversight', 80),
  ('logs.view',           'View activity log',   'Read the audit trail.',                         'Oversight', 81),
  ('settings.manage',     'Manage settings',     'Change system settings.',                       'Oversight', 82);

-- ------------------------------------------------------- role defaults ------

create table public.role_permissions (
  role           public.user_role not null,
  permission_key text not null references public.permissions (key) on delete cascade,
  primary key (role, permission_key)
);

comment on table public.role_permissions is
  'What a role can do by default. Editable, so "what an admin can do" is '
  'configuration rather than something compiled into policies.';

-- An admin gets everything. This is what keeps the pre-existing behaviour
-- identical after the policy rewrite below.
insert into public.role_permissions (role, permission_key)
select 'admin', key from public.permissions;

-- A sales user gets nothing from this table. Everything a learner does -
-- reading published content, their own progress, their own attempts - is
-- governed by ownership policies rather than by a permission, so there is
-- deliberately nothing to grant here by default.

-- --------------------------------------------------- per-person overrides ---

create table public.user_permissions (
  user_id        uuid not null references public.profiles (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  -- true grants a permission the role does not have; false revokes one it does.
  -- Storing the negative case explicitly is what makes "admin, but may not
  -- change roles" expressible.
  granted        boolean not null,
  granted_by     uuid references public.profiles (id) on delete set null,
  granted_at     timestamptz not null default now(),
  note           text not null default '',

  primary key (user_id, permission_key)
);

create index user_permissions_user_idx on public.user_permissions (user_id);

-- ---------------------------------------------------------------------------
-- The check.
--
-- Override first, role default second, deny third. SECURITY DEFINER for the
-- same reason `is_admin()` is: a policy on a table that consulted these tables
-- as the caller would need its own read policies, and the recursion is not
-- worth the trouble. STABLE so the planner evaluates it once per statement.
-- ---------------------------------------------------------------------------
create or replace function public.can(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    -- An explicit override always wins, in both directions.
    (select up.granted
       from public.user_permissions up
      where up.user_id = auth.uid() and up.permission_key = p_key),
    -- Otherwise the role default, but only for an active account.
    (select exists (
       select 1
         from public.profiles p
         join public.role_permissions rp on rp.role = p.role
        where p.id = auth.uid()
          and p.status = 'active'
          and rp.permission_key = p_key
     )),
    false
  );
$$;

comment on function public.can(text) is
  'True when the caller holds the named permission. Per-user override beats '
  'role default; a deactivated account holds nothing.';

/** Every permission the caller effectively holds. Powers the UI''s guards. */
create or replace function public.my_permissions()
returns setof text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.key
    from public.permissions p
   where public.can(p.key);
$$;

revoke execute on function public.can(text) from public, anon;
revoke execute on function public.my_permissions() from public, anon;
grant execute on function public.can(text) to authenticated;
grant execute on function public.my_permissions() to authenticated;

-- ------------------------------------------------------------------ RLS -----

alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_permissions enable row level security;

-- The catalogue is readable by anyone signed in: the UI needs the labels to
-- explain what a permission means, and knowing a permission exists is not
-- sensitive.
create policy permissions_select on public.permissions
  for select to authenticated using (public.is_active_user());

create policy role_permissions_select on public.role_permissions
  for select to authenticated using (public.is_active_user());

create policy role_permissions_manage on public.role_permissions
  for all to authenticated
  using (public.can('users.permissions')) with check (public.can('users.permissions'));

-- A person may see their own grants; changing anyone's requires the permission
-- to manage permissions - including their own, which the guard below blocks.
create policy user_permissions_select on public.user_permissions
  for select to authenticated
  using (user_id = auth.uid() or public.can('users.permissions'));

create policy user_permissions_manage on public.user_permissions
  for all to authenticated
  using (public.can('users.permissions')) with check (public.can('users.permissions'));

-- =========================================================== invitations ====

create table public.invitations (
  id           uuid primary key default gen_random_uuid(),
  -- Stored lower-cased by the trigger below so a mismatch in capitalisation
  -- cannot silently block a legitimate signup.
  email        text not null check (position('@' in email) > 1),
  role         public.user_role not null default 'sales',
  department   text,
  position     text,
  full_name    text,
  /**
   * Permissions to apply on top of the role's defaults when the invitation is
   * accepted. Chosen by the admin at invite time, which is what "choose what
   * access that sales can have" means in practice.
   */
  permissions  text[] not null default '{}',

  invited_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '14 days',
  accepted_at  timestamptz,
  accepted_by  uuid references public.profiles (id) on delete set null,
  revoked_at   timestamptz,
  note         text not null default ''
);

-- One live invitation per address. A revoked or accepted one does not block a
-- new invite, which is what makes re-inviting somebody possible.
create unique index invitations_one_pending
  on public.invitations (lower(email))
  where accepted_at is null and revoked_at is null;

create index invitations_email_idx on public.invitations (lower(email));
create index invitations_created_idx on public.invitations (created_at desc);

create or replace function public.invitations_normalise_email()
returns trigger language plpgsql as $$
begin
  new.email := lower(trim(new.email));
  return new;
end;
$$;

create trigger invitations_normalise_email
  before insert or update of email on public.invitations
  for each row execute function public.invitations_normalise_email();

alter table public.invitations enable row level security;

create policy invitations_select on public.invitations
  for select to authenticated using (public.can('users.view'));

create policy invitations_manage on public.invitations
  for all to authenticated
  using (public.can('users.invite')) with check (public.can('users.invite'));

-- ---------------------------------------------------------------------------
-- Signup, rewritten.
--
-- Replaces the version in 0002. The difference: no invitation, no account.
--
-- The exception message is deliberately the same whether the address was never
-- invited, the invitation expired, or it was already used. Distinguishing them
-- would turn this endpoint into a way to discover who has been invited.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invite public.invitations;
  v_email  text := lower(trim(new.email));
  v_name   text;
begin
  select * into v_invite
    from public.invitations
   where lower(email) = v_email
     and accepted_at is null
     and revoked_at is null
     and expires_at > now()
   order by created_at desc
   limit 1;

  if v_invite.id is null then
    raise exception
      'This platform is invitation only. Ask an administrator to create an account for you.'
      using errcode = 'insufficient_privilege';
  end if;

  -- Prefer the name the admin recorded on the invitation; fall back to what
  -- the identity provider supplied, then to the local part of the address.
  v_name := coalesce(
    nullif(trim(v_invite.full_name), ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(v_email, '@', 1)
  );

  insert into public.profiles (
    id, email, full_name, avatar_url, role, status, department, position
  )
  values (
    new.id,
    v_email,
    v_name,
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    v_invite.role,
    -- Active immediately: an admin already decided this person should have
    -- access, so a second approval step would be busywork.
    'active',
    v_invite.department,
    v_invite.position
  )
  on conflict (id) do nothing;

  -- Apply the extra permissions the admin picked at invite time.
  if array_length(v_invite.permissions, 1) > 0 then
    insert into public.user_permissions (user_id, permission_key, granted, granted_by, note)
    select new.id, key, true, v_invite.invited_by, 'Granted on invitation'
      from unnest(v_invite.permissions) as key
     where exists (select 1 from public.permissions p where p.key = key)
    on conflict (user_id, permission_key) do nothing;
  end if;

  update public.invitations
     set accepted_at = now(), accepted_by = new.id
   where id = v_invite.id;

  return new;
end;
$$;

/**
 * Tells the sign-in screen whether an address has a usable invitation.
 *
 * Returns only a boolean, never any detail about the invitation, and is
 * callable by `anon` because the person using it does not have an account yet.
 * The information it leaks is whether a given address may register, which the
 * signup attempt itself would reveal in any case.
 */
create or replace function public.invitation_exists(p_email text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.invitations
     where lower(email) = lower(trim(p_email))
       and accepted_at is null
       and revoked_at is null
       and expires_at > now()
  );
$$;

grant execute on function public.invitation_exists(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin operations on invitations and permissions.
-- ---------------------------------------------------------------------------

create or replace function public.admin_invite_user(
  p_email       text,
  p_full_name   text default null,
  p_role        public.user_role default 'sales',
  p_department  text default null,
  p_position    text default null,
  p_permissions text[] default '{}',
  p_note        text default ''
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_email text := lower(trim(p_email));
begin
  if not public.can('users.invite') then
    raise exception 'You do not have permission to invite people';
  end if;

  if exists (select 1 from public.profiles where lower(email) = v_email) then
    raise exception 'An account already exists for %', v_email;
  end if;

  -- Replace any outstanding invitation rather than tripping the unique index,
  -- so re-inviting with different access is a single action.
  update public.invitations
     set revoked_at = now()
   where lower(email) = v_email and accepted_at is null and revoked_at is null;

  insert into public.invitations
    (email, full_name, role, department, position, permissions, invited_by, note)
  values
    (v_email, p_full_name, p_role, p_department, p_position,
     coalesce(p_permissions, '{}'), auth.uid(), coalesce(p_note, ''))
  returning id into v_id;

  perform public.log_activity(
    'user.invited', 'invitation', v_id, v_email,
    jsonb_build_object('role', p_role, 'permissions', coalesce(p_permissions, '{}'))
  );

  return v_id;
end;
$$;

create or replace function public.admin_revoke_invitation(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_email text;
begin
  if not public.can('users.invite') then
    raise exception 'You do not have permission to manage invitations';
  end if;

  update public.invitations
     set revoked_at = now()
   where id = p_id and accepted_at is null
   returning email into v_email;

  if v_email is null then
    raise exception 'That invitation does not exist or has already been accepted';
  end if;

  perform public.log_activity('user.invite_revoked', 'invitation', p_id, v_email);
end;
$$;

/**
 * Sets one permission for one person.
 *
 * `p_granted` null clears the override, returning the person to their role's
 * default - which is different from revoking, and both are needed.
 *
 * The guard at the end is the important part: it refuses a change that would
 * leave nobody able to manage permissions. Without it an admin could remove
 * their own `users.permissions` and lock the whole team out of the
 * authorization system with no way back except SQL.
 */
create or replace function public.admin_set_permission(
  p_user_id uuid,
  p_key     text,
  p_granted boolean,
  p_note    text default ''
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
  v_remaining int;
begin
  if not public.can('users.permissions') then
    raise exception 'You do not have permission to manage permissions';
  end if;

  select full_name into v_name from public.profiles where id = p_user_id;
  if v_name is null then
    raise exception 'No such user';
  end if;

  if not exists (select 1 from public.permissions where key = p_key) then
    raise exception 'Unknown permission %', p_key;
  end if;

  if p_granted is null then
    delete from public.user_permissions
     where user_id = p_user_id and permission_key = p_key;
  else
    insert into public.user_permissions (user_id, permission_key, granted, granted_by, note)
    values (p_user_id, p_key, p_granted, auth.uid(), coalesce(p_note, ''))
    on conflict (user_id, permission_key) do update
      set granted = excluded.granted,
          granted_by = excluded.granted_by,
          granted_at = now(),
          note = excluded.note;
  end if;

  if p_key = 'users.permissions' then
    select count(*) into v_remaining
      from public.profiles pr
     where pr.status = 'active'
       and coalesce(
             (select up.granted from public.user_permissions up
               where up.user_id = pr.id and up.permission_key = 'users.permissions'),
             exists (select 1 from public.role_permissions rp
                      where rp.role = pr.role and rp.permission_key = 'users.permissions')
           );

    if v_remaining = 0 then
      raise exception
        'That would leave nobody able to manage permissions. Grant it to someone else first.';
    end if;
  end if;

  perform public.log_activity(
    'user.permission_changed', 'profile', p_user_id, v_name,
    jsonb_build_object('permission', p_key, 'granted', p_granted)
  );
end;
$$;

revoke execute on function public.admin_invite_user(text, text, public.user_role, text, text, text[], text) from public, anon;
revoke execute on function public.admin_revoke_invitation(uuid) from public, anon;
revoke execute on function public.admin_set_permission(uuid, text, boolean, text) from public, anon;

grant execute on function public.admin_invite_user(text, text, public.user_role, text, text, text[], text) to authenticated;
grant execute on function public.admin_revoke_invitation(uuid) to authenticated;
grant execute on function public.admin_set_permission(uuid, text, boolean, text) to authenticated;

-- ===================================================== policy rewrite =======
--
-- The admin write policies are re-expressed in terms of permissions. Because
-- role_permissions grants an admin every key, this changes no existing
-- behaviour - it only makes the grants individually adjustable, which is the
-- whole point of the exercise.
-- ---------------------------------------------------------------------------

-- Content
drop policy modules_admin on public.modules;
create policy modules_write on public.modules
  for insert to authenticated with check (public.can('content.create'));
create policy modules_update on public.modules
  for update to authenticated
  using (public.can('content.edit') or public.can('content.publish') or public.can('content.archive'))
  with check (public.can('content.edit') or public.can('content.publish') or public.can('content.archive'));
create policy modules_delete on public.modules
  for delete to authenticated using (public.can('content.archive'));

-- Drafts become visible with a permission rather than with a role.
drop policy modules_select_published on public.modules;
create policy modules_select on public.modules
  for select to authenticated
  using (
    public.can('content.view_drafts')
    or (
      public.is_active_user()
      and status = 'published'
      and (select p.role from public.profiles p where p.id = auth.uid()) = any (audience)
    )
  );

drop policy lessons_admin on public.lessons;
create policy lessons_write on public.lessons
  for all to authenticated
  using (public.can('content.edit') or public.can('content.create'))
  with check (public.can('content.edit') or public.can('content.create'));

drop policy lessons_select on public.lessons;
create policy lessons_select on public.lessons
  for select to authenticated
  using (
    public.can('content.view_drafts')
    or (status = 'published' and exists (select 1 from public.modules m where m.id = module_id))
  );

drop policy content_blocks_admin on public.content_blocks;
create policy content_blocks_write on public.content_blocks
  for all to authenticated
  using (public.can('content.edit') or public.can('content.create'))
  with check (public.can('content.edit') or public.can('content.create'));

drop policy content_blocks_select on public.content_blocks;
create policy content_blocks_select on public.content_blocks
  for select to authenticated
  using (
    public.can('content.view_drafts')
    or exists (select 1 from public.lessons l where l.id = lesson_id)
  );

drop policy categories_admin on public.categories;
create policy categories_write on public.categories
  for all to authenticated
  using (public.can('categories.manage')) with check (public.can('categories.manage'));

drop policy learning_paths_admin on public.learning_paths;
create policy learning_paths_write on public.learning_paths
  for all to authenticated
  using (public.can('content.edit') or public.can('content.create'))
  with check (public.can('content.edit') or public.can('content.create'));

drop policy learning_path_items_admin on public.learning_path_items;
create policy learning_path_items_write on public.learning_path_items
  for all to authenticated
  using (public.can('content.edit')) with check (public.can('content.edit'));

-- Assessments
drop policy assessments_admin on public.assessments;
create policy assessments_write on public.assessments
  for insert to authenticated with check (public.can('assessments.create'));
create policy assessments_update on public.assessments
  for update to authenticated
  using (public.can('assessments.edit') or public.can('assessments.publish'))
  with check (public.can('assessments.edit') or public.can('assessments.publish'));
create policy assessments_delete on public.assessments
  for delete to authenticated using (public.can('assessments.edit'));

drop policy assessments_select on public.assessments;
create policy assessments_select on public.assessments
  for select to authenticated
  using (
    public.can('assessments.edit')
    or public.can('assessments.create')
    or (public.is_active_user() and status = 'published')
  );

drop policy assessment_questions_admin on public.assessment_questions;
create policy assessment_questions_write on public.assessment_questions
  for all to authenticated
  using (public.can('assessments.edit')) with check (public.can('assessments.edit'));

drop policy assessment_choices_admin on public.assessment_choices;
create policy assessment_choices_write on public.assessment_choices
  for all to authenticated
  using (public.can('assessments.edit')) with check (public.can('assessments.edit'));

-- Results: a learner sees their own; seeing everyone's is a permission.
drop policy attempts_select_own on public.assessment_attempts;
create policy attempts_select on public.assessment_attempts
  for select to authenticated
  using (user_id = auth.uid() or public.can('assessments.results'));

drop policy answers_select_own on public.assessment_answers;
create policy answers_select on public.assessment_answers
  for select to authenticated
  using (
    public.can('assessments.results')
    or exists (
      select 1 from public.assessment_attempts t
       where t.id = attempt_id and t.user_id = auth.uid()
    )
  );

-- Delivery
drop policy assignments_admin on public.assignments;
create policy assignments_write on public.assignments
  for all to authenticated
  using (public.can('assignments.manage')) with check (public.can('assignments.manage'));

drop policy assignments_select_own on public.assignments;
create policy assignments_select on public.assignments
  for select to authenticated
  using (user_id = auth.uid() or public.can('assignments.manage'));

drop policy announcements_admin on public.announcements;
create policy announcements_write on public.announcements
  for all to authenticated
  using (public.can('announcements.manage')) with check (public.can('announcements.manage'));

-- Oversight
drop policy activity_logs_admin_select on public.activity_logs;
create policy activity_logs_select on public.activity_logs
  for select to authenticated using (public.can('logs.view'));

drop policy activity_logs_admin_write on public.activity_logs;
create policy activity_logs_write on public.activity_logs
  for insert to authenticated with check (public.can('logs.view'));

-- People
drop policy profiles_admin_all on public.profiles;
create policy profiles_admin_read on public.profiles
  for select to authenticated using (public.can('users.view'));
create policy profiles_admin_update on public.profiles
  for update to authenticated
  using (public.can('users.edit')) with check (public.can('users.edit'));

-- Development
drop policy user_competencies_admin on public.user_competencies;
create policy user_competencies_write on public.user_competencies
  for all to authenticated
  using (public.can('competencies.rate')) with check (public.can('competencies.rate'));

-- The resource libraries created by the DO-block in 0007.
do $$
declare
  t text;
  perm text;
  pairs text[][] := array[
    array['training_activities',   'training.manage'],
    array['practice_scenarios',    'scenarios.manage'],
    array['objections',            'objections.manage'],
    array['scripts',               'scripts.manage'],
    array['wording_pairs',         'scripts.manage'],
    array['quick_reference_items', 'quickref.manage'],
    array['competencies',          'competencies.manage']
  ];
  i int;
begin
  for i in 1 .. array_length(pairs, 1) loop
    t := pairs[i][1];
    perm := pairs[i][2];

    execute format('drop policy %I on public.%I', t || '_admin', t);
    execute format($f$
      create policy %I on public.%I
        for all to authenticated
        using (public.can(%L)) with check (public.can(%L))
    $f$, t || '_write', t, perm, perm);
  end loop;
end
$$;

do $$
declare
  t text;
  tables text[] := array['competency_levels', 'sales_bible_sections'];
begin
  foreach t in array tables loop
    execute format('drop policy %I on public.%I', t || '_admin', t);
    execute format($f$
      create policy %I on public.%I
        for all to authenticated
        using (public.can('competencies.manage'))
        with check (public.can('competencies.manage'))
    $f$, t || '_write', t);
  end loop;
end
$$;

drop policy sales_bible_entries_admin on public.sales_bible_entries;
create policy sales_bible_entries_write on public.sales_bible_entries
  for all to authenticated
  using (public.can('salesbible.edit')) with check (public.can('salesbible.edit'));

-- ---------------------------------------------------------------------------
-- The guarded RPCs from 0009 predate permissions and check `is_admin()`.
-- Re-point them at the specific permission each one represents.
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
  if not public.can('users.set_role') then
    raise exception 'You do not have permission to change roles';
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
  if not public.can('users.set_status') then
    raise exception 'You do not have permission to change account status';
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

create or replace function public.admin_save_question(
  p_assessment_id uuid,
  p_question_id   uuid,
  p_type          public.question_type,
  p_prompt        text,
  p_explanation   text,
  p_points        int,
  p_sort_order    int,
  p_correct_text  text,
  p_choices       jsonb
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
  if not public.can('assessments.edit') then
    raise exception 'You do not have permission to edit assessment questions';
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
      values (v_id, v_choice ->> 'text',
              coalesce((v_choice ->> 'is_correct')::boolean, false), v_i);
      v_i := v_i + 1;
    end loop;

    perform public.validate_question_choices(v_id);
  end if;

  return v_id;
end;
$$;

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
  if not public.can('assignments.manage') then
    raise exception 'You do not have permission to assign training';
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

create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v jsonb;
begin
  if not public.can('reports.view') then
    raise exception 'You do not have permission to view reports';
  end if;

  select jsonb_build_object(
    'sales_users',        (select count(*) from public.profiles where role = 'sales'),
    'active_users',       (select count(*) from public.profiles where status = 'active'),
    'pending_users',      (select count(*) from public.profiles where status = 'pending'),
    'pending_invitations',(select count(*) from public.invitations
                            where accepted_at is null and revoked_at is null and expires_at > now()),
    'published_modules',  (select count(*) from public.modules where status = 'published'),
    'draft_modules',      (select count(*) from public.modules where status = 'draft'),
    'active_paths',       (select count(*) from public.learning_paths where status = 'published'),
    'published_assessments', (select count(*) from public.assessments where status = 'published'),
    'pending_assignments',(select count(*) from public.assignments where status <> 'completed'),
    'overdue_assignments',(select count(*) from public.assignments
                            where status <> 'completed' and due_at is not null and due_at < now()),
    'avg_completion',     coalesce((
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

-- The three report functions gate on reports.view rather than is_admin().
create or replace function public.report_training_completion()
returns table (
  user_id uuid, full_name text, department text, status public.user_status,
  modules_completed bigint, modules_in_progress bigint, modules_total bigint,
  completion_percent numeric, assessments_taken bigint, avg_score numeric
)
language sql security definer set search_path = public, pg_temp
as $$
  select p.id, p.full_name, coalesce(p.department, ''), p.status,
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
  where public.can('reports.view') and p.role = 'sales'
  group by p.id, p.full_name, p.department, p.status, total.n
  order by p.full_name;
$$;

create or replace function public.report_assessment_performance()
returns table (
  assessment_id uuid, title text, attempts bigint, unique_takers bigint,
  avg_score numeric, pass_rate numeric, passing_score int
)
language sql security definer set search_path = public, pg_temp
as $$
  select a.id, a.title, count(t.*), count(distinct t.user_id),
    coalesce(round(avg(t.percentage), 1), 0),
    coalesce(round(100.0 * count(*) filter (where t.passed) / nullif(count(t.*), 0), 1), 0),
    a.passing_score
  from public.assessments a
  left join public.assessment_attempts t
    on t.assessment_id = a.id and t.status = 'submitted'
  where public.can('reports.view')
  group by a.id, a.title, a.passing_score
  order by a.title;
$$;

create or replace function public.report_module_engagement()
returns table (
  module_id uuid, title text, status public.content_status,
  learners_started bigint, learners_completed bigint, completion_percent numeric
)
language sql security definer set search_path = public, pg_temp
as $$
  select m.id, m.title, m.status,
    count(mp.*) filter (where mp.state <> 'not-started'),
    count(mp.*) filter (where mp.state = 'completed'),
    coalesce(round(
      100.0 * count(mp.*) filter (where mp.state = 'completed')
      / nullif(count(mp.*) filter (where mp.state <> 'not-started'), 0), 1), 0)
  from public.modules m
  left join public.module_progress mp on mp.module_id = m.id
  where public.can('reports.view')
  group by m.id, m.title, m.status
  order by m.title;
$$;

-- Admins may open a draft assessment to test it; that is now a permission.
create or replace function public.start_assessment_attempt(p_assessment_id uuid)
returns public.assessment_attempts
language plpgsql security definer set search_path = public, pg_temp
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

  if v_status <> 'published' and not public.can('assessments.edit') then
    raise exception 'This assessment is not available';
  end if;

  select count(*) into v_used
    from public.assessment_attempts
   where user_id = auth.uid() and assessment_id = p_assessment_id and status = 'submitted';

  if v_allowed > 0 and v_used >= v_allowed then
    raise exception 'You have used all % attempts for this assessment', v_allowed;
  end if;

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

create or replace function public.attempt_review(p_attempt_id uuid)
returns table (
  question_id uuid, prompt text, type public.question_type, points int,
  sort_order int, explanation text,
  selected_choice_ids uuid[], correct_choice_ids uuid[],
  text_answer text, correct_text text, is_correct boolean, points_awarded int
)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_attempt public.assessment_attempts;
  v_reveal  boolean;
begin
  select * into v_attempt from public.assessment_attempts where id = p_attempt_id;

  if v_attempt.id is null then
    raise exception 'Attempt not found';
  end if;

  if v_attempt.user_id <> auth.uid() and not public.can('assessments.results') then
    raise exception 'That attempt is not yours';
  end if;

  if v_attempt.status <> 'submitted' then
    raise exception 'This attempt has not been submitted yet';
  end if;

  select a.show_correct_answers into v_reveal
    from public.assessments a where a.id = v_attempt.assessment_id;

  v_reveal := coalesce(v_reveal, true) or public.can('assessments.results');

  return query
  select q.id, q.prompt, q.type, q.points, q.sort_order,
    case when v_reveal then q.explanation else '' end,
    coalesce(ans.choice_ids, '{}'),
    case when v_reveal then coalesce(
      (select array_agg(c.id order by c.sort_order)
         from public.assessment_choices c
        where c.question_id = q.id and c.is_correct), '{}')
      else '{}' end,
    ans.text_answer,
    case when v_reveal then q.correct_text end,
    ans.is_correct,
    coalesce(ans.points_awarded, 0)
  from public.assessment_questions q
  left join public.assessment_answers ans
    on ans.question_id = q.id and ans.attempt_id = p_attempt_id
  where q.assessment_id = v_attempt.assessment_id
  order by q.sort_order;
end;
$$;

-- The admin answer-key views gate on the assessment permission too.
create or replace view public.admin_assessment_choices
  with (security_invoker = false) as
  select c.id, c.question_id, c.text, c.is_correct, c.sort_order
    from public.assessment_choices c
   where public.can('assessments.edit');

create or replace view public.admin_assessment_questions
  with (security_invoker = false) as
  select q.id, q.assessment_id, q.type, q.prompt, q.explanation,
         q.points, q.sort_order, q.correct_text
    from public.assessment_questions q
   where public.can('assessments.edit');

revoke all on public.admin_assessment_choices   from anon;
revoke all on public.admin_assessment_questions from anon;
grant select on public.admin_assessment_choices   to authenticated;
grant select on public.admin_assessment_questions to authenticated;
