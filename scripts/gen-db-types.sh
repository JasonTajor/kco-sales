#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Generates src/types/database.ts by introspecting a live database.
#
# The Supabase CLI's `gen types` does the same job against a linked project;
# this works without the CLI and against the throwaway verification database,
# so the types can never drift from the migrations in this repo.
#
#   ./scripts/gen-db-types.sh                 # spins up a temp DB from migrations
#   ./scripts/gen-db-types.sh "$DATABASE_URL" # or point at a real one
# ---------------------------------------------------------------------------
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTAINER=kco-types-pg
OUT="$ROOT/src/types/database.ts"

if [ $# -ge 1 ]; then
  PSQL=(psql "$1")
else
  cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
  trap cleanup EXIT
  cleanup
  docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=pg -e POSTGRES_DB=kco postgres:16-alpine >/dev/null
  for _ in $(seq 1 60); do
    docker exec "$CONTAINER" pg_isready -U postgres -d kco >/dev/null 2>&1 && break
    sleep 0.5
  done
  docker exec -i "$CONTAINER" psql -q -v ON_ERROR_STOP=1 -U postgres -d kco -f - \
    < "$ROOT/supabase/tests/_supabase_auth_full.sql"
  for f in "$ROOT"/supabase/migrations/*.sql; do
    docker exec -i "$CONTAINER" psql -q -v ON_ERROR_STOP=1 -U postgres -d kco -f - < "$f"
  done
  PSQL=(docker exec -i "$CONTAINER" psql -q -t -A -U postgres -d kco)
fi

"${PSQL[@]}" -f - < "$ROOT/scripts/gen-db-types.sql" > "$OUT"
echo "wrote $OUT ($(wc -l < "$OUT") lines)"
