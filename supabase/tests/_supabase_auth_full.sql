-- ---------------------------------------------------------------------------
-- A realistic stand-in for Supabase's auth schema.
--
-- Used only to test supabase/bootstrap-admin.sql, which writes into auth.users
-- and auth.identities directly. The minimal stub in _supabase_stub.sql is
-- enough for the RLS suite but would let a bootstrap script pass while missing
-- columns that a real GoTrue table declares NOT NULL.
--
-- Column set follows GoTrue's schema as of 2024-2025 releases.
-- ---------------------------------------------------------------------------
create schema if not exists auth;
create schema if not exists storage;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists auth.users (
  instance_id                 uuid,
  id                          uuid primary key,
  aud                         varchar(255),
  role                        varchar(255),
  email                       varchar(255) unique,
  encrypted_password          varchar(255),
  email_confirmed_at          timestamptz,
  invited_at                  timestamptz,
  confirmation_token          varchar(255) default '',
  confirmation_sent_at        timestamptz,
  recovery_token              varchar(255) default '',
  recovery_sent_at            timestamptz,
  email_change_token_new      varchar(255) default '',
  email_change                varchar(255) default '',
  email_change_sent_at        timestamptz,
  last_sign_in_at             timestamptz,
  raw_app_meta_data           jsonb,
  raw_user_meta_data          jsonb,
  is_super_admin              boolean,
  created_at                  timestamptz,
  updated_at                  timestamptz,
  phone                       text unique default null,
  phone_confirmed_at          timestamptz,
  phone_change                text default '',
  phone_change_token          varchar(255) default '',
  phone_change_sent_at        timestamptz,
  email_change_token_current  varchar(255) default '',
  email_change_confirm_status smallint default 0,
  banned_until                timestamptz,
  reauthentication_token      varchar(255) default '',
  reauthentication_sent_at    timestamptz,
  is_sso_user                 boolean not null default false,
  deleted_at                  timestamptz,
  is_anonymous                boolean not null default false
);

create table if not exists auth.identities (
  provider_id     text not null,
  user_id         uuid not null references auth.users (id) on delete cascade,
  identity_data   jsonb not null,
  provider        text not null,
  last_sign_in_at timestamptz,
  created_at      timestamptz,
  updated_at      timestamptz,
  -- GENERATED, exactly as Supabase declares it. Modelling this as a plain
  -- column is what let a bootstrap script pass here and fail against a real
  -- project with "cannot insert a non-DEFAULT value into column email".
  email           text generated always as (lower(identity_data ->> 'email')) stored,
  id              uuid primary key default gen_random_uuid(),
  constraint identities_provider_id_provider_unique unique (provider_id, provider)
);

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create table if not exists storage.buckets (
  id text primary key, name text not null, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[], created_at timestamptz default now()
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id), name text, owner uuid,
  created_at timestamptz default now()
);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[]
language sql immutable as $$ select string_to_array(name, '/'); $$;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;

grant usage on schema public, extensions, storage, auth to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
