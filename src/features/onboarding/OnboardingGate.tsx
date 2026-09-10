import { useCallback, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { useOnboarding } from './useOnboarding'
import { OnboardingSurvey } from './OnboardingSurvey'
import { AppTour } from './tour/AppTour'
import { planFrom, type OnboardingAnswers } from './model'

/**
 * Sits between the session guard and the app shell.
 *
 * A sales agent who has never finished setup gets the survey instead of the
 * shell - there is no sidebar to wander off into mid-question. Everyone else,
 * administrators included, passes straight through.
 *
 * The walkthrough is different: it needs the real dashboard behind it, so it
 * renders as a sibling of the shell and only on the dashboard route, where its
 * anchors live.
 */
export function OnboardingGate() {
  const { user } = useAuth()
  const { needsSurvey, needsTour, complete, skip, finishTour } = useOnboarding()
  const navigate = useNavigate()
  const location = useLocation()

  // Holds the answers between "See my plan" and the choice of what happens
  // next, so declining the tour can still route to the right first module.
  const [planned, setPlanned] = useState<OnboardingAnswers | null>(null)

  const onComplete = useCallback(
    (answers: OnboardingAnswers) => {
      setPlanned(answers)
      complete(answers)
    },
    [complete],
  )

  const onStartTour = useCallback(() => {
    // The tour anchors are on the dashboard; `needsTour` starts it on arrival.
    navigate('/', { replace: true })
  }, [navigate])

  const onDeclineTour = useCallback(() => {
    finishTour()
    // The LinkButton this fires from is already navigating to the first module,
    // so there is deliberately no navigate() here.
  }, [finishTour])

  const onSkipSetup = useCallback(() => {
    skip()
    navigate('/', { replace: true })
  }, [skip, navigate])

  if (needsSurvey && user) {
    return (
      <OnboardingSurvey
        name={user.name}
        onComplete={onComplete}
        onSkipSetup={onSkipSetup}
        onStartTour={onStartTour}
        onDeclineTour={onDeclineTour}
      />
    )
  }

  // `planned` is only set in the session that just finished setup; a returning
  // learner who never saw the tour still gets it, from the dashboard.
  void planned
  const showTour = needsTour && location.pathname === '/'

  return (
    <>
      <Outlet />
      {showTour && <AppTour onFinish={finishTour} />}
    </>
  )
}

/** Where a learner lands after declining the walkthrough. */
export function firstModuleHref(answers: OnboardingAnswers): string {
  return `/learning/materials/${planFrom(answers).startSlug}`
}
