import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { DEFAULT_ANSWERS, type OnboardingAnswers, type OnboardingRecord } from './model'
import { clearOnboarding, readOnboarding, writeOnboarding } from './storage'

/**
 * First-run state for the signed-in user.
 *
 * Onboarding is a learner concern: an administrator opening the console does
 * not get a survey about which channel they sell on.
 */
export function useOnboarding() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [record, setRecord] = useState<OnboardingRecord>(() =>
    userId ? readOnboarding(userId) : {},
  )

  // Demo mode swaps accounts without remounting the tree, so the record has to
  // follow the user rather than only being read once.
  useEffect(() => {
    setRecord(userId ? readOnboarding(userId) : {})
  }, [userId])

  const save = useCallback(
    (patch: OnboardingRecord) => {
      if (!userId) return
      setRecord(writeOnboarding(userId, patch))
    },
    [userId],
  )

  const complete = useCallback(
    (answers: OnboardingAnswers) => save({ answers, completedAt: new Date().toISOString(), skipped: false }),
    [save],
  )

  const skip = useCallback(
    () => save({ answers: DEFAULT_ANSWERS, completedAt: new Date().toISOString(), skipped: true }),
    [save],
  )

  const finishTour = useCallback(() => save({ tourSeenAt: new Date().toISOString() }), [save])

  /** Clears only the tour flag, so the walkthrough runs again on the dashboard. */
  const replayTour = useCallback(() => {
    if (!userId) return
    const { tourSeenAt: _drop, ...rest } = readOnboarding(userId)
    void _drop
    clearOnboarding(userId)
    setRecord(writeOnboarding(userId, rest))
  }, [userId])

  /** Settings uses this to run first-run again from scratch. */
  const reset = useCallback(() => {
    if (!userId) return
    clearOnboarding(userId)
    setRecord({})
  }, [userId])

  const isLearner = user?.role === 'sales'

  return {
    record,
    answers: { ...DEFAULT_ANSWERS, ...record.answers },
    /** A learner who has neither finished nor skipped setup. */
    needsSurvey: Boolean(isLearner && !record.completedAt),
    /** Setup is done, but the walkthrough has not been seen or dismissed. */
    needsTour: Boolean(isLearner && record.completedAt && !record.tourSeenAt),
    complete,
    skip,
    finishTour,
    replayTour,
    reset,
  }
}
