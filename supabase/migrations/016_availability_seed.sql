-- 016_availability_seed.sql
-- Seeds default facility and coach availability, adds unique constraints for upsert support.
-- day_of_week follows JS Date.getDay() convention: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

-- ── Unique constraints (safe to add idempotently) ─────────────────────────────
ALTER TABLE facility_availability
  ADD CONSTRAINT IF NOT EXISTS facility_availability_dow_unique UNIQUE (day_of_week);

ALTER TABLE coach_availability
  ADD CONSTRAINT IF NOT EXISTS coach_availability_coach_dow_unique UNIQUE (coach_id, day_of_week);

-- ── Default facility hours ────────────────────────────────────────────────────
-- Mon–Fri 6 am – 9 pm, Sat 7 am – 7 pm. Sunday has no row = closed.
INSERT INTO facility_availability (day_of_week, start_time, end_time, disabled_session_types)
VALUES
  (1, '06:00'::TIME, '21:00'::TIME, '[]'::jsonb),
  (2, '06:00'::TIME, '21:00'::TIME, '[]'::jsonb),
  (3, '06:00'::TIME, '21:00'::TIME, '[]'::jsonb),
  (4, '06:00'::TIME, '21:00'::TIME, '[]'::jsonb),
  (5, '06:00'::TIME, '21:00'::TIME, '[]'::jsonb),
  (6, '07:00'::TIME, '19:00'::TIME, '[]'::jsonb)
ON CONFLICT (day_of_week) DO NOTHING;

-- ── Default coach availability ────────────────────────────────────────────────
-- Matt Brasser (s1): Mon–Fri
INSERT INTO coach_availability (coach_id, day_of_week, start_time, end_time, session_types_enabled)
SELECT 's1', d, '06:00'::TIME, '21:00'::TIME,
  '["individual","small-group","team-training","film-room-session"]'::jsonb
FROM unnest(ARRAY[1,2,3,4,5]) AS d
ON CONFLICT (coach_id, day_of_week) DO NOTHING;

-- Jade Brasser (s2): Tue–Sat
INSERT INTO coach_availability (coach_id, day_of_week, start_time, end_time, session_types_enabled)
SELECT 's2', d, '06:00'::TIME, '21:00'::TIME,
  '["individual","small-group","team-training","film-room-session"]'::jsonb
FROM unnest(ARRAY[2,3,4,5,6]) AS d
ON CONFLICT (coach_id, day_of_week) DO NOTHING;

-- Sam Torres (s3): Sat–Sun
INSERT INTO coach_availability (coach_id, day_of_week, start_time, end_time, session_types_enabled)
SELECT 's3', d, '07:00'::TIME, '19:00'::TIME,
  '["individual","small-group","team-training","film-room-session"]'::jsonb
FROM unnest(ARRAY[6,0]) AS d
ON CONFLICT (coach_id, day_of_week) DO NOTHING;

-- ── Grants ────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON facility_availability    TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON coach_availability       TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON availability_exceptions  TO anon, authenticated;
