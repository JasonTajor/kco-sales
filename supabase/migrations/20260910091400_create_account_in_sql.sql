-- ============================================================================
-- 0015 - Create a confirmed account entirely in SQL.
--
-- WHY
--
-- Creating an account had two routes and both needed something from outside
-- the database:
--
--   * `signUp` from the browser - which, with "Confirm email" enabled, tries
--     to mail a confirmation to an address that has no mailbox. It fails with
--     'Email address "andrea@kco.local" is invalid', then rate-limits.
--   * An Edge Function holding the service-role key - which works, but has to
--     be deployed first.
--
-- There is a third route that needs neither: write the auth identity here.
-- `bootstrap-admin.sql` already does exactly this to create the first
-- administrator, with a bcrypt hash GoTrue accepts and `email_confirmed_at`
-- set so no confirmation is outstanding. A SECURITY DEFINER function can do
-- the same on demand.
--
-- The result: an admin creates a working account with one ordinary RPC call.
-- No mail is attempted, no project setting matters, no function to deploy, and
-- the service-role key stays out of everything.
--
-- WHAT MAKES THIS SAFE
--
-- This function can create an administrator, so its guard is the whole story:
--
--   * It refuses unless the caller holds `users.invite`, which by default only
--     the admin role has. That is the same check `admin_create_account` makes,
--     and it is made here rather than delegated, because a definer function
--     must not assume its caller was already vetted.
--   * It cannot grant an account more than the caller could grant through the
--     normal path - role and permissions come from the same validated
--     arguments.
--   * It writes an audit entry naming the real caller, not the definer.
--   * It never returns or logs the password.
--
-- KNOWN TRADE-OFF
--
-- Writing to `auth.users` couples this to GoTrue's schema. The columns used
-- below are the long-stable ones, and `auth.identities.email` is deliberately
-- omitted because it is a generated column - inserting into it fails, which is
-- exactly the bug this project already hit once in bootstrap-admin.sql. If a
-- future GoTrue release changes the shape, this function is the single place
-- to update, and supabase/tests/_supabase_auth_full.sql is the stub that would
-- catch it.
-- ============================================================================

create or replace function public.admin_create_user_account(
  p_username    text,
  p_password    text,
  p_full_name   text default null,
  p_role        public.user_role default 'sales',
  p_department  text default null,
  p_position    text default null,
  p_permissions text[] default '{}',
  p_email       text default null,
  p_note        text default ''
) returns table (username text, login_email text)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_username text := lower(trim(coalesce(p_username, '')));
  v_email    text;
  v_user_id  uuid := gen_random_uuid();
  v_invite   uuid;
begin
  -- The guard. Everything below this line runs with the owner's privileges,
  -- so this check is the only thing standing between a sales user and the
  -- ability to mint an administrator.
  if not public.can('users.invite') then
    raise exception 'You do not have permission to create accounts';
  end if;

  if v_username !~ '^[a-z0-9][a-z0-9._-]{2,29}$' then
    raise exception
      'A username must be 3-30 characters, lower-case, starting with a letter or number, using only letters, numbers, dot, dash or underscore.';
  end if;

  -- Matched to GoTrue's own minimum so a password set here behaves the same as
  -- one set through the API.
  if p_password is null or length(p_password) < 8 then
    raise exception 'Choose a password of at least 8 characters.';
  end if;

  -- Kept in step with usernameToEmail() on the client and with
  -- admin_create_account. Changing the domain orphans existing logins.
  v_email := coalesce(nullif(lower(trim(p_email)), ''), v_username || '@kco.local');

  -- Table references are aliased throughout this function: the OUT columns
  -- are named `username` and `login_email`, so a bare `username` in a WHERE
  -- clause is ambiguous between the output and the table.
  if exists (select 1 from public.profiles p where lower(p.username) = v_username) then
    raise exception 'The username "%" is already taken', v_username;
  end if;

  if exists (select 1 from auth.users u where lower(u.email) = v_email) then
    raise exception 'An account already exists for %', v_username;
  end if;

  -- The invitation. `handle_new_user` requires one, and it is what carries the
  -- role, team and permissions onto the new profile - so the account cannot be
  -- created with access the caller did not specify here.
  update public.invitations i
     set revoked_at = now()
   where lower(i.email) = v_email and i.accepted_at is null and i.revoked_at is null;

  insert into public.invitations
    (email, username, full_name, role, department, position, permissions,
     invited_by, note, expires_at)
  values
    (v_email, v_username, p_full_name, p_role, p_department, p_position,
     coalesce(p_permissions, '{}'), auth.uid(), coalesce(p_note, ''),
     now() + interval '1 hour')
  returning id into v_invite;

  -- The auth identity.
  --
  -- `crypt(..., gen_salt('bf'))` produces the bcrypt hash GoTrue verifies
  -- against, so password sign-in works immediately. `email_confirmed_at` is
  -- set because there is no mailbox to confirm from - which is the entire
  -- reason this function exists rather than calling signUp.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', coalesce(nullif(trim(p_full_name), ''), v_username)),
    now(), now(),
    '', '', '', ''
  );

  -- The email identity row GoTrue creates on a normal signup. `email` is
  -- omitted on purpose: it is a generated column, and inserting into it fails.
  insert into auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    v_user_id::text,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email,
                       'email_verified', true, 'phone_verified', false),
    'email',
    now(), now(), now()
  );

  -- The insert above fired `on_auth_user_created`, which consumed the
  -- invitation and produced an active profile. Confirm that rather than assume
  -- it: a silent failure here would leave an auth user with no profile, which
  -- signs in to an empty application.
  if not exists (select 1 from public.profiles p where p.id = v_user_id) then
    raise exception 'The account was created but its profile was not. Nothing has been saved.';
  end if;

  perform public.log_activity(
    'user.created', 'profile', v_user_id, v_username,
    jsonb_build_object('role', p_role, 'permissions', coalesce(p_permissions, '{}'))
  );

  return query select v_username, v_email;
end;
$$;

comment on function public.admin_create_user_account(text, text, text, public.user_role, text, text, text[], text, text) is
  'Creates a confirmed account in one call. Requires users.invite. Writes '
  'auth.users directly so no confirmation mail is attempted and no '
  'service-role key is needed.';

revoke execute on function public.admin_create_user_account(text, text, text, public.user_role, text, text, text[], text, text)
  from public, anon;
grant execute on function public.admin_create_user_account(text, text, text, public.user_role, text, text, text[], text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Setting somebody's password.
--
-- The companion to the above: a password created this way cannot be recovered,
-- so an admin needs a way to set a new one. Same guard, same reasoning.
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_user_password(
  p_user_id  uuid,
  p_password text
) returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare v_name text;
begin
  if not public.can('users.edit') then
    raise exception 'You do not have permission to change passwords';
  end if;

  if p_password is null or length(p_password) < 8 then
    raise exception 'Choose a password of at least 8 characters.';
  end if;

  select p.full_name into v_name from public.profiles p where p.id = p_user_id;
  if v_name is null then
    raise exception 'No such user';
  end if;

  update auth.users u
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
         updated_at = now()
   where u.id = p_user_id;

  -- Deliberately not logged with the password, obviously - only that it
  -- happened, and to whom.
  perform public.log_activity('user.password_reset', 'profile', p_user_id, v_name);
end;
$$;

revoke execute on function public.admin_set_user_password(uuid, text) from public, anon;
grant execute on function public.admin_set_user_password(uuid, text) to authenticated;
