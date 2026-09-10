# Connecting the LMS to Supabase

Everything in `supabase/` is written and verified against a real Postgres, but
it has not been applied to a live project yet. This is the whole procedure.

**Time:** about 15 minutes, most of it waiting for the project to provision.

---

## 0. Use a dedicated project

> **The migrations must go into a Supabase project that hosts nothing else.**

Two reasons, both load-bearing:

- `0007_rls.sql` runs `revoke all on all tables in schema public from anon` and
  `revoke all on all functions in schema public from public, anon`. These are
  **schema-wide**. In a database shared with another application they would
  strip anonymous access from that application's tables and functions too.
- `0002_profiles.sql` creates `public.profiles`, which collides with the table
  most Supabase starter templates already define.

The existing project `xhuzrhggvovoimmqdcdu` already hosts a storefront
(`profiles`, `coupons`, `orders`, `order_items`, `raw_ingredients`) and must
**not** be used.

Create a new project: <https://supabase.com/dashboard> → **New project**.
Pick the region closest to your team; the free tier is sufficient.

---

## 1. Apply the schema

The schema is 156 kB. The Supabase SQL Editor rejects a snippet that size with
**"request entity too large"**, so it ships pre-split into **7 parts** under
`supabase/schema-parts/`, each about 25 kB.

**Paste and run them in filename order**, `schema-01.sql` through
`schema-07.sql`, then `schema-99-verify.sql`.

The split is done by `scripts/split-sql.py`, which walks the SQL properly -
tracking line comments, nested block comments, single-quoted strings and
dollar-quoted bodies - so it only ever breaks *between* top-level statements.
That matters because every trigger function and DO block in this schema is
dollar-quoted and full of semicolons; a naive split at a byte offset would cut
a function in half.

> Unlike the seed, these parts are **not** individually re-runnable. They
> create objects, so a second run raises "already exists". If you need to start
> over: `drop schema public cascade; create schema public;` then run from part
> 1 again.

`schema-99-verify.sql` prints the post-apply check. Expect:

| tables | views | enums | policies | functions | tables_without_rls |
| ------ | ----- | ----- | -------- | --------- | ------------------ |
| 35     | 2     | 12    | 77       | 33        | **0**              |

`tables_without_rls` **must** be 0. Anything else means a table is exposed.

`supabase/schema.sql` is the same schema as one file, wrapped in a single
transaction, for `psql -f` and CI. You do not need it in the dashboard.

Both outputs are regenerated from `supabase/migrations/*.sql` by
`./scripts/bundle-schema.sh`.

### Proving the split is faithful

A splitter bug would be silent and expensive - a policy half-applied, a
function body cut in two. So it is tested rather than trusted:

```bash
./scripts/verify-schema-parts.sh
```

That applies the **parts** in filename order to a throwaway Postgres, runs the
post-apply check, then runs all 110 authorization assertions against the
resulting database, then applies the seed parts on top. If the split were
wrong, the suite would fail.

### Already applied the schema before 2026-09-10?

Migration `20260910091100_lock_down_anon.sql` is newer than the first bundle.
It closes a real gap: `0007`'s `revoke all ... from anon` is a point-in-time
statement, so the four tables migration `0011` created afterwards came back
readable by anonymous requests (Supabase default privileges re-grant them).

Row Level Security still held - the responses were empty, nothing leaked - but
the privilege layer should deny before a policy is consulted.

**Paste `supabase/migrations/20260910091100_lock_down_anon.sql` on its own.**
No need to re-run anything else. It is safe on a database that already has it.

From then on, end any migration that creates a table with:

```sql
select public.revoke_anon_access();
```

The test suite asserts anon is denied SELECT on *every* table in `public` by
iterating the catalog, so forgetting is a test failure rather than a silent
regression. Naming tables one at a time is what missed it the first time.

## 2. Load the training content

The full seed is 232 kB, which the SQL Editor refuses to save as a snippet. It
is therefore emitted as **24 parts** under `supabase/seed/parts/`, the largest
28 kB.

**Paste and run them in filename order.** `supabase/seed/parts/README.md` lists
them with sizes; the order matters because a module references a category and a
lesson references a module, so out of order fails on a foreign key.

```
01-categories.sql
02-01-module-phone-etiquette.sql   …through…   02-10-module-legacy-call-scripts-2025.sql
03-module-stubs.sql
04-learning-paths.sql
05-assessments.sql
06-training-activities.sql
07-practice-scenarios.sql
08-objections.sql
09-scripts.sql
10-wording.sql
11-quick-reference.sql
12-competencies.sql
13-sales-bible.sql
99-verify.sql          ← read-only; prints the counts below
```

Each part is its own transaction and is individually idempotent, so re-running
one is safe and a failure part-way leaves the earlier parts applied.

`supabase/seed/seed.sql` is the same content as one file, for `psql -f` and the
verification scripts. `./scripts/verify-seed.sh` applies the **parts** — since
those are what you actually paste — and then checks the single file lands on
identical rows, so the two cannot drift.

Regenerate both after editing anything under `src/data/` with `./scripts/seed.sh`.

It seeds **content only** - no users, no progress, no assessment attempts.
Those belong to real people using the system.

Expected counts from `99-verify.sql`:

| what | rows |
| ---- | ---- |
| categories | 6 |
| modules | 17 (10 with content, 7 drafts awaiting source documents) |
| lessons | 83 |
| content blocks | 231 |
| learning paths / path items | 4 / 14 |
| assessments / questions / choices | 4 / 21 / 84 |
| training activities | 8 |
| practice scenarios | 9 |
| objections | 12 |
| scripts | 22 |
| wording pairs | 26 |
| quick reference cards | 10 |
| competencies | 14 |
| Sales Bible entries | 24 (all values null - see below) |

The second query in `99-verify.sql` is the integrity check. Every row must be
**0**.

### Why the Sales Bible is empty

Every Sales Bible entry is seeded with `value = null`, and 7 modules are seeded
as empty drafts. That is deliberate. No verified product data, package pricing,
SRP, flavour list or company policy was supplied, and inventing any of it would
put a made-up price in front of a customer. The UI reads a null as
**"Admin content required"** and names the document it needs.

An admin fills these in through the app (Sales Resources → Sales Bible) and
ticks **Verified** once management has confirmed the value.

---

## 3. Point the app at the project

Dashboard → **Project Settings** → **API**. Copy the **Project URL** and the
**publishable** key (labelled `anon` `public` on older projects).

```bash
cp .env.example .env.local
```

```dotenv
VITE_SUPABASE_URL=https://YOUR-REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

> **Never put the `service_role` / secret key in a `VITE_` variable.** Vite
> inlines every `VITE_`-prefixed value into the JavaScript bundle that ships to
> the browser. The secret key bypasses Row Level Security completely - anyone
> who opened the page would have full read/write on every table. The
> publishable key is designed to be public and is constrained by RLS.

Restart the dev server. With no `.env.local` the app runs in **demo mode**
against an in-browser store and says so on the sign-in screen; with these two
values set it talks to Supabase.

---

## 4. Create the first admin

Sign-up is closed. Migration 0011 makes `handle_new_user` refuse any account
with no matching invitation, which covers email/password **and** Google. That
is correct for everybody except the very first admin, who has nobody to invite
them.

**SQL Editor → New query → paste `supabase/bootstrap-admin.sql` → Run.**

It writes an admin invitation, creates the auth user with a bcrypt password
hash, and lets the signup trigger consume the invitation - producing an active
admin profile holding every permission. Running it twice is refused.

Verify it printed one row with `role = admin`, `status = active`,
`permissions = 30`, `identities = 1`.

> `bootstrap-admin.sql` contains a password in plain text. Change the password
> from Settings after your first sign-in, and delete the file. It is already
> covered by `.gitignore`.

### After that, nobody signs themselves up

Add the rest of the team from **Administration → Users & Access → Create
account**. You choose their email, role, team and exactly which permissions
they get; they choose their own password on first sign-in via **Set up my
account** on the sign-in page. You never learn their password, and no
service-role key is needed anywhere.

An invitation expires after 14 days and can be revoked before it is used.

## 4b. Deploy the account-creation function

**Recommended.** One paste, and account creation stops depending on any email
setting.

1. Dashboard → **Edge Functions** → **Deploy a new function**
2. Name it exactly **`admin-create-user`**
3. Paste `supabase/functions/admin-create-user/index.ts`
4. Deploy

No secrets to configure — `SUPABASE_URL`, `SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` are injected by the platform.

### Why it is worth doing

A browser can only create an account via `signUp`. With **Confirm email** on,
GoTrue tries to mail a confirmation to the account's internal address — and a
username has no mailbox. The send fails, and it is reported as:

```
Email address "andrea.lopez@kco.local" is invalid
```

which blames the address when the address is fine. Retry a few times and it
becomes `over_email_send_rate_limit` instead. Three messages, one cause, none
of them naming it.

The function calls `auth.admin.createUser({ email_confirm: true })`, which
never touches the mailer. So it works regardless of the project's email
settings and cannot hit a mail rate limit.

### It does not weaken authorization

The function does **not** decide who may create accounts. It calls
`admin_create_account` **as the caller**, using their own JWT, so RLS enforces
the `users.invite` permission and the audit entry names the real actor. Only
after the database has approved the account does it use the service-role key,
and only to create the auth identity.

If it checked permissions itself, that check would be a second implementation
of the rule and would eventually disagree with the policies.

### The alternative

If you would rather not deploy a function: turn **OFF** Authentication →
Providers → Email → **"Confirm email"**. The app falls back to the browser
path, which works fine that way. Users & Access tells you which of the two you
still need to do, and stops nagging once either is in place.

## 5. Enable Google sign-in

The frontend flow is already implemented; this is dashboard configuration only,
and no code changes when you turn it on.

1. **Google Cloud Console** → APIs & Services → Credentials → *Create
   credentials* → **OAuth client ID** → Web application
2. Authorised redirect URI - copy this from Supabase (Authentication →
   Providers → Google), it looks like:
   `https://YOUR-REF.supabase.co/auth/v1/callback`
3. Copy the **Client ID** and **Client secret**
4. Supabase → **Authentication** → **Providers** → **Google** → enable, paste
   both, save
5. Supabase → **Authentication** → **URL Configuration**:
   - **Site URL**: `http://localhost:5173` for development
   - **Redirect URLs**: add `http://localhost:5173/auth/callback` and your
     production equivalent

The app sends users to `/auth/callback`, which is a real route
(`src/pages/auth/AuthCallbackPage.tsx`). If the provider is misconfigured that
page says so after 8 seconds rather than spinning forever.

**Google sign-in is invitation-only too.** The same `handle_new_user` trigger
runs, so signing in with a Google account that has no open invitation is
refused with "This platform is invitation only". Invite the person's Google
address first and their very first Google sign-in creates the account with the
role and permissions you chose.

That also means you do not need a domain allowlist: an address nobody invited
cannot get in, whatever provider it uses.

Leave Supabase's own **"Allow new users to sign up"** setting **enabled**. It
has to be on for an invited person to set their own password; invitation-only
is enforced in the database, not by that toggle.

---

## 6. Storage

`0008_storage.sql` creates three **private** buckets: `avatars`,
`learning-assets`, `attachments`. Nothing is public-read - this is an internal
tool, and a public bucket would make every uploaded file reachable by URL with
no authentication.

Access follows a path convention: a user's own files live under a folder named
with their uid, so `storage.foldername(name)[1] = auth.uid()::text` is what
proves ownership. Avatars are writable by their owner; learning assets and
attachments are writable by admins only.

---

## 7. Verify

```bash
./scripts/verify-db.sh            # migrations -> throwaway Postgres,
                                  #   then 110 authorization assertions
./scripts/verify-schema-parts.sh  # the SPLIT parts -> Postgres, then the same
                                  #   110 assertions, then the seed parts
./scripts/verify-seed.sh          # seed parts applied 3x: proves row counts do
                                  #   not move, plus 9 integrity checks
./scripts/gen-db-types.sh         # regenerates src/types/database.ts
```

These need Docker but no Supabase CLI and no live project. Run `verify-db.sh`
after touching anything in `supabase/migrations/`.

To check the live project instead, sign in as a sales user and confirm:

- `/admin/users` shows the 403 page
- the Materials list shows only published modules
- an assessment scores on submit, and correct answers appear **only** after
  submitting

That last one is enforced by the database, not the UI: `assessment_choices.is_correct`
is revoked from the `authenticated` role at the column level, so a learner's
client has no query that returns the answer key. It is released for a submitted
attempt by `attempt_review()`.

---

## 8. Still to do

### Emailing the invitation

Creating an account works today without any extra infrastructure - the
invitation lives in the database and the person sets their own password. What
is *not* automated is telling them: right now you send them the sign-in link
yourself.

Automating it needs an Edge Function, because sending mail as the project
requires the service role key:

```ts
// supabase/functions/invite-user/index.ts
// Verify the caller holds users.invite via can('users.invite'),
// call admin_invite_user, then auth.admin.inviteUserByEmail - with the
// service role key read from the function's own environment, never the client.
```

Deploying it would also let an admin set a temporary password directly. The
current flow is deliberately the one that works with no secret in the browser.

### Where the CMS still needs content

Seven modules are seeded as drafts because their source documents were not
provided: Office Rules & Sales Reporting, Customer Communication & Chat Rules,
Product Mastery, Qualification & Needs Analysis, Closing Skills, Follow-Up
Management, and Sales Performance & Scorecard. Each carries a callout naming the
document required. The competency dictionary is seeded with the 14 competency
names and the documented 1-5 scale, but definitions and behavioural indicators
are blank for the same reason.
