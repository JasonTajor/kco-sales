#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Applies every migration to a throwaway Postgres and runs the RLS test suite.
#
# This exists so the schema and its authorization rules can be verified without
# a Supabase project. It stands up the small part of a Supabase instance the
# migrations touch (auth.users, auth.uid(), storage.objects, the anon and
# authenticated roles) and nothing else.
#
#   ./scripts/verify-db.sh
#
# Requires Docker. Leaves no container behind.
# ---------------------------------------------------------------------------
set -euo pipefail

CONTAINER=kco-verify-pg
IMAGE=postgres:16-alpine
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

echo "==> starting $IMAGE"
docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=pg -e POSTGRES_DB=kco "$IMAGE" >/dev/null

for _ in $(seq 1 60); do
  docker exec "$CONTAINER" pg_isready -U postgres -d kco >/dev/null 2>&1 && break
  sleep 0.5
done

psql_f() { docker exec -i "$CONTAINER" psql -q -v ON_ERROR_STOP=1 -U postgres -d kco -f - < "$1"; }

echo "==> creating Supabase stand-ins (full auth schema)"
# The realistic auth schema, not the minimal stub. It declares
# auth.identities.email as GENERATED and auth.users with its full column set,
# which is what catches functions that write to auth directly - the class of
# bug that shipped once already in bootstrap-admin.sql.
psql_f "$ROOT/supabase/tests/_supabase_auth_full.sql"

echo "==> applying migrations"
for f in "$ROOT"/supabase/migrations/*.sql; do
  printf '    %-58s' "$(basename "$f")"
  psql_f "$f"
  echo "ok"
done

echo "==> running RLS test suite"
docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d kco -f - \
  < "$ROOT/supabase/tests/rls.test.sql" 2>&1 \
  | grep -E 'PASS|FAIL|ERROR|===' \
  | sed 's/^psql:<stdin>:[0-9]*: NOTICE:  //'
