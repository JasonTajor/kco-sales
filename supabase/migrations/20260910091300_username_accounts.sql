-- ============================================================================
-- 0014 - Username accounts.
--
-- WHAT CHANGES
--
-- An administrator now creates a working account outright - username, password,
-- role, permissions - instead of recording an invitation the person has to
-- accept. The person signs in immediately with the username and the password
-- they were given.
--
-- HOW, WITHOUT A SERVICE-ROLE KEY
--
-- Supabase Auth identifies a user by email address; there is no username
-- support to switch on. So a username is mapped to a deterministic internal
-- address:
--
--     andrea  ->  andrea@kco.local
--
-- Nothing is ever sent to it. It exists because `auth.users.email` is the
-- login identifier, and the mapping is pure string concatenation done on the
-- client, so signing in needs no lookup and leaks no information about which
-- usernames exist.
--
-- The account is created by the admin's browser calling `signUp` on a second
-- Supabase client configured with `persistSession: false`, so the admin's own
-- session is untouched. `handle_new_user` still demands an invitation, so the
-- admin's browser writes one first (it holds `users.invite`) and the signup
-- consumes it a moment later. The invitation is now an internal handshake
-- rather than something a person receives.
--
-- That is why this needs no service-role key: the privileged step is creating
-- the invitation, which RLS already permits an admin, and the unprivileged
-- step is an ordinary signup.
--
-- !! ONE PROJECT SETTING IS REQUIRED !!
--
--   Authentication -> Providers -> Email -> turn OFF "Confirm email"
--
-- A username has no mailbox, so a confirmation link can never be followed and
-- the account would be permanently unable to sign in. With it off, the account
-- works the moment it is created. Real email addresses still work; they are
-- simply not confirmed by mail either, which is the right trade for an
-- internal tool where an admin vouches for every account.
-- ============================================================================

-- --------------------------------------------------------------- profiles ---

alter table public.profiles
  add column if not exists username text;

/*
 * Lower-case, starts alphanumeric, 3-30 characters.
 *
 * Deliberately narrow: a username is typed at a sign-in prompt by someone who
 * may have been told it verbally, so ambiguity is the enemy. No spaces, no
 * capitals to remember, no unicode look-alikes.
 */
alter table public.profiles
  drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9][a-z0-9._-]{2,29}$');

-- Case-insensitive uniqueness. Two accounts differing only in capitalisation
-- would both map to the same login address, and the second signup would fail
-- with a confusing duplicate-email error instead of a clear one.
create unique index if not exists profiles_username_unique
  on public.profiles (lower(username))
  where username is not null;

comment on column public.profiles.username is
  'Sign-in name. Maps to auth.users.email as <username>@kco.local, which is '
  'never delivered to. Null for accounts created from a real email address.';

-- ------------------------------------------------------------ invitations ---

alter table public.invitations
  add column if not exists username text;

alter table public.invitations
  drop constraint if exists invitations_username_format;
alter table public.invitations
  add constraint invitations_username_format
  check (username is null or username ~ '^[a-z0-9][a-z0-9._-]{2,29}$');

/*
 * The email column keeps its `@` check.
 *
 * That constraint is what produced "violates check constraint
 * invitations_email_check" when a username was typed into the form: the value
 * had no @. It stays, because auth.users.email genuinely must be an address -
 * the fix is that the caller now supplies the mapped address rather than the
 * bare username.
 */

-- ---------------------------------------------------------------------------
-- Signup, extended to carry the username through.
--
-- Same rule as before: no invitation, no account. The only difference is that
-- the profile now also records the username the admin chose.
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

  v_name := coalesce(
    nullif(trim(v_invite.full_name), ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    v_invite.username,
    split_part(v_email, '@', 1)
  );

  insert into public.profiles (
    id, email, username, full_name, avatar_url, role, status, department, position
  )
  values (
    new.id,
    v_email,
    v_invite.username,
    v_name,
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    v_invite.role,
    'active',
    v_invite.department,
    v_invite.position
  )
  on conflict (id) do nothing;

  if array_length(v_invite.permissions, 1) > 0 then
    insert into public.user_permissions (user_id, permission_key, granted, granted_by, note)
    select new.id, key, true, v_invite.invited_by, 'Granted on account creation'
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

-- ---------------------------------------------------------------------------
-- Creating the account.
--
-- Replaces admin_invite_user. Takes a username, maps it to the internal
-- address, and records the pending account. The caller then performs the
-- signup that consumes it.
--
-- `p_email` is optional: pass a real address to create a conventional
-- email-login account, or leave it null to derive one from the username.
-- ---------------------------------------------------------------------------
create or replace function public.admin_create_account(
  p_username    text,
  p_full_name   text default null,
  p_role        public.user_role default 'sales',
  p_department  text default null,
  p_position    text default null,
  p_permissions text[] default '{}',
  p_email       text default null,
  p_note        text default ''
) returns table (invitation_id uuid, login_email text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id       uuid;
  v_username text := lower(trim(coalesce(p_username, '')));
  v_email    text;
begin
  if not public.can('users.invite') then
    raise exception 'You do not have permission to create accounts';
  end if;

  if v_username !~ '^[a-z0-9][a-z0-9._-]{2,29}$' then
    raise exception
      'A username must be 3-30 characters, lower-case, starting with a letter or number, using only letters, numbers, dot, dash or underscore.';
  end if;

  -- The internal address. Kept in step with usernameToEmail() on the client;
  -- changing the domain would orphan every existing login.
  v_email := coalesce(nullif(lower(trim(p_email)), ''), v_username || '@kco.local');

  if position('@' in v_email) < 2 then
    raise exception 'That email address is not valid';
  end if;

  if exists (select 1 from public.profiles where lower(username) = v_username) then
    raise exception 'The username "%" is already taken', v_username;
  end if;

  if exists (select 1 from public.profiles where lower(email) = v_email) then
    raise exception 'An account already exists for %', v_email;
  end if;

  -- Supersede any pending record for the same address rather than tripping
  -- the unique index, so retrying after a failed signup just works.
  update public.invitations
     set revoked_at = now()
   where lower(email) = v_email and accepted_at is null and revoked_at is null;

  insert into public.invitations
    (email, username, full_name, role, department, position, permissions, invited_by, note, expires_at)
  values
    (v_email, v_username, p_full_name, p_role, p_department, p_position,
     coalesce(p_permissions, '{}'), auth.uid(), coalesce(p_note, ''),
     -- Short window: the signup happens seconds later in the same request
     -- cycle. A day is generous and limits how long a half-created account
     -- can be claimed if the signup step fails.
     now() + interval '1 day')
  returning id into v_id;

  perform public.log_activity(
    'user.invited', 'invitation', v_id, v_username,
    jsonb_build_object('role', p_role, 'permissions', coalesce(p_permissions, '{}'))
  );

  return query select v_id, v_email;
end;
$$;

revoke execute on function public.admin_create_account(text, text, public.user_role, text, text, text[], text, text)
  from public, anon;
grant execute on function public.admin_create_account(text, text, public.user_role, text, text, text[], text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Cleaning up a failed creation.
--
-- If the signup step fails - a weak password, a network drop - the invitation
-- is left pending and the username looks taken. This lets the admin's browser
-- withdraw it so the same username can be retried immediately.
-- ---------------------------------------------------------------------------
create or replace function public.admin_discard_pending_account(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.can('users.invite') then
    raise exception 'You do not have permission to manage accounts';
  end if;

  delete from public.invitations
   where id = p_invitation_id and accepted_at is null;
end;
$$;

revoke execute on function public.admin_discard_pending_account(uuid) from public, anon;
grant execute on function public.admin_discard_pending_account(uuid) to authenticated;

-- A person may change their own username; the profiles_update_self policy
-- pins only role and status, so this needs no new policy. It does need the
-- format and uniqueness guarantees above, which the constraints provide.
