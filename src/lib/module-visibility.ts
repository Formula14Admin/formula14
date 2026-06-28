export type ModuleState = {
  enabled: boolean
  comingSoon?: boolean
}

export type AthleteModuleKey =
  | 'dashboard'
  | 'book'
  | 'bookings'
  | 'membership'
  | 'journal'
  | 'goals'
  | 'how-we-feel'
  | 'leaderboards'
  | 'programs'

export type CoachModuleKey =
  | 'dashboard'
  | 'athletes'
  | 'bookings'
  | 'formula-draw'
  | 'formula-sub'
  | 'formula-stat'
  | 'learning-lab'
  | 'journal'
  | 'goals'
  | 'how-we-feel'
  | 'hr'

export type CoachMemberModuleKey =
  | 'formula-draw'
  | 'formula-sub'
  | 'formula-stat'
  | 'learning-lab'
  | 'formula-connect'

export interface ModuleVisibility {
  athlete:     Record<AthleteModuleKey,     ModuleState>
  coach:       Record<CoachModuleKey,       ModuleState>
  coachMember: Record<CoachMemberModuleKey, ModuleState>
}

export const DEFAULT_VISIBILITY: ModuleVisibility = {
  athlete: {
    dashboard:    { enabled: true,  comingSoon: false },
    book:         { enabled: true,  comingSoon: false },
    bookings:     { enabled: true,  comingSoon: false },
    membership:   { enabled: true,  comingSoon: false },
    journal:      { enabled: true,  comingSoon: false },
    goals:        { enabled: true,  comingSoon: false },
    'how-we-feel':{ enabled: true,  comingSoon: false },
    leaderboards: { enabled: true,  comingSoon: true  },
    programs:     { enabled: true,  comingSoon: false },
  },
  coach: {
    dashboard:    { enabled: true },
    athletes:     { enabled: true },
    bookings:     { enabled: true },
    'formula-draw': { enabled: true },
    'formula-sub':  { enabled: true },
    'formula-stat': { enabled: true },
    'learning-lab': { enabled: true },
    journal:      { enabled: true },
    goals:        { enabled: true },
    'how-we-feel':{ enabled: true },
    hr:           { enabled: true },
  },
  coachMember: {
    'formula-draw':    { enabled: true  },
    'formula-sub':     { enabled: true  },
    'formula-stat':    { enabled: true  },
    'learning-lab':    { enabled: true  },
    'formula-connect': { enabled: false },
  },
}

export const MODULE_VISIBILITY_KEY = 'module_visibility'
export const MODULE_VISIBILITY_STORAGE_KEY = 'f14_module_visibility'

export function mergeWithDefaults(raw: Partial<ModuleVisibility>): ModuleVisibility {
  return {
    athlete:     { ...DEFAULT_VISIBILITY.athlete,     ...(raw.athlete ?? {}) },
    coach:       { ...DEFAULT_VISIBILITY.coach,       ...(raw.coach ?? {}) },
    coachMember: { ...DEFAULT_VISIBILITY.coachMember, ...(raw.coachMember ?? {}) },
  }
}
