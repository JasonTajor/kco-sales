/**
 * The SQL that enables one-call account creation.
 *
 * Embedded so the Users & Access screen can offer it as a copy button rather
 * than asking somebody to find a file in the repository. It is the functional
 * core of `supabase/migrations/20260910091400_create_account_in_sql.sql`, with
 * the explanatory comments trimmed - the migration file remains the documented
 * source of truth.
 *
 * Both functions are `create or replace`, so pasting this twice is harmless.
 */
export const ACCOUNT_SETUP_SQL = `-- KCO LMS: create accounts without email confirmation.
-- Safe to run more than once.

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
as $fn$
declare
  v_username text := lower(trim(coalesce(p_username, '')));
  v_email    text;
  v_user_id  uuid := gen_random_uuid();
begin
  if not public.can('users.invite') then
    raise exception 'You do not have permission to create accounts';
  end if;

  if v_username !~ '^[a-z0-9][a-z0-9._-]{2,29}$' then
    raise exception 'A username must be 3-30 characters, lower-case, starting with a letter or number, using only letters, numbers, dot, dash or underscore.';
  end if;

  if p_password is null or length(p_password) < 8 then
    raise exception 'Choose a password of at least 8 characters.';
  end if;

  v_email := coalesce(nullif(lower(trim(p_email)), ''), v_username || '@kco.local');

  if exists (select 1 from public.profiles p where lower(p.username) = v_username) then
    raise exception 'The username "%" is already taken', v_username;
  end if;

  if exists (select 1 from auth.users u where lower(u.email) = v_email) then
    raise exception 'An account already exists for %', v_username;
  end if;

  update public.invitations i
     set revoked_at = now()
   where lower(i.email) = v_email and i.accepted_at is null and i.revoked_at is null;

  insert into public.invitations
    (email, username, full_name, role, department, position, permissions,
     invited_by, note, expires_at)
  values
    (v_email, v_username, p_full_name, p_role, p_department, p_position,
     coalesce(p_permissions, '{}'), auth.uid(), coalesce(p_note, ''),
     now() + interval '1 hour');

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', coalesce(nullif(trim(p_full_name), ''), v_username)),
    now(), now(), '', '', '', ''
  );

  -- auth.identities.email is a GENERATED column - do not insert into it.
  insert into auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    v_user_id::text, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email,
                       'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now()
  );

  if not exists (select 1 from public.profiles p where p.id = v_user_id) then
    raise exception 'The account was created but its profile was not. Nothing has been saved.';
  end if;

  perform public.log_activity(
    'user.created', 'profile', v_user_id, v_username,
    jsonb_build_object('role', p_role, 'permissions', coalesce(p_permissions, '{}'))
  );

  return query select v_username, v_email;
end;
$fn$;

create or replace function public.admin_set_user_password(
  p_user_id uuid,
  p_password text
) returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $fn$
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
  perform public.log_activity('user.password_reset', 'profile', p_user_id, v_name);
end;
$fn$;

revoke execute on function public.admin_create_user_account(text, text, text, public.user_role, text, text, text[], text, text) from public, anon;
grant  execute on function public.admin_create_user_account(text, text, text, public.user_role, text, text, text[], text, text) to authenticated;
revoke execute on function public.admin_set_user_password(uuid, text) from public, anon;
grant  execute on function public.admin_set_user_password(uuid, text) to authenticated;
`
