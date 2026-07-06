-- Formula14 · Seed Data
-- Run after 003_rls.sql
-- Passwords are hashed at INSERT time using pgcrypto crypt().

-- ── Users (staff accounts) ────────────────────────────────────────────────────
INSERT INTO users (email, password_hash, role, first_name, last_name) VALUES
  ('matt@formula14.com.au', crypt('Formula14Matt!', gen_salt('bf', 10)), 'director', 'Matt', 'Brasser'),
  ('jade@formula14.com.au', crypt('Formula14Jade!', gen_salt('bf', 10)), 'director', 'Jade', 'Formula14')
ON CONFLICT (email) DO NOTHING;

-- ── Athletes ──────────────────────────────────────────────────────────────────
INSERT INTO athletes (
  first_name, last_name, email, phone, date_of_birth, gender, position,
  rep_club, school, goals, coach_notes,
  emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
  membership_tier, membership_status,
  sessions_total, sessions_this_month, last_session_date
) VALUES
  ('Liam',   'Carter',   'liam.carter@gmail.com',        '0412 345 678', '2009-08-15', 'Male',   'PG',
   'Ringwood Hawks',         'Whitefriars College',
   'Improve point guard decision-making under pressure. Work on left-hand drive and pick-and-roll reads.',
   'Strong work ethic, always early to sessions. Tendency to over-dribble when pressured — keep reinforcing quick-release decisions. Huge upside.',
   'Karen Carter',  '0403 111 222', 'Mother',
   'bronze', 'active', 68, 6, '2026-06-17'),

  ('Jordan', 'Williams', 'jordan.williams@outlook.com',  '0421 567 890', '2008-11-03', 'Male',   'SG',
   'Melbourne Tigers',       'De La Salle College',
   'Sharpen off-ball movement and catch-and-shoot mechanics. Improve defensive positioning on ball screens.',
   'Athletically gifted. Needs to trust his shot more in game situations — practice numbers don''t match his in-game hesitation. Great teammate and leader.',
   'Denise Williams', '0418 223 334', 'Mother',
   'silver', 'active', 142, 10, '2026-06-18'),

  ('Aisha',  'Thompson', 'aisha.thompson@icloud.com',    '0437 891 234', '2011-02-22', 'Female', 'PF',
   'Dandenong Rangers',      'Killester College',
   'Develop face-up game from the elbow. Improve free throw consistency (targeting 75%+ this season).',
   'One of the most coachable athletes we have. Hard worker who raises the intensity around her. Targeting U18 representative squad next season — she''ll be ready.',
   'Diane Thompson', '0409 445 556', 'Mother',
   'gold', 'active', 89, 8, '2026-06-17'),

  ('Marcus', 'Davies',   'marcus.davies@gmail.com',      '0445 012 345', '2007-05-10', 'Male',   'C',
   'Knox Raiders',           'Mount Waverley Secondary College',
   'Develop post footwork and drop-step finishes. Build conditioning for full-game fitness at senior level.',
   'Big body with excellent touch around the rim. Conditioning is the current ceiling — committed to off-session gym work which is showing results. Will be a dominant force if he stays consistent.',
   'Rob Davies',    '0411 667 778', 'Father',
   'gold', 'active', 116, 7, '2026-06-16'),

  ('Devon',  'Knox',     'devon.knox@hotmail.com',       '0456 234 567', '2011-09-30', 'Male',   'SF',
   'Casey Cavaliers',        'Casey Grammar',
   'Build on wing scoring ability. Develop a consistent mid-range pull-up jumper.',
   'Lots of raw talent. Needs to be more consistent with attendance — has missed several sessions this month. Follow up with parents re: commitment level. When he''s here, he''s great.',
   'Sharon Knox',   '0422 889 990', 'Mother',
   NULL, NULL, 24, 3, '2026-06-14'),

  ('Kai',    'Okafor',   'kai.okafor@gmail.com',         '0467 345 678', '2009-04-17', 'Male',   'SG',
   'Waverley Falcons',       'St Kevin''s College',
   'Develop primary ball-handling skills and improve 3-point range. Build consistency across all sessions.',
   'Has missed the last two sessions and has an overdue payment. Outstanding athlete when engaged — quick learner with great athleticism. Need to connect with the family about commitment.',
   'Chioma Okafor', '0433 556 667', 'Mother',
   'bronze', 'overdue', 41, 4, '2026-06-11'),

  ('Tyler',  'Ross',     'tyler.ross@outlook.com',       '0478 456 789', '2008-07-28', 'Male',   'PG',
   'Berwick Miners',         'Padua College',
   'Develop court vision and assist mentality. Reduce turnovers in transition. Push to U20 representative level.',
   'Very high basketball IQ — reads the game a step ahead. Working on reducing tunnel vision and seeing the pass before the drive. Best long-term prospect in our current group.',
   'Craig Ross',    '0444 778 889', 'Father',
   'silver', 'active', 158, 9, '2026-06-18'),

  ('Priya',  'Mehta',    'priya.mehta@gmail.com',        '0489 567 890', '2011-01-14', 'Female', 'SF',
   'Nunawading Spectres',    'Sacré-Coeur',
   'Become more assertive attacking the basket. Develop floater and pull-up jumper off live dribble penetration.',
   'Technical skills are excellent. Needs to build the confidence to take the game over — her instinct is to defer too early. Showed great improvement last month. Keep pushing her to be decisive.',
   'Anita Mehta',   '0455 890 001', 'Mother',
   'silver', 'active', 73, 8, '2026-06-17'),

  ('Sam',    'Liu',      'sam.liu@gmail.com',             '0491 678 901', '2010-06-05', 'Male',   'PF',
   'Box Hill Braves',        'Box Hill High School',
   'Expand offensive range to include mid-post game. Improve rebounding positioning and outlet passing.',
   'Our most sessions-per-month athlete — hungrier than anyone to improve. Strong hands and excellent body positioning. Starting to monitor for burnout; reminding him recovery is part of training.',
   'Wei Liu',       '0466 901 112', 'Father',
   'platinum', 'active', 104, 12, '2026-06-19'),

  ('Zara',   'Obi',      'zara.obi@icloud.com',          '0402 789 012', '2012-03-08', 'Female', 'C',
   'Dandenong Panthers',     'Killester College',
   'Learn proper post footwork and establish herself in the paint. Build confidence against physical defenders.',
   'Youngest athlete in our program at 14. Shows maturity beyond her years. Long-term development project — potential is very high. Keep sessions positive and focused on fundamentals.',
   'Ngozi Obi',     '0477 012 123', 'Mother',
   'bronze', 'active', 29, 5, '2026-06-16')
ON CONFLICT DO NOTHING;

-- ── Members ───────────────────────────────────────────────────────────────────
INSERT INTO members (
  first_name, last_name, email, plan, status,
  started_date, next_charge_date, outstanding_balance, sessions_this_month, notes,
  billing_records
) VALUES
  ('Jordan', 'Mitchell', 'jordan.mitchell@gmail.com',  'platinum', 'active',
   '2026-01-05', '2026-06-22', 0, 10, 'Focused on 3-point shooting improvement. Prefers afternoon sessions.',
   '[{"id":"b1-u","date":"2026-06-22","amount":100,"status":"upcoming"},{"id":"b1-1","date":"2026-06-15","amount":100,"status":"paid"},{"id":"b1-2","date":"2026-06-08","amount":100,"status":"paid"},{"id":"b1-3","date":"2026-06-01","amount":100,"status":"paid"},{"id":"b1-4","date":"2026-05-25","amount":100,"status":"paid"},{"id":"b1-5","date":"2026-05-18","amount":100,"status":"paid"}]'::jsonb),

  ('Mia',    'Chen',     'mia.chen@outlook.com',       'gold',     'active',
   '2025-12-01', '2026-06-22', 0, 11, 'Working on ball handling and finishing around the rim.',
   '[{"id":"b2-u","date":"2026-06-22","amount":75,"status":"upcoming"},{"id":"b2-1","date":"2026-06-15","amount":75,"status":"paid"},{"id":"b2-2","date":"2026-06-08","amount":75,"status":"paid"},{"id":"b2-3","date":"2026-06-01","amount":75,"status":"paid"},{"id":"b2-4","date":"2026-05-25","amount":75,"status":"paid"},{"id":"b2-5","date":"2026-05-18","amount":75,"status":"paid"}]'::jsonb),

  ('Tyler',  'Brooks',   'tyler.brooks@gmail.com',     'bronze',   'overdue',
   '2026-03-02', '2026-06-22', 35, 5, '',
   '[{"id":"b3-u","date":"2026-06-22","amount":35,"status":"upcoming"},{"id":"b3-f","date":"2026-06-15","amount":35,"status":"failed"},{"id":"b3-2","date":"2026-06-08","amount":35,"status":"paid"},{"id":"b3-3","date":"2026-06-01","amount":35,"status":"paid"},{"id":"b3-4","date":"2026-05-25","amount":35,"status":"paid"},{"id":"b3-5","date":"2026-05-18","amount":35,"status":"paid"}]'::jsonb),

  ('Emma',   'Walsh',    'emma.walsh@icloud.com',      'silver',   'cancelling',
   '2025-09-01', '2026-06-22', 0, 8, 'Moving interstate. Cancellation requested 17 Jun 2026 — effective end of current cycle.',
   '[{"id":"b4-u","date":"2026-06-22","amount":50,"status":"upcoming"},{"id":"b4-1","date":"2026-06-15","amount":50,"status":"paid"},{"id":"b4-2","date":"2026-06-08","amount":50,"status":"paid"},{"id":"b4-3","date":"2026-06-01","amount":50,"status":"paid"},{"id":"b4-4","date":"2026-05-25","amount":50,"status":"paid"},{"id":"b4-5","date":"2026-05-18","amount":50,"status":"paid"}]'::jsonb),

  ('Liam',   'Nguyen',   'liam.nguyen@gmail.com',      'bronze',   'active',
   '2026-06-01', '2026-06-22', 0, 3, 'New member. Beginner level — focus on fundamentals.',
   '[{"id":"b5-u","date":"2026-06-22","amount":35,"status":"upcoming"},{"id":"b5-1","date":"2026-06-15","amount":35,"status":"paid"},{"id":"b5-2","date":"2026-06-08","amount":35,"status":"paid"},{"id":"b5-3","date":"2026-06-01","amount":35,"status":"paid"}]'::jsonb),

  ('Sophie', 'Davis',    'sophie.davis@hotmail.com',   'platinum', 'inactive',
   '2025-06-02', NULL, 0, 0, 'On extended break. May return later in the year.',
   '[{"id":"b6-1","date":"2026-04-27","amount":100,"status":"paid"},{"id":"b6-2","date":"2026-04-20","amount":100,"status":"paid"},{"id":"b6-3","date":"2026-04-13","amount":100,"status":"paid"},{"id":"b6-4","date":"2026-04-06","amount":100,"status":"paid"}]'::jsonb)
ON CONFLICT DO NOTHING;

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
