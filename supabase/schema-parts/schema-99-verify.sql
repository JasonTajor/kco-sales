-- ===========================================================================
-- Post-apply check. Measured on a clean apply of every migration:
--
--   tables 35 | views 2 | enums 12 | policies 77 | functions 33
--
-- and every table with RLS enabled.
--
-- tables_without_rls MUST be 0; anything else means a table is exposed.
-- A zero in any other column means something did not apply.
-- ===========================================================================
select
  (select count(*) from pg_tables  where schemaname = 'public')            as tables,
  (select count(*) from pg_views   where schemaname = 'public')            as views,
  (select count(*) from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typtype = 'e')                        as enums,
  (select count(*) from pg_policies where schemaname = 'public')           as policies,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public')                                            as functions,
  (select count(*) from pg_tables where schemaname = 'public' and not rowsecurity)
                                                                           as tables_without_rls;
