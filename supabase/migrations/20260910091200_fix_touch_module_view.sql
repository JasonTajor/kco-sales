-- ============================================================================
-- 0013 - Fix touch_module_view: an uncast enum in ON CONFLICT DO UPDATE.
--
-- THE BUG
--
-- Recording that a learner opened a module failed with:
--
--     42804: column "state" is of type progress_state
--            but expression is of type text
--
-- from this line in 0009:
--
--     state = case when mp.state = 'completed' then 'completed'
--                  else 'in-progress' end
--
-- The literals in a CASE are untyped, and Postgres resolves them to `text`.
-- In the INSERT above it that is fine - the target column's type is known, so
-- the literal is coerced. Inside `ON CONFLICT DO UPDATE SET`, the CASE is
-- resolved before it is matched to the column, so it stays text and the
-- assignment is rejected.
--
-- It broke every module open, which is the first thing a learner does. It got
-- through because the test suite exercised `complete_lesson` (which assigns
-- through a typed plpgsql variable, so it coerces correctly) but never called
-- `touch_module_view` at all. The suite now calls it - see rls.test.sql.
--
-- NOTE ON URGENCY
--
-- The application no longer calls this function. `progressService.openMaterial`
-- does the same read-then-upsert directly against `module_progress`, which the
-- `module_progress_own` policy already permits - so a learner is not blocked
-- on this migration being applied.
--
-- It is still worth applying: the function is part of the schema, anything
-- else that calls it would hit the same error, and leaving a known-broken
-- function in place is how it gets called again by accident.
-- ============================================================================

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
        -- Cast explicitly. A CASE resolves its own type before being matched
        -- to the target column, so untyped literals here come out as text and
        -- the assignment fails.
        --
        -- Viewing must never downgrade a finished module back to in-progress.
        state = case
                  when mp.state = 'completed' then 'completed'::public.progress_state
                  else 'in-progress'::public.progress_state
                end;
end;
$$;

revoke execute on function public.touch_module_view(uuid, uuid) from public, anon;
grant execute on function public.touch_module_view(uuid, uuid) to authenticated;
