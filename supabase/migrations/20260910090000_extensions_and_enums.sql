-- ============================================================================
-- KCO Sales & Learning Management System
-- 0001 - Extensions, enums, and shared helper functions.
--
-- Every later migration depends on the vocabulary defined here. Enums are used
-- instead of free-text status columns so an invalid state cannot be written at
-- all, rather than being caught by application validation that a direct API
-- call would bypass.
-- ============================================================================

create extension if not exists "pgcrypto"  with schema extensions;  -- gen_random_uuid()
create extension if not exists "pg_trgm"   with schema extensions;  -- trigram search

-- ---------------------------------------------------------------- identity --

-- Exactly two roles (spec §8). Widening this is a deliberate migration, not a
-- config change, because every RLS policy in 0004 reads it.
create type public.user_role as enum ('admin', 'sales');

create type public.user_status as enum ('active', 'inactive', 'pending');

-- ----------------------------------------------------------------- content --

create type public.content_status as enum ('draft', 'published', 'archived');

create type public.difficulty as enum ('foundation', 'intermediate', 'advanced');

-- The block vocabulary the renderer understands. A block whose type is not in
-- this list cannot be stored, so the frontend never meets one it cannot draw.
create type public.block_type as enum (
  'heading',
  'text',
  'bullets',
  'numbered',
  'checklist',
  'callout',
  'dosdonts',
  'script',
  'comparison',
  'formula',
  'scenario',
  'quote',
  'quiz',
  'activity',
  'wording',
  'tip',
  'warning',
  'image',
  'video'
);

-- ------------------------------------------------------------- assessments --

create type public.question_type as enum (
  'multiple_choice',
  'true_false',
  'multiple_select',
  'short_answer'
);

create type public.attempt_status as enum ('in_progress', 'submitted', 'abandoned');

-- --------------------------------------------------------------- delivery ---

create type public.assignment_target as enum ('module', 'path', 'assessment', 'activity');

create type public.assignment_status as enum (
  'not-started',
  'in-progress',
  'completed',
  'overdue'
);

create type public.progress_state as enum ('not-started', 'in-progress', 'completed');

create type public.notification_kind as enum (
  'assignment',
  'announcement',
  'result',
  'content',
  'due',
  'mention'
);

create type public.announcement_priority as enum ('normal', 'important', 'critical');

-- ---------------------------------------------------------------- helpers ---

-- Keeps updated_at honest. Attached by trigger to every mutable table so an
-- application that forgets to set it cannot produce a stale timestamp.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
