-- ============================================================================
-- 0002 - Profiles.
--
-- Supabase Auth owns identity (auth.users); this table owns everything the
-- product knows about a person. Credentials are never duplicated here (§10).
--
-- `id` is the auth user id rather than an independent surrogate key. That makes
-- `auth.uid() = id` the cheapest possible RLS predicate - no join, no subquery -
-- which matters because every policy in 0004 evaluates it on every row.
-- ============================================================================

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,

  email         text        not null unique,
  full_name     text        not null check (length(trim(full_name)) between 1 and 120),
  display_name  text        check (length(trim(display_name)) between 1 and 60),
  avatar_url    text,

  role          public.user_role   not null default 'sales',
  status        public.user_status not null default 'pending',

  department    text,
  position      text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  last_login_at timestamptz
);

comment on table public.profiles is
  'Application identity. One row per auth.users row; never stores credentials.';
comment on column public.profiles.role is
  'Authorization source of truth. Only an admin may change it (see 0004).';

create index profiles_role_idx    on public.profiles (role);
create index profiles_status_idx  on public.profiles (status);
create index profiles_created_idx on public.profiles (created_at desc);
-- Case-insensitive lookup for the admin user table's search box.
create index profiles_name_trgm_idx on public.profiles using gin (full_name extensions.gin_trgm_ops);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Role lookup used by every admin policy.
--
-- SECURITY DEFINER is required, not a convenience: a policy on `profiles` that
-- selected from `profiles` to find the caller's role would re-enter its own
-- RLS check and recurse. Running as the owner reads the row directly.
--
-- STABLE lets the planner call it once per statement instead of once per row.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.status = 'active'
  );
$$;

comment on function public.is_admin() is
  'True when the caller is an active admin. SECURITY DEFINER to avoid RLS recursion on profiles.';

-- Signed-in and not deactivated. Used wherever "any real user" is the bar.
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active'
  );
$$;

-- ---------------------------------------------------------------------------
-- Provisioning. Fires for both email/password signup and OAuth (§9), so a
-- Google sign-in lands with a profile already in place and the app never has
-- to handle a signed-in user with no profile row.
--
-- New accounts are always 'sales' + 'pending'. Self-promotion is impossible
-- here by construction; an admin activates and assigns the role afterwards.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role, status)
  values (
    new.id,
    new.email,
    -- OAuth providers use different keys for the same idea; fall back to the
    -- local-part of the address so full_name is never empty.
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1)
    ),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    'sales',
    'pending'
  )
  on conflict (id) do nothing;   -- idempotent: re-running signup is not an error
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Records the sign-in timestamp shown in the admin user table. Called by the
-- client after a successful session; safe for a user to run on their own row.
create or replace function public.touch_last_login()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.profiles set last_login_at = now() where id = auth.uid();
$$;
