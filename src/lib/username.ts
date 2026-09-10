/**
 * Usernames, and how they map to a login address.
 *
 * Supabase Auth identifies a user by email; there is no username support to
 * switch on. So a username becomes a deterministic internal address:
 *
 *     andrea  ->  andrea@kco.local
 *
 * Nothing is ever delivered to it. It exists because `auth.users.email` is the
 * login identifier.
 *
 * The mapping is pure string work done locally, which matters twice over: the
 * sign-in screen needs no lookup round trip, and it therefore leaks nothing
 * about which usernames exist. An attacker learns exactly as much from a
 * failed sign-in as they would have anyway.
 *
 * `INTERNAL_EMAIL_DOMAIN` must stay in step with `admin_create_account` in
 * migration 0014. Changing it would orphan every account created before the
 * change, because their stored login address would no longer be derivable
 * from their username.
 */
export const INTERNAL_EMAIL_DOMAIN = 'kco.local'

/** 3-30 chars, lower-case, starts alphanumeric. Mirrors the DB constraint. */
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/

export function isUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value.trim().toLowerCase())
}

/**
 * Why a username is not acceptable, in words a person can act on.
 *
 * Returns null when it is fine. The messages are deliberately specific -
 * "must be at least 3 characters" is actionable where "invalid username" is
 * not, and this is typed by an admin creating an account for somebody else.
 */
export function usernameProblem(raw: string): string | null {
  const value = raw.trim().toLowerCase()

  if (!value) return 'Enter a username.'
  if (value.length < 3) return 'Use at least 3 characters.'
  if (value.length > 30) return 'Use at most 30 characters.'
  if (value.includes('@')) return 'A username has no @ - enter just the name.'
  if (value.includes(' ')) return 'No spaces. Try a dot or dash instead.'
  if (!/^[a-z0-9]/.test(value)) return 'Start with a letter or number.'
  if (!USERNAME_PATTERN.test(value)) {
    return 'Use only letters, numbers, dot, dash or underscore.'
  }
  return null
}

/** Normalises what an admin typed. Lower-case, trimmed. */
export function normaliseUsername(raw: string): string {
  return raw.trim().toLowerCase()
}

/**
 * The address to authenticate with.
 *
 * Accepts either form, because both are valid ways to sign in: an address is
 * passed through untouched, a username is mapped. That also means an account
 * created from a real email address keeps working exactly as before.
 */
export function toLoginEmail(identifier: string): string {
  const value = identifier.trim().toLowerCase()
  if (value.includes('@')) return value
  return `${value}@${INTERNAL_EMAIL_DOMAIN}`
}

/**
 * The username behind a login address, or null if it is a real address.
 *
 * Used to show "andrea" rather than "andrea@kco.local" in the UI - the
 * internal domain is an implementation detail and putting it in front of an
 * admin invites them to email it.
 */
export function usernameFromLoginEmail(email: string): string | null {
  const value = email.trim().toLowerCase()
  const suffix = `@${INTERNAL_EMAIL_DOMAIN}`
  return value.endsWith(suffix) ? value.slice(0, -suffix.length) : null
}

/** True when this address is internal rather than a real mailbox. */
export function isInternalAddress(email: string): boolean {
  return usernameFromLoginEmail(email) !== null
}

/** How to show an account's identity: the username if it has one. */
export function displayIdentifier(user: { email: string; username?: string | null }): string {
  return user.username ?? usernameFromLoginEmail(user.email) ?? user.email
}
