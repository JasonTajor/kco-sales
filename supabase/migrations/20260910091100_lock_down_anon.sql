-- ============================================================================
-- 0012 - Re-lock the privilege layer against `anon`.
--
-- THE BUG THIS FIXES
--
-- Migration 0007 runs `revoke all on all tables in schema public from anon`.
-- That reads like a policy but it is a point-in-time statement: it affects the
-- tables that exist when it runs, and nothing else.
--
-- Supabase ships `alter default privileges in schema public grant all on
-- tables to anon, authenticated`. So every table created by a LATER migration
-- silently arrives with anon privileges restored. 0011 added four tables
-- (permissions, role_permissions, user_permissions, invitations) and all four
-- came back readable at the privilege layer.
--
-- Row Level Security still held - `permissions_select` requires
-- `is_active_user()`, which is false for anon, so the response was an empty
-- array rather than data. Nothing leaked. But "denied before any policy is
-- consulted" is the posture the rest of the schema has, and losing it on a
-- subset of tables is exactly the kind of asymmetry that becomes a real hole
-- the first time somebody adds a table with a laxer policy.
--
-- WHAT TO DO IN FUTURE MIGRATIONS
--
-- End any migration that creates a table with:
--
--     select public.revoke_anon_access();
--
-- The test suite asserts that no table in `public` is readable by anon, so
-- forgetting is a test failure rather than a silent regression.
-- ============================================================================

/**
 * Strips every `anon` privilege across the public schema.
 *
 * Written as a function rather than a bare statement so later migrations have
 * one thing to call, and so the intent is named. It is deliberately
 * idempotent: running it when there is nothing to revoke is a no-op.
 *
 * Note this does NOT touch `authenticated`. That role keeps its table
 * privileges and is constrained by RLS - which is the design. `anon` is
 * different: nothing in this product is public, so an unauthenticated request
 * should fail before a policy is even evaluated.
 */
create or replace function public.revoke_anon_access()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  revoke all on all tables    in schema public from anon;
  revoke all on all sequences in schema public from anon;

  -- Functions are EXECUTE-able by PUBLIC unless told otherwise, and `anon`
  -- inherits that, so the role has to be revoked from PUBLIC as well.
  revoke all on all functions in schema public from public, anon;

  -- Hand back the two functions an unauthenticated visitor legitimately needs:
  -- the sign-in screen checks whether an address has an open invitation before
  -- asking for a password.
  grant execute on function public.invitation_exists(text) to anon;
end;
$$;

comment on function public.revoke_anon_access() is
  'Removes every anon privilege in the public schema. Call at the end of any '
  'migration that creates a table - Supabase default privileges re-grant anon '
  'access to new tables, which 0007''s one-off REVOKE cannot cover.';

-- Apply it now, catching the four tables 0011 created.
select public.revoke_anon_access();

-- The helper itself must not be callable by anon.
revoke execute on function public.revoke_anon_access() from public, anon;

-- Restore the EXECUTE grants that the blanket revoke above just removed from
-- `authenticated`. Listed explicitly rather than re-granted wholesale, so the
-- set of functions a signed-in user may call stays an audited list.
grant execute on function public.is_admin()                                    to authenticated;
grant execute on function public.is_active_user()                              to authenticated;
grant execute on function public.can(text)                                     to authenticated;
grant execute on function public.my_permissions()                              to authenticated;
grant execute on function public.log_activity(text, text, uuid, text, jsonb)   to authenticated;
grant execute on function public.touch_last_login()                            to authenticated;
grant execute on function public.complete_lesson(uuid, boolean)                to authenticated;
grant execute on function public.touch_module_view(uuid, uuid)                 to authenticated;
grant execute on function public.start_assessment_attempt(uuid)                to authenticated;
grant execute on function public.submit_assessment_attempt(uuid)               to authenticated;
grant execute on function public.save_answer(uuid, uuid, uuid[], text)         to authenticated;
grant execute on function public.attempt_review(uuid)                          to authenticated;
grant execute on function public.my_progress_summary()                          to authenticated;
grant execute on function public.admin_dashboard_stats()                        to authenticated;
grant execute on function public.report_training_completion()                   to authenticated;
grant execute on function public.report_assessment_performance()                to authenticated;
grant execute on function public.report_module_engagement()                     to authenticated;
grant execute on function public.admin_assign(uuid[], public.assignment_target, uuid, timestamptz, text)
                                                                                to authenticated;
grant execute on function public.admin_set_user_role(uuid, public.user_role)    to authenticated;
grant execute on function public.admin_set_user_status(uuid, public.user_status) to authenticated;
grant execute on function public.admin_save_question(uuid, uuid, public.question_type, text, text, int, int, text, jsonb)
                                                                                to authenticated;
grant execute on function public.admin_invite_user(text, text, public.user_role, text, text, text[], text)
                                                                                to authenticated;
grant execute on function public.admin_revoke_invitation(uuid)                  to authenticated;
grant execute on function public.admin_set_permission(uuid, text, boolean, text) to authenticated;
grant execute on function public.assignment_effective_status(public.assignment_status, timestamptz)
                                                                                to authenticated;
grant execute on function public.invitation_exists(text)                        to authenticated;
grant execute on function public.validate_question_choices(uuid)                to authenticated;
