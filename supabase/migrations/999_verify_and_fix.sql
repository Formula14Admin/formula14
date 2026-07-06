-- ─────────────────────────────────────────────────────────────────────────────
-- 999_verify_and_fix.sql
-- Formula14 · Full idempotent schema verification and repair
-- Safe to run multiple times against any state of the database.
-- Covers migrations 001–016.
-- ─────────────────────────────────────────────────────────────────────────────


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 1 · EXTENSIONS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 2 · TABLES  (CREATE IF NOT EXISTS — all 31)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email                TEXT        NOT NULL UNIQUE,
  password_hash        TEXT        NOT NULL,
  role                 TEXT        NOT NULL DEFAULT 'athlete'
                       CHECK (role IN ('director','coach','athlete','coach_member')),
  first_name           TEXT,
  last_name            TEXT,
  avatar_url           TEXT,
  profile_completed    BOOLEAN     NOT NULL DEFAULT false,
  must_change_password BOOLEAN     NOT NULL DEFAULT false,
  last_login_at        TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS athletes (
  id                              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                         UUID        REFERENCES users(id) ON DELETE SET NULL,
  first_name                      TEXT        NOT NULL DEFAULT '',
  last_name                       TEXT        NOT NULL DEFAULT '',
  email                           TEXT,
  date_of_birth                   DATE,
  gender                          TEXT        DEFAULT 'Male',
  phone                           TEXT,
  position                        TEXT        DEFAULT '',
  rep_club                        TEXT,
  school                          TEXT,
  playing_history                 TEXT,
  goals                           TEXT,
  coach_notes                     TEXT,
  notes                           TEXT,
  emergency_contact_name          TEXT,
  emergency_contact_phone         TEXT,
  emergency_contact_relationship  TEXT,
  membership_tier                 TEXT,
  membership_status               TEXT,
  membership_started_date         DATE,
  next_billing_date               DATE,
  outstanding_balance             DECIMAL(10,2) DEFAULT 0,
  billing_records                 JSONB       DEFAULT '[]'::jsonb,
  sessions_total                  INTEGER     DEFAULT 0,
  sessions_this_month             INTEGER     DEFAULT 0,
  last_session_date               DATE,
  invite_status                   TEXT        DEFAULT NULL,
  is_active                       BOOLEAN     NOT NULL DEFAULT TRUE,
  stripe_customer_id              TEXT,
  stripe_payment_method_id        TEXT,
  last_login_at                   TIMESTAMPTZ,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS members (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id            UUID        REFERENCES athletes(id) ON DELETE SET NULL,
  first_name            TEXT        NOT NULL DEFAULT '',
  last_name             TEXT        NOT NULL DEFAULT '',
  email                 TEXT,
  plan                  TEXT        NOT NULL DEFAULT 'bronze'
                        CHECK (plan IN ('bronze','silver','gold','platinum','family')),
  status                TEXT        NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','cancelling','overdue','inactive')),
  started_date          DATE,
  next_charge_date      DATE,
  outstanding_balance   DECIMAL(10,2) DEFAULT 0,
  sessions_this_month   INTEGER     DEFAULT 0,
  notes                 TEXT,
  billing_records       JSONB       DEFAULT '[]'::jsonb,
  credit_usage          JSONB       DEFAULT '{}'::jsonb,
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id       TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id              TEXT        PRIMARY KEY,
  session_type    TEXT        NOT NULL,
  space           TEXT,
  date            DATE        NOT NULL,
  start_mins      INTEGER,
  duration_mins   INTEGER,
  coach_id        TEXT,
  booking_type    TEXT,
  status          TEXT        DEFAULT 'confirmed',
  notes           TEXT,
  athlete_names   JSONB       DEFAULT '[]'::jsonb,
  max_capacity    INTEGER     DEFAULT 1,
  repeat_rule     TEXT,
  ends_on         DATE,
  series_id       TEXT,
  shareable_code  TEXT,
  admin_override  BOOLEAN     DEFAULT FALSE,
  meta            JSONB       DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_athletes (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        TEXT        REFERENCES bookings(id) ON DELETE CASCADE,
  athlete_id        UUID        REFERENCES athletes(id) ON DELETE CASCADE,
  status            TEXT        DEFAULT 'confirmed',
  payment_status    TEXT        DEFAULT 'unpaid',
  locked_price      DECIMAL(10,2),
  attendance_status TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS join_requests (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  TEXT        REFERENCES bookings(id) ON DELETE CASCADE,
  athlete_id  UUID        REFERENCES athletes(id) ON DELETE CASCADE,
  status      TEXT        DEFAULT 'pending'
              CHECK (status IN ('pending','accepted','declined')),
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS membership_credits (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id       UUID        REFERENCES athletes(id) ON DELETE CASCADE,
  session_type     TEXT        NOT NULL,
  allowed_per_week INTEGER     NOT NULL DEFAULT 0,
  used_this_week   INTEGER     NOT NULL DEFAULT 0,
  week_start_date  DATE        NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (athlete_id, session_type, week_start_date)
);

CREATE TABLE IF NOT EXISTS transactions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id     UUID        REFERENCES athletes(id) ON DELETE SET NULL,
  booking_id     TEXT        REFERENCES bookings(id) ON DELETE SET NULL,
  amount         DECIMAL(10,2) NOT NULL,
  type           TEXT        NOT NULL,
  category       TEXT,
  description    TEXT,
  payment_method TEXT,
  payment_status TEXT        DEFAULT 'pending',
  reference      TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coach_availability (
  id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id              TEXT    NOT NULL,
  day_of_week           INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time            TIME,
  end_time              TIME,
  session_types_enabled JSONB   DEFAULT '[]'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facility_availability (
  id                     UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week            INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time             TIME,
  end_time               TIME,
  disabled_session_types JSONB   DEFAULT '[]'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS availability_exceptions (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  applies_to     TEXT    NOT NULL,
  exception_type TEXT    NOT NULL,
  date           DATE    NOT NULL,
  start_time     TIME,
  end_time       TIME,
  reason         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session_types (
  id                 UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  session_type_id    TEXT    NOT NULL UNIQUE,
  name               TEXT    NOT NULL,
  description        TEXT,
  duration_minutes   INTEGER DEFAULT 60,
  price              DECIMAL(10,2),
  pricing_type       TEXT    DEFAULT 'flat',
  tiers              JSONB   DEFAULT '[]'::jsonb,
  is_active          BOOLEAN DEFAULT TRUE,
  reason_if_inactive TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS programs (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT    NOT NULL,
  category          TEXT    NOT NULL,
  price_per_session DECIMAL(10,2),
  num_sessions      INTEGER DEFAULT 8,
  max_capacity      INTEGER DEFAULT 15,
  enrolment_type    TEXT    DEFAULT 'approval',
  description       TEXT,
  colour_tag        TEXT,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS program_enrolments (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id     UUID    REFERENCES programs(id) ON DELETE CASCADE,
  athlete_id     UUID    REFERENCES athletes(id) ON DELETE CASCADE,
  status         TEXT    DEFAULT 'pending-approval',
  payment_status TEXT,
  term_fee       DECIMAL(10,2),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID    REFERENCES users(id) ON DELETE SET NULL,
  job_title       TEXT,
  department      TEXT,
  employment_type TEXT,
  app_role        TEXT,
  pay_type        TEXT,
  pay_rate        DECIMAL(10,2),
  pay_frequency   TEXT,
  super_rate      DECIMAL(5,2),
  wwcc_number     TEXT,
  wwcc_expiry     DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE    NOT NULL,
  period_end   DATE    NOT NULL,
  total_amount DECIMAL(10,2),
  status       TEXT    DEFAULT 'draft',
  created_by   UUID    REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_items (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID    REFERENCES payroll_runs(id) ON DELETE CASCADE,
  staff_id       UUID    REFERENCES staff(id) ON DELETE CASCADE,
  sessions_count INTEGER DEFAULT 0,
  hours_count    DECIMAL(6,2) DEFAULT 0,
  rate           DECIMAL(10,2),
  amount         DECIMAL(10,2),
  status         TEXT    DEFAULT 'pending',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goals (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id     UUID    REFERENCES athletes(id) ON DELETE CASCADE,
  title          TEXT    NOT NULL,
  category       TEXT,
  target_date    DATE,
  motivation     TEXT,
  success_metric TEXT,
  status         TEXT    DEFAULT 'active',
  coach_visible  BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habits (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID    REFERENCES athletes(id) ON DELETE CASCADE,
  goal_id    UUID    REFERENCES goals(id) ON DELETE SET NULL,
  name       TEXT    NOT NULL,
  frequency  TEXT,
  habit_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habit_completions (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id       UUID    REFERENCES habits(id) ON DELETE CASCADE,
  completed_date DATE    NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (habit_id, completed_date)
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID    REFERENCES users(id) ON DELETE CASCADE,
  content       TEXT,
  mood          TEXT,
  tags          JSONB   DEFAULT '[]'::jsonb,
  privacy_level TEXT    DEFAULT 'private',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS how_we_feel (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id    UUID    REFERENCES athletes(id) ON DELETE CASCADE,
  emotion       TEXT,
  zone          TEXT,
  influencer    TEXT,
  journal_text  TEXT,
  privacy_level TEXT    DEFAULT 'private',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_posts (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  platform     TEXT,
  title        TEXT,
  content      TEXT,
  post_type    TEXT,
  status       TEXT    DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forms (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT    NOT NULL,
  folder     TEXT,
  fields     JSONB   DEFAULT '[]'::jsonb,
  created_by UUID    REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS form_responses (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id      UUID    REFERENCES forms(id) ON DELETE CASCADE,
  responses    JSONB   DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS boards (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT    NOT NULL,
  columns    JSONB   DEFAULT '[]'::jsonb,
  created_by UUID    REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS board_tasks (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id    UUID    REFERENCES boards(id) ON DELETE CASCADE,
  title       TEXT    NOT NULL,
  description TEXT,
  status      TEXT    DEFAULT 'todo',
  assignee_id UUID    REFERENCES users(id) ON DELETE SET NULL,
  due_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_logs (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  template   TEXT        NOT NULL,
  recipient  TEXT        NOT NULL,
  subject    TEXT,
  status     TEXT        NOT NULL DEFAULT 'sent',
  resend_id  TEXT,
  error      TEXT,
  metadata   JSONB       DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_templates (
  id         TEXT        PRIMARY KEY,
  subject    TEXT        NOT NULL,
  body_html  TEXT        NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS receipts (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  uploaded_by      TEXT        NOT NULL DEFAULT 'matt',
  merchant_name    TEXT,
  purchase_date    DATE,
  amount           NUMERIC(10,2),
  gst_amount       NUMERIC(10,2),
  category         TEXT,
  description      TEXT,
  payment_method   TEXT,
  is_reimbursable  BOOLEAN     NOT NULL DEFAULT false,
  status           TEXT        NOT NULL DEFAULT 'unreviewed'
                               CHECK (status IN ('unreviewed','reviewed','exported')),
  image_url        TEXT,
  thumbnail_url    TEXT,
  file_type        TEXT        NOT NULL DEFAULT 'image'
                               CHECK (file_type IN ('image','pdf','manual')),
  transaction_id   UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 3 · ADDITIONAL COLUMNS  (ALTER TABLE … ADD COLUMN IF NOT EXISTS)
-- These were added in migrations 006–015 on top of the base schema.
-- ══════════════════════════════════════════════════════════════════════════════

-- users (006, 015)
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completed    BOOLEAN     NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN     NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at        TIMESTAMPTZ;

-- athletes (006, 007, 013, 014, 015)
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS invite_status              TEXT        DEFAULT NULL;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS is_active                  BOOLEAN     NOT NULL DEFAULT TRUE;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS stripe_customer_id         TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS stripe_payment_method_id   TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS last_login_at              TIMESTAMPTZ;

-- members (013)
ALTER TABLE members ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS stripe_price_id        TEXT;

-- programs (008)
ALTER TABLE programs ADD COLUMN IF NOT EXISTS num_sessions INTEGER DEFAULT 8;


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 4 · INDEXES
-- ══════════════════════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS athletes_stripe_customer_id_idx
  ON athletes (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS members_stripe_subscription_id_idx
  ON members (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS members_stripe_customer_id_idx
  ON members (stripe_customer_id);

CREATE INDEX IF NOT EXISTS email_logs_template_idx   ON email_logs (template);
CREATE INDEX IF NOT EXISTS email_logs_recipient_idx  ON email_logs (recipient);
CREATE INDEX IF NOT EXISTS email_logs_created_at_idx ON email_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS receipts_purchase_date_idx ON receipts (purchase_date DESC);
CREATE INDEX IF NOT EXISTS receipts_status_idx        ON receipts (status);
CREATE INDEX IF NOT EXISTS receipts_uploaded_by_idx   ON receipts (uploaded_by);


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 5 · UNIQUE CONSTRAINTS  (016)
-- ══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'facility_availability_dow_unique') THEN
    ALTER TABLE facility_availability ADD CONSTRAINT facility_availability_dow_unique UNIQUE (day_of_week);
  END IF;
END $$;

-- coach_availability: multi-slot support (021) — drop old single-slot constraint,
-- add slot_index column, add new per-slot unique constraint.
DO $$ BEGIN
  ALTER TABLE coach_availability DROP CONSTRAINT IF EXISTS coach_availability_coach_dow_unique;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coach_availability' AND column_name = 'slot_index'
  ) THEN
    ALTER TABLE coach_availability ADD COLUMN slot_index INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coach_availability_coach_dow_slot_unique') THEN
    ALTER TABLE coach_availability ADD CONSTRAINT coach_availability_coach_dow_slot_unique UNIQUE (coach_id, day_of_week, slot_index);
  END IF;
END $$;


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 6 · ROW LEVEL SECURITY  (003 + individual migration tables)
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE members                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings                ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_athletes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_requests           ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_credits      ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_availability      ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_availability   ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_types           ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_enrolments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries         ENABLE ROW LEVEL SECURITY;
ALTER TABLE how_we_feel             ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts                ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','athletes','members','bookings','booking_athletes','join_requests',
    'membership_credits','transactions','coach_availability','facility_availability',
    'availability_exceptions','session_types','programs','program_enrolments',
    'staff','payroll_runs','payroll_items','goals','habits','habit_completions',
    'journal_entries','how_we_feel','social_posts','forms','form_responses',
    'boards','board_tasks','app_settings','email_logs','email_templates','receipts'
  ]
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "dev_allow_all" ON %I;
      CREATE POLICY "dev_allow_all" ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    ', t, t);
  END LOOP;
END;
$$;


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 7 · FUNCTIONS
-- ══════════════════════════════════════════════════════════════════════════════

-- updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','athletes','members','bookings','join_requests','membership_credits',
    'coach_availability','facility_availability','session_types','programs',
    'program_enrolments','staff','goals','habits','journal_entries',
    'social_posts','forms','boards','board_tasks','receipts'
  ]
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_updated_at ON %I;
      CREATE TRIGGER trg_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    ', t, t);
  END LOOP;
END;
$$;

-- authenticate_user (latest version from 015 — includes must_change_password)
DROP FUNCTION IF EXISTS authenticate_user(TEXT, TEXT);
CREATE OR REPLACE FUNCTION authenticate_user(p_email TEXT, p_password TEXT)
RETURNS TABLE(
  id                   UUID,
  email                TEXT,
  first_name           TEXT,
  last_name            TEXT,
  role                 TEXT,
  must_change_password BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user_id UUID;
BEGIN
  SELECT u.id INTO v_user_id
  FROM users u
  WHERE u.email = p_email
    AND u.password_hash = extensions.crypt(p_password, u.password_hash);

  IF v_user_id IS NULL THEN RETURN; END IF;

  UPDATE users SET last_login_at = NOW() WHERE users.id = v_user_id;
  UPDATE athletes
    SET last_login_at = NOW(),
        invite_status = CASE WHEN invite_status = 'invited' THEN 'accepted' ELSE invite_status END
    WHERE user_id = v_user_id;

  RETURN QUERY
    SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.must_change_password
    FROM users u WHERE u.id = v_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION authenticate_user(TEXT, TEXT) TO anon, authenticated;

-- register_user (006)
CREATE OR REPLACE FUNCTION register_user(
  p_email          TEXT,
  p_password       TEXT,
  p_first_name     TEXT,
  p_last_name      TEXT,
  p_phone          TEXT    DEFAULT NULL,
  p_dob            DATE    DEFAULT NULL,
  p_registering_as TEXT    DEFAULT 'athlete',
  p_athlete_name   TEXT    DEFAULT NULL
)
RETURNS TABLE(id UUID, email TEXT, first_name TEXT, last_name TEXT, role TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id   UUID;
  v_ath_first TEXT;
  v_ath_last  TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM users u WHERE u.email = p_email) THEN
    RAISE EXCEPTION 'EMAIL_EXISTS';
  END IF;
  INSERT INTO users (email, password_hash, role, first_name, last_name)
  VALUES (p_email, extensions.crypt(p_password, extensions.gen_salt('bf', 10)), 'athlete', p_first_name, p_last_name)
  RETURNING users.id INTO v_user_id;

  IF p_registering_as = 'parent' AND p_athlete_name IS NOT NULL AND trim(p_athlete_name) <> '' THEN
    v_ath_first := split_part(trim(p_athlete_name), ' ', 1);
    v_ath_last  := COALESCE(NULLIF(trim(substring(trim(p_athlete_name) from position(' ' in trim(p_athlete_name)))), ''), '');
  ELSE
    v_ath_first := p_first_name;
    v_ath_last  := p_last_name;
  END IF;
  INSERT INTO athletes (user_id, first_name, last_name, email, phone, date_of_birth)
  VALUES (v_user_id, v_ath_first, v_ath_last, p_email, p_phone, p_dob);

  RETURN QUERY SELECT v_user_id, p_email, p_first_name, p_last_name, 'athlete'::TEXT;
END;
$$;
GRANT EXECUTE ON FUNCTION register_user(TEXT,TEXT,TEXT,TEXT,TEXT,DATE,TEXT,TEXT) TO anon, authenticated;

-- invite_athlete (006)
CREATE OR REPLACE FUNCTION invite_athlete(
  p_email           TEXT    DEFAULT NULL,
  p_first_name      TEXT    DEFAULT '',
  p_last_name       TEXT    DEFAULT '',
  p_phone           TEXT    DEFAULT NULL,
  p_dob             DATE    DEFAULT NULL,
  p_position        TEXT    DEFAULT NULL,
  p_school          TEXT    DEFAULT NULL,
  p_goals           TEXT    DEFAULT NULL,
  p_coach_notes     TEXT    DEFAULT NULL,
  p_emergency_name  TEXT    DEFAULT NULL,
  p_emergency_phone TEXT    DEFAULT NULL,
  p_emergency_rel   TEXT    DEFAULT NULL
)
RETURNS TABLE(athlete_id UUID, user_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id    UUID;
  v_athlete_id UUID;
  v_temp_pass  TEXT := gen_random_uuid()::TEXT;
BEGIN
  IF p_email IS NOT NULL AND trim(p_email) <> '' THEN
    IF NOT EXISTS (SELECT 1 FROM users u WHERE u.email = p_email) THEN
      INSERT INTO users (email, password_hash, role, first_name, last_name)
      VALUES (p_email, extensions.crypt(v_temp_pass, extensions.gen_salt('bf', 10)), 'athlete', p_first_name, p_last_name)
      RETURNING users.id INTO v_user_id;
    ELSE
      SELECT u.id INTO v_user_id FROM users u WHERE u.email = p_email;
    END IF;
  END IF;

  INSERT INTO athletes (
    user_id, first_name, last_name, email, phone, date_of_birth,
    position, school, goals, coach_notes,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
    invite_status
  ) VALUES (
    v_user_id, p_first_name, p_last_name,
    NULLIF(trim(COALESCE(p_email, '')), ''), p_phone, p_dob,
    NULLIF(trim(COALESCE(p_position, '')), ''),
    NULLIF(trim(COALESCE(p_school, '')), ''),
    NULLIF(trim(COALESCE(p_goals, '')), ''),
    NULLIF(trim(COALESCE(p_coach_notes, '')), ''),
    NULLIF(trim(COALESCE(p_emergency_name, '')), ''),
    NULLIF(trim(COALESCE(p_emergency_phone, '')), ''),
    NULLIF(trim(COALESCE(p_emergency_rel, '')), ''),
    CASE WHEN p_email IS NOT NULL AND trim(p_email) <> '' THEN 'invited' ELSE NULL END
  )
  RETURNING athletes.id INTO v_athlete_id;

  RETURN QUERY SELECT v_athlete_id, v_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION invite_athlete(TEXT,TEXT,TEXT,TEXT,DATE,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO anon, authenticated;

-- create_athlete_account (015)
CREATE OR REPLACE FUNCTION create_athlete_account(
  p_email           TEXT,
  p_password        TEXT,
  p_first_name      TEXT,
  p_last_name       TEXT,
  p_phone           TEXT  DEFAULT NULL,
  p_dob             DATE  DEFAULT NULL,
  p_position        TEXT  DEFAULT NULL,
  p_school          TEXT  DEFAULT NULL,
  p_goals           TEXT  DEFAULT NULL,
  p_coach_notes     TEXT  DEFAULT NULL,
  p_emergency_name  TEXT  DEFAULT NULL,
  p_emergency_phone TEXT  DEFAULT NULL,
  p_emergency_rel   TEXT  DEFAULT NULL
)
RETURNS TABLE(athlete_id UUID, user_id UUID, is_new_account BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id    UUID;
  v_athlete_id UUID;
  v_is_new     BOOLEAN := false;
BEGIN
  SELECT u.id INTO v_user_id FROM users u WHERE u.email = p_email;
  IF v_user_id IS NULL THEN
    INSERT INTO users (email, password_hash, role, first_name, last_name, must_change_password)
    VALUES (p_email, extensions.crypt(p_password, extensions.gen_salt('bf', 10)), 'athlete', p_first_name, p_last_name, true)
    RETURNING users.id INTO v_user_id;
    v_is_new := true;
  END IF;

  SELECT a.id INTO v_athlete_id FROM athletes a WHERE a.user_id = v_user_id;
  IF v_athlete_id IS NULL THEN
    SELECT a.id INTO v_athlete_id FROM athletes a WHERE a.email = p_email;
  END IF;

  IF v_athlete_id IS NULL THEN
    INSERT INTO athletes (
      user_id, first_name, last_name, email, phone, date_of_birth,
      position, school, goals, coach_notes,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
      invite_status
    ) VALUES (
      v_user_id, p_first_name, p_last_name, p_email, p_phone, p_dob,
      NULLIF(trim(COALESCE(p_position, '')), ''),
      NULLIF(trim(COALESCE(p_school,   '')), ''),
      NULLIF(trim(COALESCE(p_goals,    '')), ''),
      NULLIF(trim(COALESCE(p_coach_notes, '')), ''),
      NULLIF(trim(COALESCE(p_emergency_name,  '')), ''),
      NULLIF(trim(COALESCE(p_emergency_phone, '')), ''),
      NULLIF(trim(COALESCE(p_emergency_rel,   '')), ''),
      'invited'
    )
    RETURNING athletes.id INTO v_athlete_id;
  ELSE
    UPDATE athletes SET user_id = v_user_id, invite_status = 'invited'
    WHERE id = v_athlete_id AND (user_id IS NULL OR user_id != v_user_id);
  END IF;

  RETURN QUERY SELECT v_athlete_id, v_user_id, v_is_new;
END;
$$;
GRANT EXECUTE ON FUNCTION create_athlete_account(TEXT,TEXT,TEXT,TEXT,TEXT,DATE,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO anon, authenticated;

-- update_user_password (015)
CREATE OR REPLACE FUNCTION update_user_password(
  p_email        TEXT,
  p_new_password TEXT,
  p_must_change  BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE users
  SET password_hash        = extensions.crypt(p_new_password, extensions.gen_salt('bf', 10)),
      must_change_password = p_must_change
  WHERE email = p_email;
END;
$$;
GRANT EXECUTE ON FUNCTION update_user_password(TEXT, TEXT, BOOLEAN) TO anon, authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 8 · SEED DATA
-- ══════════════════════════════════════════════════════════════════════════════

-- session_types (10 rows — from 008, which supersedes the 004 format)
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

-- programs (7 rows — only if table is empty)
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

-- app_settings — module visibility (009)
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

-- facility_availability — Mon–Sat default hours (016)
INSERT INTO facility_availability (day_of_week, start_time, end_time, disabled_session_types)
VALUES
  (1, '06:00'::TIME, '21:00'::TIME, '[]'::jsonb),
  (2, '06:00'::TIME, '21:00'::TIME, '[]'::jsonb),
  (3, '06:00'::TIME, '21:00'::TIME, '[]'::jsonb),
  (4, '06:00'::TIME, '21:00'::TIME, '[]'::jsonb),
  (5, '06:00'::TIME, '21:00'::TIME, '[]'::jsonb),
  (6, '07:00'::TIME, '19:00'::TIME, '[]'::jsonb)
ON CONFLICT (day_of_week) DO NOTHING;

-- coach_availability — Matt (s1) Mon–Fri, Jade (s2) Tue–Sat, Sam (s3) Sat–Sun (016)
INSERT INTO coach_availability (coach_id, day_of_week, start_time, end_time, session_types_enabled)
SELECT 's1', d, '06:00'::TIME, '21:00'::TIME,
  '["individual","small-group","team-training","film-room-session"]'::jsonb
FROM unnest(ARRAY[1,2,3,4,5]) AS d
ON CONFLICT (coach_id, day_of_week) DO NOTHING;

INSERT INTO coach_availability (coach_id, day_of_week, start_time, end_time, session_types_enabled)
SELECT 's2', d, '06:00'::TIME, '21:00'::TIME,
  '["individual","small-group","team-training","film-room-session"]'::jsonb
FROM unnest(ARRAY[2,3,4,5,6]) AS d
ON CONFLICT (coach_id, day_of_week) DO NOTHING;

INSERT INTO coach_availability (coach_id, day_of_week, start_time, end_time, session_types_enabled)
SELECT 's3', d, '07:00'::TIME, '19:00'::TIME,
  '["individual","small-group","team-training","film-room-session"]'::jsonb
FROM unnest(ARRAY[6,0]) AS d
ON CONFLICT (coach_id, day_of_week) DO NOTHING;

-- Grants on availability tables (016)
GRANT SELECT, INSERT, UPDATE, DELETE ON facility_availability    TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON coach_availability       TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON availability_exceptions  TO anon, authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 9 · STORAGE BUCKET  (receipts — from 012)
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts', 'receipts', true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/heic','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "receipts_select" ON storage.objects;
DROP POLICY IF EXISTS "receipts_insert" ON storage.objects;
DROP POLICY IF EXISTS "receipts_update" ON storage.objects;
DROP POLICY IF EXISTS "receipts_delete" ON storage.objects;

CREATE POLICY "receipts_select" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "receipts_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "receipts_update" ON storage.objects FOR UPDATE USING (bucket_id = 'receipts');
CREATE POLICY "receipts_delete" ON storage.objects FOR DELETE USING (bucket_id = 'receipts');
