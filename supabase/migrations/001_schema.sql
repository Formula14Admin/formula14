-- Formula14 · Initial Schema
-- Run in the Supabase SQL editor in order: 001 → 002 → 003 → 004

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT        NOT NULL UNIQUE,
  password_hash TEXT       NOT NULL,
  role         TEXT        NOT NULL DEFAULT 'athlete'
               CHECK (role IN ('director','coach','athlete','coach_member')),
  first_name   TEXT,
  last_name    TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── athletes ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS athletes (
  id                           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                      UUID        REFERENCES users(id) ON DELETE SET NULL,
  -- Personal
  first_name                   TEXT        NOT NULL DEFAULT '',
  last_name                    TEXT        NOT NULL DEFAULT '',
  email                        TEXT,
  date_of_birth                DATE,
  gender                       TEXT        DEFAULT 'Male',
  phone                        TEXT,
  -- Basketball
  position                     TEXT        DEFAULT '',
  rep_club                     TEXT,
  school                       TEXT,
  playing_history              TEXT,
  -- Goals & Notes
  goals                        TEXT,
  coach_notes                  TEXT,
  notes                        TEXT,
  -- Emergency contact
  emergency_contact_name       TEXT,
  emergency_contact_phone      TEXT,
  emergency_contact_relationship TEXT,
  -- Membership
  membership_tier              TEXT,       -- bronze | silver | gold | platinum | null
  membership_status            TEXT,       -- active | cancelling | overdue | inactive | null
  membership_started_date      DATE,
  next_billing_date            DATE,
  outstanding_balance          DECIMAL(10,2) DEFAULT 0,
  billing_records              JSONB       DEFAULT '[]'::jsonb,
  -- Stats (denormalised for fast display)
  sessions_total               INTEGER     DEFAULT 0,
  sessions_this_month          INTEGER     DEFAULT 0,
  last_session_date            DATE,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── members ───────────────────────────────────────────────────────────────────
-- Separate table for the Memberships module (distinct demo population from athletes).
-- In a production build, members and athletes should be unified via athlete_id.
CREATE TABLE IF NOT EXISTS members (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id         UUID        REFERENCES athletes(id) ON DELETE SET NULL,
  first_name         TEXT        NOT NULL DEFAULT '',
  last_name          TEXT        NOT NULL DEFAULT '',
  email              TEXT,
  plan               TEXT        NOT NULL DEFAULT 'bronze'
                     CHECK (plan IN ('bronze','silver','gold','platinum','family')),
  status             TEXT        NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','cancelling','overdue','inactive')),
  started_date       DATE,
  next_charge_date   DATE,
  outstanding_balance DECIMAL(10,2) DEFAULT 0,
  sessions_this_month INTEGER    DEFAULT 0,
  notes              TEXT,
  billing_records    JSONB       DEFAULT '[]'::jsonb,
  credit_usage       JSONB       DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── bookings ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id               TEXT        PRIMARY KEY,  -- short uid from app
  session_type     TEXT        NOT NULL,
  space            TEXT,
  date             DATE        NOT NULL,
  start_mins       INTEGER,                  -- minutes from midnight
  duration_mins    INTEGER,
  coach_id         TEXT,
  booking_type     TEXT,                     -- member | casual | unavailable | program
  status           TEXT        DEFAULT 'confirmed',
  notes            TEXT,
  athlete_names    JSONB       DEFAULT '[]'::jsonb,
  max_capacity     INTEGER     DEFAULT 1,
  repeat_rule      TEXT,
  ends_on          DATE,
  series_id        TEXT,
  shareable_code   TEXT,
  admin_override   BOOLEAN     DEFAULT FALSE,
  meta             JSONB       DEFAULT '{}'::jsonb,  -- joinCode, memberTier, enrolments, etc.
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── booking_athletes ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_athletes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       TEXT        REFERENCES bookings(id) ON DELETE CASCADE,
  athlete_id       UUID        REFERENCES athletes(id) ON DELETE CASCADE,
  status           TEXT        DEFAULT 'confirmed',
  payment_status   TEXT        DEFAULT 'unpaid',
  locked_price     DECIMAL(10,2),
  attendance_status TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── join_requests ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS join_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   TEXT        REFERENCES bookings(id) ON DELETE CASCADE,
  athlete_id   UUID        REFERENCES athletes(id) ON DELETE CASCADE,
  status       TEXT        DEFAULT 'pending'
               CHECK (status IN ('pending','accepted','declined')),
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── membership_credits ────────────────────────────────────────────────────────
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

-- ── transactions ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id     UUID        REFERENCES athletes(id) ON DELETE SET NULL,
  booking_id     TEXT        REFERENCES bookings(id) ON DELETE SET NULL,
  amount         DECIMAL(10,2) NOT NULL,
  type           TEXT        NOT NULL,   -- debit | credit
  category       TEXT,
  description    TEXT,
  payment_method TEXT,
  payment_status TEXT        DEFAULT 'pending',
  reference      TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── coach_availability ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coach_availability (
  id                   UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id             TEXT  NOT NULL,
  day_of_week          INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time           TIME,
  end_time             TIME,
  session_types_enabled JSONB DEFAULT '[]'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── facility_availability ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS facility_availability (
  id                     UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week            INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time             TIME,
  end_time               TIME,
  disabled_session_types JSONB DEFAULT '[]'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── availability_exceptions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS availability_exceptions (
  id           UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  applies_to   TEXT  NOT NULL,  -- 'coach:<id>' | 'facility'
  exception_type TEXT NOT NULL, -- 'block' | 'extra'
  date         DATE  NOT NULL,
  start_time   TIME,
  end_time     TIME,
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── session_types ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_types (
  id                 UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  session_type_id    TEXT  NOT NULL UNIQUE,  -- 'individual', 'small-group', etc.
  name               TEXT  NOT NULL,
  description        TEXT,
  duration_minutes   INTEGER DEFAULT 60,
  price              DECIMAL(10,2),
  pricing_type       TEXT  DEFAULT 'flat',   -- flat | per_person | tiered
  tiers              JSONB DEFAULT '[]'::jsonb,
  is_active          BOOLEAN DEFAULT TRUE,
  reason_if_inactive TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── programs ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS programs (
  id               UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT  NOT NULL,
  category         TEXT  NOT NULL,   -- development | social
  price_per_session DECIMAL(10,2),
  max_capacity     INTEGER DEFAULT 15,
  enrolment_type   TEXT  DEFAULT 'approval',  -- instant | approval
  description      TEXT,
  colour_tag       TEXT,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── program_enrolments ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS program_enrolments (
  id           UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id   UUID  REFERENCES programs(id) ON DELETE CASCADE,
  athlete_id   UUID  REFERENCES athletes(id) ON DELETE CASCADE,
  status       TEXT  DEFAULT 'pending-approval',
  payment_status TEXT,
  term_fee     DECIMAL(10,2),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── staff ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id               UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID  REFERENCES users(id) ON DELETE SET NULL,
  job_title        TEXT,
  department       TEXT,
  employment_type  TEXT,
  app_role         TEXT,
  pay_type         TEXT,
  pay_rate         DECIMAL(10,2),
  pay_frequency    TEXT,
  super_rate       DECIMAL(5,2),
  wwcc_number      TEXT,
  wwcc_expiry      DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── payroll_runs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_runs (
  id           UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE  NOT NULL,
  period_end   DATE  NOT NULL,
  total_amount DECIMAL(10,2),
  status       TEXT  DEFAULT 'draft',
  created_by   UUID  REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── payroll_items ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_items (
  id            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
  staff_id      UUID  REFERENCES staff(id) ON DELETE CASCADE,
  sessions_count INTEGER DEFAULT 0,
  hours_count   DECIMAL(6,2) DEFAULT 0,
  rate          DECIMAL(10,2),
  amount        DECIMAL(10,2),
  status        TEXT  DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── goals ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id             UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id     UUID  REFERENCES athletes(id) ON DELETE CASCADE,
  title          TEXT  NOT NULL,
  category       TEXT,
  target_date    DATE,
  motivation     TEXT,
  success_metric TEXT,
  status         TEXT  DEFAULT 'active',
  coach_visible  BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── habits ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habits (
  id         UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID  REFERENCES athletes(id) ON DELETE CASCADE,
  goal_id    UUID  REFERENCES goals(id) ON DELETE SET NULL,
  name       TEXT  NOT NULL,
  frequency  TEXT,
  habit_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── habit_completions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habit_completions (
  id             UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id       UUID  REFERENCES habits(id) ON DELETE CASCADE,
  completed_date DATE  NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (habit_id, completed_date)
);

-- ── journal_entries ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS journal_entries (
  id            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID  REFERENCES users(id) ON DELETE CASCADE,
  content       TEXT,
  mood          TEXT,
  tags          JSONB DEFAULT '[]'::jsonb,
  privacy_level TEXT  DEFAULT 'private',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── how_we_feel ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS how_we_feel (
  id            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id    UUID  REFERENCES athletes(id) ON DELETE CASCADE,
  emotion       TEXT,
  zone          TEXT,
  influencer    TEXT,
  journal_text  TEXT,
  privacy_level TEXT  DEFAULT 'private',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── social_posts ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_posts (
  id           UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  platform     TEXT,
  title        TEXT,
  content      TEXT,
  post_type    TEXT,
  status       TEXT  DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── forms ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forms (
  id         UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT  NOT NULL,
  folder     TEXT,
  fields     JSONB DEFAULT '[]'::jsonb,
  created_by UUID  REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── form_responses ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS form_responses (
  id           UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id      UUID  REFERENCES forms(id) ON DELETE CASCADE,
  responses    JSONB DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── boards ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS boards (
  id         UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT  NOT NULL,
  columns    JSONB DEFAULT '[]'::jsonb,
  created_by UUID  REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── board_tasks ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS board_tasks (
  id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id    UUID  REFERENCES boards(id) ON DELETE CASCADE,
  title       TEXT  NOT NULL,
  description TEXT,
  status      TEXT  DEFAULT 'todo',
  assignee_id UUID  REFERENCES users(id) ON DELETE SET NULL,
  due_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
