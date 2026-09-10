import { DEFAULT_ANSWERS, type OnboardingAnswers, type OnboardingRecord } from './model'

/**
 * Where first-run state lives.
 *
 * Deliberately the only module in this feature that touches storage, so moving
 * onboarding onto a `profiles` row is a change here and nowhere else. Keyed per
 * user: two accounts on one browser must not inherit each other's setup, which
 * matters immediately in demo mode where switching accounts is one click.
 */

const key = (userId: string) => `kco.onboarding.${userId}`

export function readOnboarding(userId: string): OnboardingRecord {
  try {
    const raw = localStorage.getItem(key(userId))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as OnboardingRecord
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    // Private mode, cleared site data, or storage disabled. A first-timer who
    // cannot be remembered should still reach the app.
    return {}
  }
}

export function writeOnboarding(userId: string, patch: OnboardingRecord): OnboardingRecord {
  const next = { ...readOnboarding(userId), ...patch }
  try {
    localStorage.setItem(key(userId), JSON.stringify(next))
  } catch {
    /* ignore - the session still proceeds with in-memory state */
  }
  return next
}

export function clearOnboarding(userId: string): void {
  try {
    localStorage.removeItem(key(userId))
  } catch {
    /* ignore */
  }
}

/** Answers with the skip-defaults filled in, safe to read at any time. */
export function answersFor(userId: string): OnboardingAnswers {
  return { ...DEFAULT_ANSWERS, ...readOnboarding(userId).answers }
}

/**
 * The learner's chosen daily commitment, for the reward derivation to use as
 * the goal target. A plain function rather than a hook so non-React code can
 * call it.
 */
export function dailyGoalTarget(userId: string): number {
  return answersFor(userId).dailyMinutes
}
