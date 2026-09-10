import type { MaterialSection } from '@/types'
import { trainingActivities } from '@/data/activities'

/**
 * Module 6 - Training Activities.
 * A facilitator guide plus one section per activity, generated from the
 * activity records so the library and the material cannot drift.
 */
const intro: MaterialSection[] = [
  {
    id: 'm6-s01',
    index: '01',
    title: 'How to Run a Training Huddle',
    summary: 'Thirty minutes, one skill, one visible improvement.',
    blocks: [
      {
        id: 'm6-s01-b1',
        type: 'text',
        text: 'These activities work in a 20-30 minute huddle before shift. Pick one skill, run one activity, and end with each agent naming one thing they will do differently on their next call. Do not run three activities in a row - nothing sticks.',
      },
      {
        id: 'm6-s01-b2',
        type: 'numbered',
        items: [
          'Name the skill in one sentence before you start.',
          'Run the activity - keep it moving, do not over-explain.',
          'Debrief with specifics: what worked, what broke, what to change.',
          'Each agent commits to one concrete change out loud.',
          'Log the session in Activity Logs so progress is visible.',
        ],
      },
      {
        id: 'm6-s01-b3',
        type: 'callout',
        variant: 'success',
        title: 'Facilitator rule',
        text: 'Praise in public, correct in private. Never use an activity to embarrass an agent in front of the team - you will lose participation for weeks.',
      },
      {
        id: 'm6-s01-b4',
        type: 'comparison',
        caption: 'Match the activity to the problem',
        columns: ['What the team is struggling with', 'Run this'],
        rows: [
          ['One-word chat replies', "Don't Say Yes or No"],
          ['Rambling, unfocused pitches', 'Sell It in 10 Seconds'],
          ['Making customers repeat themselves', 'Pass the Sales'],
          ['Freezing on angry customers', 'Customer Acting'],
          ['Flat, monotone delivery', 'Bad Accent / Bad Sales'],
          ['Guessing product facts', 'Two Truths, One Lie'],
          ['Low energy mid-week', 'Movie Trailer Sales Pitch'],
          ['Tone that never varies', 'Dramatic Sales Pitch'],
        ],
      },
    ],
  },
]

const activitySections: MaterialSection[] = trainingActivities.map((a, i) => ({
  id: `m6-${a.id}`,
  index: String(i + 2).padStart(2, '0'),
  title: a.title,
  summary: a.objective,
  blocks: [
    { id: `m6-${a.id}-b1`, type: 'activity', activityId: a.id },
    { id: `m6-${a.id}-b2`, type: 'numbered', items: a.instructions },
    {
      id: `m6-${a.id}-b3`,
      type: 'callout',
      variant: 'info',
      title: 'Facilitator notes',
      text: a.facilitatorNotes.join(' '),
    },
    {
      id: `m6-${a.id}-b4`,
      type: 'callout',
      variant: 'success',
      title: 'Expected outcome',
      text: a.expectedOutcome,
    },
  ],
}))

export const trainingActivitySections: MaterialSection[] = [...intro, ...activitySections]
