#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Generates supabase/seed/seed.sql from the authored content in src/data.
#
# The generator is TypeScript that imports the same modules the app does, so
# the seed cannot describe content the app could not render. esbuild bundles it
# (already present as a Vite dependency - no extra tooling) and Node runs it.
#
#   ./scripts/seed.sh
#
# Then apply the output: paste supabase/seed/seed.sql into the Supabase SQL
# Editor, or psql -f it. Safe to run repeatedly.
# ---------------------------------------------------------------------------
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

"$ROOT/node_modules/.bin/esbuild" "$ROOT/supabase/seed/generate.ts" \
  --bundle \
  --platform=node \
  --format=esm \
  --target=node20 \
  --alias:@="$ROOT/src" \
  --log-level=warning \
  --outfile="$TMP/generate.mjs"

# One file, for psql and the verification scripts.
node "$TMP/generate.mjs" > "$ROOT/supabase/seed/seed.sql"
echo "wrote supabase/seed/seed.sql ($(wc -l < "$ROOT/supabase/seed/seed.sql") lines, $(du -h "$ROOT/supabase/seed/seed.sql" | cut -f1))"

# Split parts, for the Supabase SQL Editor, which refuses to save a snippet
# this large. Same content, same order, one transaction per part.
rm -rf "$ROOT/supabase/seed/parts"
echo "wrote supabase/seed/parts/"
node "$TMP/generate.mjs" --out-dir "$ROOT/supabase/seed/parts"
