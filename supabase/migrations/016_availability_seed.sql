-- 016_availability_seed.sql
-- Seeds default facility and coach availability, adds unique constraints for upsert support.
-- day_of_week follows JS Date.getDay() convention: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

-- ── Unique constraints (added only if missing) ────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'facility_availability_dow_unique') THEN
    ALTER TABLE facility_availability ADD CONSTRAINT facility_availability_dow_unique UNIQUE (day_of_week);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coach_availability_coach_dow_unique') THEN
    ALTER TABLE coach_availability ADD CONSTRAINT coach_availability_coach_dow_unique UNIQUE (coach_id, day_of_week);
  END IF;
END $$;

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

-- Coach availability is configured via the HR → Availability module.
-- No placeholder rows are seeded here.

-- ── Grants ────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON facility_availability    TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON coach_availability       TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON availability_exceptions  TO anon, authenticated;
