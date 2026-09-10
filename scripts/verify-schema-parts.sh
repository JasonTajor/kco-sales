#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Proves the split schema parts are equivalent to the migrations.
#
# The parts are what gets pasted into the SQL Editor, so a splitter bug would
# be silent and expensive: a half-applied policy, or a function whose body was
# cut in two. This applies the parts in filename order to a throwaway database
# and then runs the full authorization suite against the result.
#
#   ./scripts/verify-schema-parts.sh
# ---------------------------------------------------------------------------
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTAINER=kco-parts-pg

cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=pg -e POSTGRES_DB=kco postgres:16-alpine >/dev/null
for _ in $(seq 1 60); do
  docker exec "$CONTAINER" pg_isready -U postgres -d kco >/dev/null 2>&1 && break
  sleep 0.5
done

psql_f() { docker exec -i "$CONTAINER" psql -q -v ON_ERROR_STOP=1 -U postgres -d kco -f - < "$1"; }

echo "==> Supabase stand-ins"
psql_f "$ROOT/supabase/tests/_supabase_auth_full.sql"

echo "==> applying schema PARTS in filename order"
for f in "$ROOT"/supabase/schema-parts/schema-[0-9]*.sql; do
  case "$(basename "$f")" in *99-verify*) continue ;; esac
  printf '    %-26s' "$(basename "$f")"
  psql_f "$f"
  echo "ok"
done

echo "==> post-apply check"
docker exec -i "$CONTAINER" psql -U postgres -d kco -f - \
  < "$ROOT/supabase/schema-parts/schema-99-verify.sql"

# The authorization suite creates its own fixtures and asserts exact row
# counts ("sales sees 1 of 3 modules"), so it has to run before the seed adds
# 17 more. It rolls itself back, so the seed below still starts clean.
echo "==> the full authorization suite, against the parts-built schema"
docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d kco -f - \
  < "$ROOT/supabase/tests/rls.test.sql" 2>&1 \
  | grep -E 'FAIL|ERROR|ALL TESTS PASSED' \
  | sed 's/^psql:<stdin>:[0-9]*: NOTICE:  //'

echo "    assertions passed: $(docker exec -i "$CONTAINER" psql -U postgres -d kco -f - \
  < "$ROOT/supabase/tests/rls.test.sql" 2>&1 | grep -c '  PASS' || true)"

echo "==> seed parts, on the parts-built schema"
for f in "$ROOT"/supabase/seed/parts/*.sql; do
  psql_f "$f" > /dev/null
done
docker exec -i "$CONTAINER" psql -t -A -U postgres -d kco -c \
  "select 'modules=' || count(*) from public.modules" | sed 's/^/    /'
docker exec -i "$CONTAINER" psql -t -A -U postgres -d kco -c \
  "select 'content_blocks=' || count(*) from public.content_blocks" | sed 's/^/    /'
