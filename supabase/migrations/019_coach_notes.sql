-- Formula14 · Coach Notes
-- Migration 019 — admin-only timestamped notes per athlete

CREATE TABLE IF NOT EXISTS athlete_coach_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id  UUID        REFERENCES athletes(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL,
  author_name TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE athlete_coach_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dev_allow_all" ON athlete_coach_notes;
CREATE POLICY "dev_allow_all" ON athlete_coach_notes
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_coach_notes_athlete_id ON athlete_coach_notes(athlete_id);
CREATE INDEX IF NOT EXISTS idx_coach_notes_created_at ON athlete_coach_notes(created_at DESC);
