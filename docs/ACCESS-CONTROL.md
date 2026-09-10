# Access control

Two mechanisms, doing two different jobs.

| | What it decides | Where it lives |
| --- | --- | --- |
| **Role** (`admin` \| `sales`) | Whether the admin console is reachable at all | `profiles.role` |
| **Permissions** (30 keys) | What a person may actually do | `role_permissions` + `user_permissions` |

A role is a starting point. Permissions are the rule.

## How a decision is made

`public.can('content.edit')` answers every authorization question, in this
order:

1. **Per-person override** — a row in `user_permissions` wins, in *either*
   direction. `granted = false` takes away something the role grants, which is
   what makes "an admin who may not change roles" expressible.
2. **Role default** — a row in `role_permissions` for that person's role.
3. **Deny.**

A deactivated account holds nothing, whatever its rows say.

```sql
select public.can('content.publish');   -- as the current user
select * from public.my_permissions();  -- everything they hold
```

## The catalogue

30 permissions in 8 categories: Content, Assessments, Training, Resources,
People, Delivery, Development, Oversight. `select * from public.permissions
order by sort_order` is the authoritative list; the same keys are typed as a
union in `src/types/rbac.ts` so a typo in a guard is a compile error.

By default **admin holds all 30** and **sales holds none**. Everything a
learner does — reading published material, their own progress, their own
attempts — is governed by ownership policies rather than by a permission, so
there is deliberately nothing to grant a sales user for the ordinary case.

## Enforcement is in the database

Three layers, and only one of them is a security boundary:

```
Sidebar        navigationFor(role, permissions)   — cosmetic
Route          <PermissionGuard allow={[...]} />  — cosmetic
Database       RLS policies + guarded RPCs        — THE boundary
```

The first two exist so a person is not shown links that would bounce. Neither
protects anything: a request crafted by hand skips both. What stops it is that
every policy on every table is written in terms of `can(...)`, and the
privileged operations run through `SECURITY DEFINER` functions that check the
caller's permission before doing anything.

`supabase/tests/rls.test.sql` proves this with 110 assertions, run with no
client involved. Among them:

- a sales user granted `content.edit` genuinely can edit a module
- …and still cannot create one, or read the activity log
- an explicit `deny` overrides a role default, immediately, in RLS
- a sales user cannot grant themselves `users.permissions`
- the answer key is unreadable to a learner at the **column** level

## Two guards that stop you locking yourself out

Both are in the database, so they hold regardless of what the UI does:

- `admin_set_user_role` / `admin_set_user_status` refuse to demote or
  deactivate the **last active admin**.
- `admin_set_permission` refuses any change that would leave **nobody** holding
  `users.permissions`.

## Nobody signs themselves up

`handle_new_user` refuses any signup with no matching record — for email and
for Google alike. An account exists only because somebody with `users.invite`
created it.

### The admin creates a working account

```
Users & Access -> Create account
   username        andrea.lopez
   password        suggested, or type your own
   full name, team, job title
   an access preset, plus optional per-permission tuning
        ↓
The account works immediately. Hand over the username and password.
```

No email is sent and nothing has to be accepted. The password is displayed
once, on the confirmation screen, and is not readable afterwards — not by the
app and not by an admin. If it is lost, create a new one.

### Usernames, and why there is an internal address

Supabase Auth identifies a user by email; there is no username support to
switch on. So a username maps to a deterministic internal address:

```
andrea.lopez  ->  andrea.lopez@kco.local
```

Nothing is ever delivered there. The mapping is plain string concatenation done
on the client (`src/lib/username.ts`) and mirrored in `admin_create_account`,
which means signing in needs no lookup and therefore leaks nothing about which
usernames exist.

Sign-in accepts **either** form: a value containing `@` is used as-is, anything
else is mapped. Accounts created from a real address keep working unchanged.

> `INTERNAL_EMAIL_DOMAIN` must stay in step between `src/lib/username.ts` and
> migration 0014. Changing it would orphan every existing login, because the
> stored address would no longer be derivable from the username.

### How it works without a service-role key

Creating an auth user normally needs the service-role key, which must never
reach a browser. This flow avoids it entirely:

1. `admin_create_account` records the pending account and returns the mapped
   address. This is the privileged half, and RLS is what permits it.
2. The admin's browser calls `signUp` on a **second Supabase client** built
   with `persistSession: false`, so the admin's own session is untouched. This
   half is unprivileged.
3. `handle_new_user` finds the record from step 1 and turns it into an active
   profile with the role and permissions the admin chose.

If step 2 fails, step 1 is withdrawn so the username is free to retry rather
than appearing permanently taken.

### Required project setting

**Authentication → Providers → Email → turn OFF "Confirm email".**

A username has no mailbox, so a confirmation link could never be followed and
the account would be created but permanently unable to sign in. The service
detects this case and says so explicitly rather than leaving you to debug it.

Leaving it off is the right trade here: an admin vouches for every account, and
the database refuses anyone without a record, so there is nothing an email
confirmation would add.

## Presets

`ACCESS_PRESETS` in `src/types/rbac.ts` offers five starting points, because
picking thirty checkboxes per hire is how a permission system ends up unused:

| Preset | Role | Gets |
| --- | --- | --- |
| Sales agent | sales | Nothing extra — takes training, sees only their own data |
| Senior agent | sales | `content.view_drafts`, `competencies.rate` |
| Content editor | admin | Write content and the resource libraries; no publish, no results |
| Trainer | admin | Author, publish, assess, assign, view reports; no account management |
| Administrator | admin | Everything (the role default) |

A preset only seeds the form. Tune the checkboxes before creating the account,
or open the person afterwards and set any permission to Allow / Deny / Role
default.

## Changing what a role grants

`role_permissions` is an ordinary table, so "what an admin can do" is
configuration rather than something compiled into policies:

```sql
-- Stop admins seeing the audit log by default
delete from public.role_permissions
 where role = 'admin' and permission_key = 'logs.view';
```

Individual overrides still apply on top. The **Role defaults** tab under
Users & Access shows the current matrix read-only.

## Adding a permission

1. Insert into `public.permissions` in a new migration.
2. Grant it to whichever roles should hold it by default.
3. Use `can('your.key')` in the policies or RPCs that should respect it.
4. Add the key to `PERMISSION_KEYS` in `src/types/rbac.ts` and to the
   catalogue in `src/services/demo/rbacService.ts`.
5. Add an assertion to `supabase/tests/rls.test.sql` proving it both allows
   and denies, then run `./scripts/verify-db.sh`.

Step 5 is not optional. Every security bug found in this schema so far was
found by that suite, not by reading the SQL.
