export type SessionTypeId =
  | 'individual'
  | 'small-group'
  | 'team-training'
  | 'casual-shooting'
  | 'shooting-machine-session'
  | 'weight-room-session'
  | 'film-room-session'
  | 'volume-shooting'

export interface SessionTypeDef {
  id: SessionTypeId
  label: string
  description: string
  durationMins: number
  location: string
  style: string
  selfServe: boolean
  whoFor: string
  availability: string
  accentColor: string
  membershipTiers?: string
}

export const CANONICAL_SESSION_TYPES: SessionTypeDef[] = [
  {
    id: 'individual',
    label: 'Individual Work Out',
    description: '1-on-1 coached session tailored to your development goals.',
    durationMins: 60,
    location: 'Primary Station',
    style: 'Coached',
    selfServe: false,
    whoFor: '1-on-1 with coach',
    availability: 'Subject to coach availability',
    accentColor: '#6BA3D6',
  },
  {
    id: 'small-group',
    label: 'Small Group Session',
    description: 'Train alongside 2–6 athletes under expert coach guidance.',
    durationMins: 90,
    location: 'Primary / Secondary Station',
    style: 'Coached',
    selfServe: false,
    whoFor: '2–6 athletes + coach',
    availability: 'Subject to coach availability',
    accentColor: '#6BA3D6',
  },
  {
    id: 'team-training',
    label: 'Team Training',
    description: 'Full-team structured training session. Book your whole squad.',
    durationMins: 120,
    location: 'Primary Station',
    style: 'Coached',
    selfServe: false,
    whoFor: 'Full team + coach',
    availability: 'Subject to coach availability',
    accentColor: '#6BA3D6',
  },
  {
    id: 'casual-shooting',
    label: 'Casual Shooting',
    description: 'Open gym practice — grab a ball and work on your shot.',
    durationMins: 60,
    location: 'Shooting Bay',
    style: 'Self-serve',
    selfServe: true,
    whoFor: 'Self-serve · max 6 per space',
    availability: 'Mon – Sat, open hours',
    accentColor: '#f59e0b',
  },
  {
    id: 'shooting-machine-session',
    label: 'Shooting Machine',
    description: 'High-volume reps with the automatic rebounder machine.',
    durationMins: 60,
    location: 'Shooting Bay',
    style: 'Self-serve',
    selfServe: true,
    whoFor: 'Self-serve',
    availability: 'Mon – Sat, open hours',
    accentColor: '#f59e0b',
  },
  {
    id: 'weight-room-session',
    label: 'Weight Room',
    description: 'Strength & conditioning in the dedicated weight room.',
    durationMins: 60,
    location: 'Weight Room',
    style: 'Self-serve',
    selfServe: true,
    whoFor: 'Self-serve',
    availability: 'Mon – Sat, open hours',
    accentColor: '#9B2335',
  },
  {
    id: 'film-room-session',
    label: 'Film Room',
    description: 'Video review and analysis session for game and skill development.',
    durationMins: 60,
    location: 'Film Room',
    style: 'Coached',
    selfServe: false,
    whoFor: '1-on-1 or small group',
    availability: 'Subject to coach availability',
    accentColor: '#A06BD6',
  },
  {
    id: 'volume-shooting',
    label: 'Volume Shooting',
    description: 'High-rep shooting training session with structured drill sets.',
    durationMins: 60,
    location: 'Shooting Bay',
    style: 'Self-serve',
    selfServe: true,
    whoFor: 'Self-serve',
    availability: 'Mon – Sat, open hours',
    accentColor: '#D4A520',
  },
]
