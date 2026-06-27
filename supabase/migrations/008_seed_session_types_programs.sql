-- 008 · Seed session_types and programs; add num_sessions to programs
-- Run in Supabase SQL editor after 007_athlete_active_status.sql

-- Add num_sessions column (not in original schema) ─────────────────────────
ALTER TABLE programs ADD COLUMN IF NOT EXISTS num_sessions INTEGER DEFAULT 8;

-- Seed session_types (no-op if already populated) ──────────────────────────
INSERT INTO session_types (session_type_id, name, duration_minutes, pricing_type, tiers)
VALUES
  ('individual',               'Individual Work Out',         60, 'tiered',
   '[{"id":"it1","min":1,"max":1,"pricePerAthlete":75}]'),
  ('small-group',              'Small Group Session',         90, 'tiered',
   '[{"id":"sg1","min":1,"max":1,"pricePerAthlete":50},{"id":"sg2","min":2,"max":2,"pricePerAthlete":45},{"id":"sg3","min":3,"max":3,"pricePerAthlete":40},{"id":"sg4","min":4,"max":6,"pricePerAthlete":35}]'),
  ('team-training',            'Team Training',              120, 'tiered',
   '[{"id":"tt1","min":7,"max":10,"pricePerAthlete":80}]'),
  ('casual-shooting',          'Casual Shooting',             60, 'flat',
   '[{"id":"cs1","min":1,"max":null,"pricePerAthlete":10}]'),
  ('volume-shooting',          'Volume Shooting',             60, 'tiered',
   '[]'),
  ('development-programs',     'Development Programs',        60, 'flat',
   '[]'),
  ('social-programs',          'Social Programs',             60, 'flat',
   '[]'),
  ('weight-room-session',      'Weight Room Session',         60, 'flat',
   '[{"id":"wr1","min":1,"max":null,"pricePerAthlete":15}]'),
  ('film-room-session',        'Film Room Session',           60, 'flat',
   '[{"id":"fr1","min":1,"max":null,"pricePerAthlete":20}]'),
  ('shooting-machine-session', 'Shooting Machine Session',    60, 'flat',
   '[{"id":"sm1","min":1,"max":null,"pricePerAthlete":15}]')
ON CONFLICT (session_type_id) DO NOTHING;

-- Seed programs (only if table is empty) ────────────────────────────────────
INSERT INTO programs (name, category, price_per_session, num_sessions, max_capacity, enrolment_type, description, colour_tag)
SELECT name, category, price_per_session, num_sessions, max_capacity, enrolment_type, description, colour_tag
FROM (VALUES
  ('Performance Lab',       'development', 20.00, 12, 15, 'approval',
   'Elite performance training focused on skill development, conditioning, and game IQ.',
   '#6BA3D6'),
  ('Domestic Academy',      'development', 20.00, 12, 15, 'approval',
   'Structured academy program for athletes chasing domestic competition pathways.',
   '#A06BD6'),
  ('Snipers Club',          'development', 20.00, 12, 15, 'approval',
   'Shooting-specific program to level up range and accuracy from all areas.',
   '#D4A520'),
  ('Shooters Lab',          'development', 20.00, 12, 15, 'approval',
   'Volume shooting and form correction for developing consistent shooters.',
   '#0EA5E9'),
  ('Walking Basketball',    'social',      15.00,  8, 20, 'instant',
   'Low-impact basketball for all ages and abilities. Great social activity for the community.',
   '#6BAD6B'),
  ('Mid Day Ladies Comp',   'social',      15.00,  8, 20, 'instant',
   'Midday competition for women of all abilities. Inclusive, welcoming, and fun.',
   '#E57373'),
  ('Adult Beginner School', 'social',      15.00,  8, 20, 'instant',
   'Introduction to basketball for adults new to the game. Relaxed and welcoming environment.',
   '#4DB6AC')
) AS data(name, category, price_per_session, num_sessions, max_capacity, enrolment_type, description, colour_tag)
WHERE NOT EXISTS (SELECT 1 FROM programs LIMIT 1);
