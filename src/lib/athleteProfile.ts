// Athlete Profile — TypeScript types and Supabase data-access helpers.
// Central data model for the Formula14 platform.

import { supabase } from '@/lib/supabase'

// ── Step 1: Basketball level sub-form types ───────────────────────────────────

export interface DomesticTeamDraft {
  id?: string
  club: string; ageGroup: string; teamName: string; division: string
  primaryPosition: string; coachName: string; coachContact: string; isCurrent: boolean
}

export interface JuniorRepDraft {
  id?: string
  association: string; ageGroup: string; team: string; grade: string
  primaryPosition: string; coachName: string; coachContact: string; isCurrent: boolean
}

export interface SchoolDraft {
  id?: string
  school: string; yearLevel: string; team: string; coach: string
  primaryPosition: string; isCurrent: boolean
}

export interface BigvNbl1Draft {
  id?: string
  juniorPlayingHistory: string; association: string; league: string
  division: string; team: string; primaryPosition: string; coach: string; isCurrent: boolean
}

export interface CollegiateDraft {
  id?: string
  collegeUniversity: string; division: string; conference: string
  yearInProgram: string; coach: string; playingHistory: string; isCurrent: boolean
}

export interface PathwayDraft {
  id?: string
  program: string; year: string; participationStatus: string; coach: string; notes: string
}

export interface ProfessionalDraft {
  id?: string
  organisation: string; season: string; contractType: string; coach: string
}

export interface OtherCompDraft {
  id?: string
  competitionName: string; organisation: string; team: string; description: string
}

// ── Full wizard draft ─────────────────────────────────────────────────────────

export interface WizardDraft {
  // Step 1
  selectedLevels:   string[]
  domestic:         DomesticTeamDraft[]
  juniorRep:        JuniorRepDraft[]
  school:           SchoolDraft[]
  bigvNbl1:         BigvNbl1Draft
  collegiate:       CollegiateDraft
  bvPathways:       PathwayDraft[]
  baPathways:       PathwayDraft[]
  nbl:              ProfessionalDraft[]
  wnbl:             ProfessionalDraft[]
  nba:              ProfessionalDraft[]
  wnba:             ProfessionalDraft[]
  otherComp:        OtherCompDraft[]
  // Step 2
  primaryPosition:  string
  secondaryPosition: string
  dominantHand:     string
  // Step 3
  playingStyles:    string[]
  // Step 4
  strengths:        string
  areasToImprove:   string[]
  // Step 5
  goal12Months:     string
  longTermDream:    string
  formula14Goal:    string
  // Step 6
  weeklyTrainingSessions:   string
  weeklyGames:              string
  individualSkillFrequency: string
  // Step 7
  heightUnit:    'cm' | 'ft'
  heightValue:   string
  heightFt:      string
  heightIn:      string
  weightUnit:    'kg' | 'lbs'
  weightValue:   string
  wingspanCm:    string
  verticalJumpCm: string
  // Step 8
  currentInjuries:   string
  medicalConditions: string
  allergies:         string
  // Step 9
  preferredContactMethod: string
  receiveTipsUpdates:     boolean
  // Step 10
  mindset: string
  // Step 11
  additionalInfo: string
  // Meta
  completedSteps: number[]
}

const BLANK_DOMESTIC: DomesticTeamDraft = { club: '', ageGroup: '', teamName: '', division: '', primaryPosition: '', coachName: '', coachContact: '', isCurrent: true }
const BLANK_JR_REP: JuniorRepDraft     = { association: '', ageGroup: '', team: '', grade: '', primaryPosition: '', coachName: '', coachContact: '', isCurrent: true }
const BLANK_SCHOOL: SchoolDraft        = { school: '', yearLevel: '', team: '', coach: '', primaryPosition: '', isCurrent: true }
const BLANK_BIGV: BigvNbl1Draft        = { juniorPlayingHistory: '', association: '', league: '', division: '', team: '', primaryPosition: '', coach: '', isCurrent: true }
const BLANK_COLLEGIATE: CollegiateDraft = { collegeUniversity: '', division: '', conference: '', yearInProgram: '', coach: '', playingHistory: '', isCurrent: true }
const BLANK_PATHWAY: PathwayDraft      = { program: '', year: '', participationStatus: 'current', coach: '', notes: '' }
const BLANK_PROFESSIONAL: ProfessionalDraft = { organisation: '', season: '', contractType: '', coach: '' }
const BLANK_OTHER: OtherCompDraft      = { competitionName: '', organisation: '', team: '', description: '' }

export const EMPTY_DRAFT: WizardDraft = {
  selectedLevels: [], domestic: [{ ...BLANK_DOMESTIC }], juniorRep: [{ ...BLANK_JR_REP }],
  school: [{ ...BLANK_SCHOOL }], bigvNbl1: { ...BLANK_BIGV }, collegiate: { ...BLANK_COLLEGIATE },
  bvPathways: [{ ...BLANK_PATHWAY }], baPathways: [{ ...BLANK_PATHWAY }],
  nbl: [{ ...BLANK_PROFESSIONAL }], wnbl: [{ ...BLANK_PROFESSIONAL }],
  nba: [{ ...BLANK_PROFESSIONAL }], wnba: [{ ...BLANK_PROFESSIONAL }],
  otherComp: [{ ...BLANK_OTHER }],
  primaryPosition: '', secondaryPosition: '', dominantHand: '',
  playingStyles: [],
  strengths: '', areasToImprove: [],
  goal12Months: '', longTermDream: '', formula14Goal: '',
  weeklyTrainingSessions: '', weeklyGames: '', individualSkillFrequency: '',
  heightUnit: 'cm', heightValue: '', heightFt: '', heightIn: '',
  weightUnit: 'kg', weightValue: '', wingspanCm: '', verticalJumpCm: '',
  currentInjuries: '', medicalConditions: '', allergies: '',
  preferredContactMethod: '', receiveTipsUpdates: true,
  mindset: '',
  additionalInfo: '',
  completedSteps: [],
}

export { BLANK_DOMESTIC, BLANK_JR_REP, BLANK_SCHOOL, BLANK_BIGV, BLANK_COLLEGIATE, BLANK_PATHWAY, BLANK_PROFESSIONAL, BLANK_OTHER }

// ── Completion percentage (weighted) ─────────────────────────────────────────
// Step weights: 1=20, 2=5, 3=5, 4=10, 5=15, 6=10, 7=5, 8=10, 9=5, 10=5, 11=10

export function calcCompletionPct(d: WizardDraft): number {
  const cs = d.completedSteps
  let pct = 0
  if (cs.includes(1))  pct += 20
  if (cs.includes(2))  pct += 5
  if (cs.includes(3))  pct += 5
  if (cs.includes(4))  pct += 10
  if (cs.includes(5))  pct += 15
  if (cs.includes(6))  pct += 10
  if (cs.includes(7))  pct += 5
  if (cs.includes(8))  pct += 10
  if (cs.includes(9))  pct += 5
  if (cs.includes(10)) pct += 5
  if (cs.includes(11)) pct += 10
  return pct
}

// ── Get or resolve athlete_id for logged-in user ──────────────────────────────

export async function resolveAthleteId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('athletes')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}

// ── Save wizard step to Supabase ──────────────────────────────────────────────

export async function saveProfileToSupabase(athleteId: string, draft: WizardDraft): Promise<void> {
  const pct = calcCompletionPct(draft)

  // Upsert core profile (Steps 2-4, 10, 11)
  await supabase.from('athlete_profiles').upsert({
    athlete_id:           athleteId,
    primary_position:     draft.primaryPosition   || null,
    secondary_position:   draft.secondaryPosition || null,
    dominant_hand:        draft.dominantHand       || null,
    playing_styles:       draft.playingStyles,
    strengths:            draft.strengths          || null,
    areas_to_improve:     draft.areasToImprove,
    mindset:              draft.mindset            || null,
    additional_info:      draft.additionalInfo     || null,
    completion_percentage: pct,
    updated_at:           new Date().toISOString(),
  }, { onConflict: 'athlete_id' })

  // Upsert goals (Step 5)
  await supabase.from('athlete_profile_goals').upsert({
    athlete_id:     athleteId,
    goal_12_months: draft.goal12Months   || null,
    long_term_dream: draft.longTermDream || null,
    formula14_goal: draft.formula14Goal  || null,
    updated_at:     new Date().toISOString(),
  }, { onConflict: 'athlete_id' })

  // Upsert training habits (Step 6)
  await supabase.from('athlete_training_habits').upsert({
    athlete_id:                  athleteId,
    weekly_training_sessions:    draft.weeklyTrainingSessions    || null,
    weekly_games:                draft.weeklyGames               || null,
    individual_skill_frequency:  draft.individualSkillFrequency  || null,
    updated_at:                  new Date().toISOString(),
  }, { onConflict: 'athlete_id' })

  // Upsert medical info (Step 8)
  await supabase.from('athlete_medical_info').upsert({
    athlete_id:         athleteId,
    current_injuries:   draft.currentInjuries   || null,
    medical_conditions: draft.medicalConditions || null,
    allergies:          draft.allergies         || null,
    updated_at:         new Date().toISOString(),
  }, { onConflict: 'athlete_id' })

  // Upsert communication prefs (Step 9)
  await supabase.from('athlete_communication_prefs').upsert({
    athlete_id:               athleteId,
    preferred_contact_method: draft.preferredContactMethod || null,
    receive_tips_updates:     draft.receiveTipsUpdates,
    updated_at:               new Date().toISOString(),
  }, { onConflict: 'athlete_id' })

  // Physical info (Step 7) — insert new row for historical tracking
  const heightCm = draft.heightUnit === 'cm'
    ? parseFloat(draft.heightValue) || null
    : draft.heightFt
      ? parseFloat(draft.heightFt) * 30.48 + (parseFloat(draft.heightIn) || 0) * 2.54
      : null
  const weightKg = draft.weightUnit === 'kg'
    ? parseFloat(draft.weightValue) || null
    : parseFloat(draft.weightValue) ? parseFloat(draft.weightValue) * 0.4536 : null

  if (heightCm || weightKg || draft.wingspanCm || draft.verticalJumpCm) {
    await supabase.from('athlete_physical_info').upsert({
      athlete_id:       athleteId,
      height_cm:        heightCm,
      weight_kg:        weightKg,
      wingspan_cm:      parseFloat(draft.wingspanCm)      || null,
      vertical_jump_cm: parseFloat(draft.verticalJumpCm)  || null,
      measurement_date: new Date().toISOString().slice(0, 10),
    })
  }
}

// ── Load profile from Supabase into draft format ──────────────────────────────

export async function loadProfileFromSupabase(athleteId: string): Promise<Partial<WizardDraft>> {
  const [profileRes, goalsRes, habitsRes, medicalRes, commsRes, levelsRes] = await Promise.all([
    supabase.from('athlete_profiles').select('*').eq('athlete_id', athleteId).single(),
    supabase.from('athlete_profile_goals').select('*').eq('athlete_id', athleteId).single(),
    supabase.from('athlete_training_habits').select('*').eq('athlete_id', athleteId).single(),
    supabase.from('athlete_medical_info').select('*').eq('athlete_id', athleteId).single(),
    supabase.from('athlete_communication_prefs').select('*').eq('athlete_id', athleteId).single(),
    supabase.from('athlete_basketball_levels').select('level_type').eq('athlete_id', athleteId),
  ])

  const p = profileRes.data
  const g = goalsRes.data
  const h = habitsRes.data
  const m = medicalRes.data
  const c = commsRes.data
  const levels = (levelsRes.data ?? []).map((r: { level_type: string }) => r.level_type)

  if (!p && !g && !h && !m && !c) return {}

  return {
    selectedLevels:          levels,
    primaryPosition:         p?.primary_position     ?? '',
    secondaryPosition:       p?.secondary_position   ?? '',
    dominantHand:            p?.dominant_hand        ?? '',
    playingStyles:           p?.playing_styles       ?? [],
    strengths:               p?.strengths            ?? '',
    areasToImprove:          p?.areas_to_improve     ?? [],
    mindset:                 p?.mindset              ?? '',
    additionalInfo:          p?.additional_info      ?? '',
    goal12Months:            g?.goal_12_months       ?? '',
    longTermDream:           g?.long_term_dream      ?? '',
    formula14Goal:           g?.formula14_goal       ?? '',
    weeklyTrainingSessions:  h?.weekly_training_sessions   ?? '',
    weeklyGames:             h?.weekly_games               ?? '',
    individualSkillFrequency: h?.individual_skill_frequency ?? '',
    currentInjuries:         m?.current_injuries     ?? '',
    medicalConditions:       m?.medical_conditions   ?? '',
    allergies:               m?.allergies            ?? '',
    preferredContactMethod:  c?.preferred_contact_method ?? '',
    receiveTipsUpdates:      c?.receive_tips_updates ?? true,
  }
}

// ── Save BV age group ──────────────────────────────────────────────────────────

export async function saveBVAgeGroup(athleteId: string, dob: string): Promise<void> {
  const { calcBVAgeGroup } = await import('@/lib/bvAgeGroup')
  const result = calcBVAgeGroup(dob)
  await supabase.from('athlete_bv_age_group').upsert({
    athlete_id:              athleteId,
    date_of_birth:           dob,
    current_age:             result.currentAge,
    bv_age_group:            result.bvAgeGroup,
    playing_year:            result.playingYear,
    birth_year:              result.birthYear,
    age_on_31_dec:           result.ageOnDec31,
    next_recalculation_date: result.nextRecalcDate,
    calculated_at:           new Date().toISOString(),
  }, { onConflict: 'athlete_id' })
}
