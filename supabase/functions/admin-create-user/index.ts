/**
 * admin-create-user
 *
 * Creates a user account outright, already confirmed.
 *
 * WHY THIS EXISTS
 *
 * The browser cannot create a confirmed account. Its only route is `signUp`,
 * and with "Confirm email" enabled GoTrue tries to mail a confirmation to the
 * account's internal address. A username has no mailbox, so the send fails and
 * GoTrue reports `Email address "andrea@kco.local" is invalid` - which blames
 * the address when the address is fine - then rate-limits after a few tries.
 *
 * `auth.admin.createUser({ email_confirm: true })` skips the mailer entirely.
 * It needs the service-role key, which must never reach a browser but is
 * injected into Edge Functions automatically. So the privileged step lives
 * here and nowhere else.
 *
 * The result: creating accounts works regardless of the project's email
 * settings, sends no mail, and cannot hit a mail rate limit.
 *
 * WHAT IT DOES NOT DO
 *
 * It does not decide who may create accounts. That decision stays in the
 * database:
 *
 *   1. It calls `admin_create_account` **as the caller**, using their own JWT.
 *      RLS enforces the `users.invite` permission and the audit entry records
 *      the real actor. A caller without permission is refused there, not here.
 *   2. Only then does it use the service key, and only to create the auth
 *      identity for an account the database has already approved.
 *
 * That ordering matters. If this function checked permissions itself, the
 * check would be a second implementation of the rule and would eventually
 * disagree with the policies.
 *
 * DEPLOY
 *
 *   Dashboard -> Edge Functions -> Deploy a new function
 *     name: admin-create-user
 *     paste this file, deploy
 *
 *   or:  supabase functions deploy admin-create-user
 *
 * No secrets to configure: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are
 * provided by the platform.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CreateAccountBody {
  username: string
  password: string
  fullName?: string
  role?: 'admin' | 'sales'
  department?: string
  position?: string
  permissions?: string[]
  email?: string
  note?: string
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!url || !serviceKey || !anonKey) {
    return json({ error: 'The function is missing its Supabase environment.' }, 500)
  }

  // The caller's token. Everything authorization-related runs as them.
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'Sign in first.' }, 401)
  }

  let body: CreateAccountBody
  try {
    body = (await req.json()) as CreateAccountBody
  } catch {
    return json({ error: 'Expected a JSON body.' }, 400)
  }

  const username = (body.username ?? '').trim().toLowerCase()
  const password = body.password ?? ''

  if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(username)) {
    return json(
      {
        error:
          'A username must be 3-30 characters, lower-case, starting with a letter or number, using only letters, numbers, dot, dash or underscore.',
      },
      400,
    )
  }
  if (password.length < 8) {
    return json({ error: 'Choose a password of at least 8 characters.' }, 400)
  }

  // As the caller: RLS decides whether they may do this, and the audit entry
  // names them rather than the service role.
  const asCaller = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: created, error: rpcError } = await asCaller.rpc('admin_create_account', {
    p_username: username,
    p_full_name: body.fullName ?? null,
    p_role: body.role ?? 'sales',
    p_department: body.department ?? null,
    p_position: body.position ?? null,
    p_permissions: body.permissions ?? [],
    p_email: body.email ?? null,
    p_note: body.note ?? '',
  })

  if (rpcError) {
    // Includes "You do not have permission to create accounts" and the
    // username-taken cases, all raised by the database.
    return json({ error: rpcError.message }, 403)
  }

  const row = (created as { invitation_id: string; login_email: string }[] | null)?.[0]
  if (!row) return json({ error: 'The account record was not created.' }, 500)

  // Service role, used for exactly one thing: the auth identity.
  const asService = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error: createError } = await asService.auth.admin.createUser({
    email: row.login_email,
    password,
    // The whole point. No confirmation mail is generated, so the account is
    // usable immediately and no rate limit can be hit.
    email_confirm: true,
    user_metadata: { full_name: body.fullName ?? username },
  })

  if (createError) {
    // Withdraw the pending record so the username is free to retry rather than
    // appearing permanently taken.
    await asCaller.rpc('admin_discard_pending_account', { p_invitation_id: row.invitation_id })

    const message = createError.message.toLowerCase().includes('already')
      ? 'That username is already taken.'
      : createError.message
    return json({ error: message }, 400)
  }

  return json({ username, loginEmail: row.login_email })
})
