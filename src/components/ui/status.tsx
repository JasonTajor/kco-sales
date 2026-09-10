import type { AssignmentStatus, ContentStatus, Difficulty, ProgressState, UserStatus } from '@/types'
import { Badge, DotLabel, type BadgeTone } from './badge'

/** §10 - one status vocabulary, used everywhere. Text first, colour second. */

const contentTone: Record<ContentStatus, BadgeTone> = {
  draft: 'warning',
  published: 'success',
  archived: 'neutral',
}
const contentLabel: Record<ContentStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
}

const userTone: Record<UserStatus, BadgeTone> = {
  active: 'success',
  inactive: 'neutral',
  pending: 'warning',
}

const progressTone: Record<ProgressState, BadgeTone> = {
  'not-started': 'neutral',
  'in-progress': 'info',
  completed: 'success',
}
const progressLabel: Record<ProgressState, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  completed: 'Completed',
}

const assignmentTone: Record<AssignmentStatus, BadgeTone> = {
  'not-started': 'neutral',
  'in-progress': 'info',
  completed: 'success',
  overdue: 'danger',
}
const assignmentLabel: Record<AssignmentStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  completed: 'Completed',
  overdue: 'Overdue',
}

const difficultyTone: Record<Difficulty, BadgeTone> = {
  foundation: 'neutral',
  intermediate: 'info',
  advanced: 'primary',
}
const difficultyLabel: Record<Difficulty, string> = {
  foundation: 'Foundation',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export const ContentStatusBadge = ({ status, bare }: { status: ContentStatus; bare?: boolean }) =>
  bare ? (
    <DotLabel tone={contentTone[status]}>{contentLabel[status]}</DotLabel>
  ) : (
    <Badge tone={contentTone[status]} dot>
      {contentLabel[status]}
    </Badge>
  )

export const UserStatusBadge = ({ status, bare }: { status: UserStatus; bare?: boolean }) => {
  const label = status[0]!.toUpperCase() + status.slice(1)
  return bare ? (
    <DotLabel tone={userTone[status]}>{label}</DotLabel>
  ) : (
    <Badge tone={userTone[status]} dot>
      {label}
    </Badge>
  )
}

export const ProgressStateBadge = ({ state, bare }: { state: ProgressState; bare?: boolean }) =>
  bare ? (
    <DotLabel tone={progressTone[state]}>{progressLabel[state]}</DotLabel>
  ) : (
    <Badge tone={progressTone[state]} dot>
      {progressLabel[state]}
    </Badge>
  )

export const AssignmentStatusBadge = ({ status, bare }: { status: AssignmentStatus; bare?: boolean }) =>
  bare ? (
    <DotLabel tone={assignmentTone[status]}>{assignmentLabel[status]}</DotLabel>
  ) : (
    <Badge tone={assignmentTone[status]} dot>
      {assignmentLabel[status]}
    </Badge>
  )

export const DifficultyBadge = ({ level }: { level: Difficulty }) => (
  <Badge tone={difficultyTone[level]}>{difficultyLabel[level]}</Badge>
)
