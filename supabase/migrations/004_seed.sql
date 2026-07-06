-- Formula14 · Seed Data
-- Run after 003_rls.sql
-- Passwords are hashed at INSERT time using pgcrypto crypt().

-- ── Users (staff accounts) ────────────────────────────────────────────────────
INSERT INTO users (email, password_hash, role, first_name, last_name) VALUES
  ('matt@formula14.com.au', crypt('Formula14Matt!', gen_salt('bf', 10)), 'director', 'Matt', 'Brasser'),
  ('jade@formula14.com.au', crypt('Formula14Jade!', gen_salt('bf', 10)), 'director', 'Jade', 'Formula14')
ON CONFLICT (email) DO NOTHING;

-- ── Session Types (Pricing Configs) ───────────────────────────────────────────
INSERT INTO session_types (session_type_id, name, duration_minutes, pricing_type, tiers) VALUES
  ('individual',             'Individual Work Out',       60, 'flat',       '[{"label":"Per Session","price":85}]'::jsonb),
  ('small-group',            'Small Group Session',       60, 'per_person',  '[{"label":"Per Person","price":40}]'::jsonb),
  ('team-training',          'Team Training',             90, 'flat',        '[{"label":"Per Session","price":200}]'::jsonb),
  ('casual-shooting',        'Casual Shooting',           60, 'flat',        '[{"label":"Per Session","price":10}]'::jsonb),
  ('shooting-machine-session','Shooting Machine Session', 30, 'flat',        '[{"label":"30 min","price":30},{"label":"45 min","price":40},{"label":"60 min","price":50}]'::jsonb),
  ('weight-room-session',    'Weight Room Session',       60, 'flat',        '[{"label":"Per Session","price":15}]'::jsonb),
  ('film-room-session',      'Film Room Session',         60, 'flat',        '[{"label":"Per Session","price":20}]'::jsonb),
  ('volume-shooting',        'Volume Shooting',           60, 'flat',        '[{"label":"Per Session","price":25}]'::jsonb),
  ('development-programs',   'Development Programs',      60, 'per_person',  '[{"label":"Per Session","price":20}]'::jsonb),
  ('social-programs',        'Social Programs',           60, 'per_person',  '[{"label":"Per Session","price":15}]'::jsonb)
ON CONFLICT (session_type_id) DO NOTHING;
