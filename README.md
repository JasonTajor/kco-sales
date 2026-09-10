# KCO Sales & Learning Management System

Internal training platform for the Kangkong Chips Original sales and chat
support team. Learning materials, practice scenarios, objection handling,
assessments, and progress tracking.

Not a public website. Sign-up is closed — accounts are created by an
administrator.

## Stack

React 19 · Vite · TypeScript · Tailwind 4 · Supabase (Postgres, Auth, Storage)

## Running locally

```bash
npm install
cp .env.example .env.local     # fill in your Supabase project values
npm run dev
```

With no `.env.local` the app runs in **demo mode** against an in-browser store
and says so on the sign-in screen. Nothing is written to a server in that mode.

```bash
npm run build       # typecheck + production build
npm run typecheck   # types only
```

## Database

Everything the database needs is in `supabase/`, and it is reproducible from
scratch:

| Path | What it is |
| ---- | ---------- |
| `migrations/` | 13 migrations — the source of truth for the schema |
| `schema-parts/` | The same schema split for the Supabase SQL Editor |
| `seed/parts/` | Training content, in pasteable parts |
| `tests/rls.test.sql` | 126 authorization assertions |

Setup is documented step by step in **[docs/SUPABASE.md](docs/SUPABASE.md)**.
Access control — roles, the 30 permissions, and invitation-only signup — is in
**[docs/ACCESS-CONTROL.md](docs/ACCESS-CONTROL.md)**.

### Verifying it

These need Docker but no Supabase project and no Supabase CLI. They stand up a
throwaway Postgres, apply the migrations, and prove the authorization rules:

```bash
./scripts/verify-db.sh            # migrations, then 126 assertions
./scripts/verify-schema-parts.sh  # the split parts build the same database
./scripts/verify-seed.sh          # seed is idempotent across three runs
./scripts/gen-db-types.sh         # regenerate src/types/database.ts
```

Run `verify-db.sh` after touching anything in `supabase/migrations/`. Every
security bug found in this schema so far was found by that suite rather than by
reading the SQL.

## Security

- **Row Level Security is the boundary.** Route guards and sidebar filtering
  are usability; the policies in `supabase/migrations/` are what actually
  enforce access, and they are tested without any client involved.
- **Assessment answer keys are withheld at the column level.** A learner's
  client holds no query that returns them — not a filtered one, not a crafted
  one. Scoring happens server-side; the key is released only for a submitted
  attempt, by `attempt_review()`.
- **Only the publishable key reaches the browser.** Vite inlines every `VITE_`
  variable into the bundle, so the service-role key must never be one. It is
  not needed anywhere in this codebase.
- **Nobody signs themselves up.** An admin records an invitation carrying a
  role and a permission set; the person sets their own password against it.

## Deployment

Vercel, configured by `vercel.json`. Set two environment variables in the
project:

```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Then add the deployment URL to Supabase under **Authentication → URL
Configuration** as the Site URL, and `https://YOUR-DOMAIN/auth/callback` as a
redirect URL, or Google sign-in and password resets will bounce.

## Content

The training material is transcribed from the company's own documents. Seven
modules from the §43 outline are seeded as empty drafts because their source
documents were not supplied, and the Sales Bible ships with every value null —
both render as **"Admin content required"** rather than inventing a price, a
flavour list, or a policy. An admin fills them in through the CMS.
