#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# End-to-end check: fresh Postgres -> migrations -> seed -> seed twice again.
#
# Running the seed a second time is the point of this script. §42 requires the
# seed to be re-runnable without creating duplicates, and the only convincing
# way to show that is to run it twice and prove the row counts are identical.
#
#   ./scripts/verify-seed.sh
# ---------------------------------------------------------------------------
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTAINER=kco-seed-pg

cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=pg -e POSTGRES_DB=kco postgres:16-alpine >/dev/null
for _ in $(seq 1 60); do
  docker exec "$CONTAINER" pg_isready -U postgres -d kco >/dev/null 2>&1 && break
  sleep 0.5
done

psql_f() { docker exec -i "$CONTAINER" psql -q -v ON_ERROR_STOP=1 -U postgres -d kco -f - < "$1"; }
psql_c() { docker exec -i "$CONTAINER" psql -t -A -U postgres -d kco -c "$1"; }

echo "==> schema"
psql_f "$ROOT/supabase/tests/_supabase_auth_full.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do psql_f "$f"; done

echo "==> seed (first run, from the split parts in filename order)"
# Applying the parts rather than seed.sql is deliberate: the parts are what
# gets pasted into the SQL Editor, so they are what needs proving. seed.sql is
# checked against them below.
for f in "$ROOT"/supabase/seed/parts/*.sql; do
  docker exec -i "$CONTAINER" psql -q -v ON_ERROR_STOP=1 -U postgres -d kco -f - < "$f" > /dev/null
done
FIRST=$(psql_c "select string_agg(t || '=' || n, ' ' order by t) from (
  select 'cat' t, count(*) n from public.categories
  union all select 'mod', count(*) from public.modules
  union all select 'les', count(*) from public.lessons
  union all select 'blk', count(*) from public.content_blocks
  union all select 'pth', count(*) from public.learning_paths
  union all select 'pit', count(*) from public.learning_path_items
  union all select 'ass', count(*) from public.assessments
  union all select 'qst', count(*) from public.assessment_questions
  union all select 'chc', count(*) from public.assessment_choices
  union all select 'act', count(*) from public.training_activities
  union all select 'scn', count(*) from public.practice_scenarios
  union all select 'obj', count(*) from public.objections
  union all select 'scr', count(*) from public.scripts
  union all select 'wrd', count(*) from public.wording_pairs
  union all select 'qrf', count(*) from public.quick_reference_items
  union all select 'cmp', count(*) from public.competencies
  union all select 'bib', count(*) from public.sales_bible_entries
) x")

echo "==> seed (parts again, then the single file - must not duplicate)"
for f in "$ROOT"/supabase/seed/parts/*.sql; do
  docker exec -i "$CONTAINER" psql -q -v ON_ERROR_STOP=1 -U postgres -d kco -f - < "$f" > /dev/null
done
# The single file must land on exactly the same rows as the parts, or the two
# outputs have drifted and one of them is wrong.
docker exec -i "$CONTAINER" psql -q -v ON_ERROR_STOP=1 -U postgres -d kco -f - \
  < "$ROOT/supabase/seed/seed.sql" > /dev/null
THIRD=$(psql_c "select string_agg(t || '=' || n, ' ' order by t) from (
  select 'cat' t, count(*) n from public.categories
  union all select 'mod', count(*) from public.modules
  union all select 'les', count(*) from public.lessons
  union all select 'blk', count(*) from public.content_blocks
  union all select 'pth', count(*) from public.learning_paths
  union all select 'pit', count(*) from public.learning_path_items
  union all select 'ass', count(*) from public.assessments
  union all select 'qst', count(*) from public.assessment_questions
  union all select 'chc', count(*) from public.assessment_choices
  union all select 'act', count(*) from public.training_activities
  union all select 'scn', count(*) from public.practice_scenarios
  union all select 'obj', count(*) from public.objections
  union all select 'scr', count(*) from public.scripts
  union all select 'wrd', count(*) from public.wording_pairs
  union all select 'qrf', count(*) from public.quick_reference_items
  union all select 'cmp', count(*) from public.competencies
  union all select 'bib', count(*) from public.sales_bible_entries
) x")

echo
echo "run 1: $FIRST"
echo "run 3: $THIRD"
if [ "$FIRST" = "$THIRD" ]; then
  echo "IDEMPOTENT: row counts identical after three runs"
else
  echo "NOT IDEMPOTENT - the seed created duplicates"; exit 1
fi

echo
echo "==> integrity checks (all must be 0)"
docker exec -i "$CONTAINER" psql -U postgres -d kco -c "
select 'lessons with no module' as check, count(*) from public.lessons l
  left join public.modules m on m.id = l.module_id where m.id is null
union all
select 'blocks with no lesson', count(*) from public.content_blocks b
  left join public.lessons l on l.id = b.lesson_id where l.id is null
union all
select 'path items with no module', count(*) from public.learning_path_items i
  left join public.modules m on m.id = i.module_id
  where i.module_id is not null and m.id is null
union all
select 'questions with no correct choice', count(*) from public.assessment_questions q
  where q.type <> 'short_answer'
    and not exists (select 1 from public.assessment_choices c
                     where c.question_id = q.id and c.is_correct)
union all
select 'questions with 2+ correct choices', count(*) from public.assessment_questions q
  where q.type in ('multiple_choice','true_false')
    and (select count(*) from public.assessment_choices c
          where c.question_id = q.id and c.is_correct) > 1
union all
select 'published modules with no lessons', count(*) from public.modules m
  where m.status = 'published'
    and not exists (select 1 from public.lessons l where l.module_id = m.id)
union all
select 'modules with no category', count(*) from public.modules where category_id is null
union all
select 'duplicate module slugs', count(*) from (
  select slug from public.modules group by slug having count(*) > 1) d
union all
select 'sales bible entries with invented values', count(*)
  from public.sales_bible_entries where value is not null and not verified;
"
