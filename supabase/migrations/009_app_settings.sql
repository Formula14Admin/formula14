-- 009 · App settings table (module visibility, global config)
-- Run in Supabase SQL editor after 008_seed_session_types_programs.sql

CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Permissive dev policy (same pattern as all other tables in 003_rls.sql)
DROP POLICY IF EXISTS "dev_allow_all" ON app_settings;
CREATE POLICY "dev_allow_all" ON app_settings
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Seed default module visibility
INSERT INTO app_settings (key, value) VALUES (
  'module_visibility',
  jsonb_build_object(
    'athlete', jsonb_build_object(
      'dashboard',    jsonb_build_object('enabled', true,  'comingSoon', false),
      'book',         jsonb_build_object('enabled', true,  'comingSoon', false),
      'bookings',     jsonb_build_object('enabled', true,  'comingSoon', false),
      'membership',   jsonb_build_object('enabled', true,  'comingSoon', false),
      'journal',      jsonb_build_object('enabled', true,  'comingSoon', false),
      'goals',        jsonb_build_object('enabled', true,  'comingSoon', false),
      'how-we-feel',  jsonb_build_object('enabled', true,  'comingSoon', false),
      'leaderboards', jsonb_build_object('enabled', true,  'comingSoon', true),
      'programs',     jsonb_build_object('enabled', true,  'comingSoon', false)
    ),
    'coach', jsonb_build_object(
      'dashboard',    jsonb_build_object('enabled', true),
      'athletes',     jsonb_build_object('enabled', true),
      'bookings',     jsonb_build_object('enabled', true),
      'formula-draw', jsonb_build_object('enabled', true),
      'formula-sub',  jsonb_build_object('enabled', true),
      'formula-stat', jsonb_build_object('enabled', true),
      'learning-lab', jsonb_build_object('enabled', true),
      'journal',      jsonb_build_object('enabled', true),
      'goals',        jsonb_build_object('enabled', true),
      'how-we-feel',  jsonb_build_object('enabled', true),
      'hr',           jsonb_build_object('enabled', true)
    ),
    'coachMember', jsonb_build_object(
      'formula-draw',    jsonb_build_object('enabled', true),
      'formula-sub',     jsonb_build_object('enabled', true),
      'formula-stat',    jsonb_build_object('enabled', true),
      'learning-lab',    jsonb_build_object('enabled', true),
      'formula-connect', jsonb_build_object('enabled', false)
    )
  )
) ON CONFLICT (key) DO NOTHING;
