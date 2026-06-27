-- Formula14 · Row Level Security
-- Run after 002_functions.sql
--
-- Architecture note:
-- This app uses NextAuth (not Supabase Auth), so auth.uid() is not available
-- in RLS policies. The current policies allow the anon key to read/write all
-- tables — access control is enforced at the Next.js application layer.
--
-- To tighten security for production, either:
--   a) Replace NextAuth with Supabase Auth and use auth.uid() in policies, OR
--   b) Add a SUPABASE_SERVICE_ROLE_KEY env var and route all mutations through
--      server-side Next.js API routes (service role bypasses RLS).
--
-- Role hierarchy (enforced at the Next.js layer via NextAuth session.user.role):
--   director    → full read/write on all data
--   coach       → read/write their own bookings and their athletes' data
--   athlete     → read/write their own profile, bookings, goals, habits, journal
--   coach_member → read/write their own goals, habits, journal, plays only

-- ── Enable RLS on all tables ──────────────────────────────────────────────────
ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE members                ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_athletes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_credits     ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_availability     ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_availability  ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_types          ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_enrolments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE how_we_feel            ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_tasks            ENABLE ROW LEVEL SECURITY;

-- ── Development policies (permissive — anon can read and write everything) ────
-- Replace with role-based policies before going to production.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','athletes','members','bookings','booking_athletes','join_requests',
    'membership_credits','transactions','coach_availability','facility_availability',
    'availability_exceptions','session_types','programs','program_enrolments',
    'staff','payroll_runs','payroll_items','goals','habits','habit_completions',
    'journal_entries','how_we_feel','social_posts','forms','form_responses',
    'boards','board_tasks'
  ]
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "dev_allow_all" ON %I;
      CREATE POLICY "dev_allow_all" ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    ', t, t);
  END LOOP;
END;
$$;

-- ── Production policy templates (commented out — activate when ready) ─────────
--
-- Example: restrict users table so only the service role or the user themselves can read
--
-- DROP POLICY IF EXISTS "dev_allow_all" ON users;
--
-- CREATE POLICY "directors_all" ON users FOR ALL TO authenticated
--   USING (auth.jwt()->>'role' = 'director')
--   WITH CHECK (auth.jwt()->>'role' = 'director');
--
-- CREATE POLICY "own_profile" ON users FOR SELECT TO authenticated
--   USING (id::text = auth.uid()::text);
--
-- CREATE POLICY "coaches_read_athletes" ON athletes FOR SELECT TO authenticated
--   USING (auth.jwt()->>'role' IN ('director', 'coach'));
--
-- CREATE POLICY "athletes_own_data" ON athletes FOR ALL TO authenticated
--   USING (user_id::text = auth.uid()::text)
--   WITH CHECK (user_id::text = auth.uid()::text);
