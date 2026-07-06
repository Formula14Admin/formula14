-- Formula14 · Comprehensive Athlete Profile System
-- Migration 018 — run after 017_sponsorships.sql
-- Builds the central data model for the entire platform.
-- All tables reference athletes(id) (not users(id)) as the canonical entity.

-- ── Core profile ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS athlete_profiles (
  id                           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id                   UUID        REFERENCES athletes(id) ON DELETE CASCADE,
  primary_position             TEXT,
  secondary_position           TEXT,
  dominant_hand                TEXT,
  playing_styles               TEXT[]      DEFAULT '{}',
  strengths                    TEXT,
  areas_to_improve             TEXT[]      DEFAULT '{}',
  mindset                      TEXT,
  additional_info              TEXT,
  completion_percentage        INTEGER     DEFAULT 0,
  -- Future integration hooks (Part 6)
  ai_recommendations_enabled   BOOLEAN     DEFAULT false,
  development_plan_id          UUID,
  film_analysis_enabled        BOOLEAN     DEFAULT false,
  created_at                   TIMESTAMPTZ DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(athlete_id)
);

-- ── Basketball levels (one row per level per athlete) ─────────────────────────
CREATE TABLE IF NOT EXISTS athlete_basketball_levels (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id         UUID        REFERENCES athletes(id) ON DELETE CASCADE,
  level_type         TEXT        NOT NULL,
  -- level_type values: 'domestic' | 'junior_rep' | 'school' | 'bigv_nbl1' |
  --   'collegiate' | 'bv_pathway' | 'ba_pathway' | 'nbl' | 'wnbl' |
  --   'nba' | 'wnba' | 'other'
  is_current         BOOLEAN     DEFAULT true,
  sort_order         INTEGER     DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ── Domestic basketball teams ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS athlete_domestic_teams (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id           UUID        REFERENCES athletes(id) ON DELETE CASCADE,
  basketball_level_id  UUID        REFERENCES athlete_basketball_levels(id) ON DELETE CASCADE,
  club                 TEXT,
  age_group            TEXT,
  team_name            TEXT,
  division             TEXT,
  primary_position     TEXT,
  coach_name           TEXT,
  coach_contact        TEXT,
  is_current           BOOLEAN     DEFAULT true,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── Junior representative basketball ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS athlete_junior_rep (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id           UUID        REFERENCES athletes(id) ON DELETE CASCADE,
  basketball_level_id  UUID        REFERENCES athlete_basketball_levels(id) ON DELETE CASCADE,
  association          TEXT,
  age_group            TEXT,
  team                 TEXT,
  grade                TEXT,
  primary_position     TEXT,
  coach_name           TEXT,
  coach_contact        TEXT,
  is_current           BOOLEAN     DEFAULT true,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── School basketball ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS athlete_school_basketball (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id           UUID        REFERENCES athletes(id) ON DELETE CASCADE,
  basketball_level_id  UUID        REFERENCES athlete_basketball_levels(id) ON DELETE CASCADE,
  school               TEXT,
  year_level           TEXT,
  team                 TEXT,
  coach                TEXT,
  primary_position     TEXT,
  is_current           BOOLEAN     DEFAULT true,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── Big V / NBL1 ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS athlete_bigv_nbl1 (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id           UUID        REFERENCES athletes(id) ON DELETE CASCADE,
  basketball_level_id  UUID        REFERENCES athlete_basketball_levels(id) ON DELETE CASCADE,
  junior_playing_history TEXT,
  association          TEXT,
  league               TEXT,
  division             TEXT,
  team                 TEXT,
  primary_position     TEXT,
  coach                TEXT,
  is_current           BOOLEAN     DEFAULT true,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── Collegiate basketball ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS athlete_collegiate (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id           UUID        REFERENCES athletes(id) ON DELETE CASCADE,
  basketball_level_id  UUID        REFERENCES athlete_basketball_levels(id) ON DELETE CASCADE,
  college_university   TEXT,
  division             TEXT,
  conference           TEXT,
  year_in_program      TEXT,       -- Freshman / Sophomore / Junior / Senior / Graduate
  coach                TEXT,
  playing_history      TEXT,
  is_current           BOOLEAN     DEFAULT true,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── Basketball Victoria High Performance Pathways ─────────────────────────────
CREATE TABLE IF NOT EXISTS athlete_bv_pathways (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id           UUID        REFERENCES athletes(id) ON DELETE CASCADE,
  basketball_level_id  UUID        REFERENCES athlete_basketball_levels(id) ON DELETE CASCADE,
  program              TEXT,
  year                 INTEGER,
  participation_status TEXT,       -- 'current' | 'previous'
  coach                TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── Basketball Australia High Performance Pathways ────────────────────────────
CREATE TABLE IF NOT EXISTS athlete_ba_pathways (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id           UUID        REFERENCES athletes(id) ON DELETE CASCADE,
  basketball_level_id  UUID        REFERENCES athlete_basketball_levels(id) ON DELETE CASCADE,
  program              TEXT,
  year                 INTEGER,
  participation_status TEXT,
  coach                TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── Professional seasons (NBL / WNBL / NBA / WNBA) ───────────────────────────
CREATE TABLE IF NOT EXISTS athlete_professional_seasons (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id           UUID        REFERENCES athletes(id) ON DELETE CASCADE,
  basketball_level_id  UUID        REFERENCES athlete_basketball_levels(id) ON DELETE CASCADE,
  league_type          TEXT,       -- 'nbl' | 'wnbl' | 'nba' | 'wnba'
  organisation         TEXT,
  season               INTEGER,
  contract_type        TEXT,
  coach                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── Other competitions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS athlete_other_competitions (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id           UUID        REFERENCES athletes(id) ON DELETE CASCADE,
  basketball_level_id  UUID        REFERENCES athlete_basketball_levels(id) ON DELETE CASCADE,
  competition_name     TEXT,
  organisation         TEXT,
  team                 TEXT,
  description          TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── Goals ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS athlete_profile_goals (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id        UUID        REFERENCES athletes(id) ON DELETE CASCADE,
  goal_12_months    TEXT,
  long_term_dream   TEXT,
  formula14_goal    TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(athlete_id)
);

-- ── Training habits ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS athlete_training_habits (
  id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id                 UUID        REFERENCES athletes(id) ON DELETE CASCADE,
  weekly_training_sessions   TEXT,
  weekly_games               TEXT,
  individual_skill_frequency TEXT,
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(athlete_id)
);

-- ── Physical information (multiple rows = historical measurements) ─────────────
CREATE TABLE IF NOT EXISTS athlete_physical_info (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id        UUID        REFERENCES athletes(id) ON DELETE CASCADE,
  height_cm         DECIMAL,
  weight_kg         DECIMAL,
  wingspan_cm       DECIMAL,
  vertical_jump_cm  DECIMAL,
  measurement_date  DATE,
  -- Future integration hook (Part 6): no UNIQUE — allows historical rows
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Medical information (confidential) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS athlete_medical_info (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id           UUID        REFERENCES athletes(id) ON DELETE CASCADE,
  current_injuries     TEXT,
  medical_conditions   TEXT,
  allergies            TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(athlete_id)
);

-- ── Communication preferences ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS athlete_communication_prefs (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id               UUID        REFERENCES athletes(id) ON DELETE CASCADE,
  preferred_contact_method TEXT,
  receive_tips_updates     BOOLEAN     DEFAULT true,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(athlete_id)
);

-- ── BV Age Group (auto-calculated, cached for performance) ────────────────────
CREATE TABLE IF NOT EXISTS athlete_bv_age_group (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id              UUID        REFERENCES athletes(id) ON DELETE CASCADE,
  date_of_birth           DATE,
  current_age             INTEGER,
  bv_age_group            TEXT,       -- 'Under 8' | 'Under 10' | ... | 'Senior'
  playing_year            TEXT,       -- 'First Year' | 'Second Year' | null
  birth_year              INTEGER,
  age_on_31_dec           INTEGER,
  -- Future integration hook (Part 6)
  next_recalculation_date DATE,       -- set to Jan 1 of next year
  calculated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(athlete_id)
);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Following the same permissive dev pattern as existing tables (003_rls.sql).
-- Access control is enforced at the Next.js application layer via NextAuth roles.
-- Tighten these to role-based policies before going to production.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'athlete_profiles',
    'athlete_basketball_levels',
    'athlete_domestic_teams',
    'athlete_junior_rep',
    'athlete_school_basketball',
    'athlete_bigv_nbl1',
    'athlete_collegiate',
    'athlete_bv_pathways',
    'athlete_ba_pathways',
    'athlete_professional_seasons',
    'athlete_other_competitions',
    'athlete_profile_goals',
    'athlete_training_habits',
    'athlete_physical_info',
    'athlete_medical_info',
    'athlete_communication_prefs',
    'athlete_bv_age_group'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('
      DROP POLICY IF EXISTS "dev_allow_all" ON %I;
      CREATE POLICY "dev_allow_all" ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    ', t, t);
  END LOOP;
END;
$$;

-- ── Indexes for performance ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_athlete_profiles_athlete_id       ON athlete_profiles(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athlete_bball_levels_athlete_id   ON athlete_basketball_levels(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athlete_domestic_teams_athlete_id ON athlete_domestic_teams(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athlete_junior_rep_athlete_id     ON athlete_junior_rep(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athlete_school_athlete_id         ON athlete_school_basketball(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athlete_goals_athlete_id          ON athlete_profile_goals(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athlete_habits_athlete_id         ON athlete_training_habits(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athlete_physical_athlete_id       ON athlete_physical_info(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athlete_medical_athlete_id        ON athlete_medical_info(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athlete_bv_age_group_athlete_id  ON athlete_bv_age_group(athlete_id);
