-- Formula14 · User registration + athlete invitation functions
-- Run after 001–005 in the Supabase SQL editor.

-- ── Schema additions ──────────────────────────────────────────────────────────

ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS invite_status TEXT DEFAULT NULL;
-- Values: NULL = direct admin add, 'invited' = invite sent, 'accepted' = invite claimed

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT false;

-- ── register_user ─────────────────────────────────────────────────────────────
-- Called from the public /signup page. Creates a user + athlete record.
-- SECURITY DEFINER lets the anon role insert into users without exposing the table.
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
RETURNS TABLE(
  id         UUID,
  email      TEXT,
  first_name TEXT,
  last_name  TEXT,
  role       TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  VALUES (
    p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
    'athlete',
    p_first_name,
    p_last_name
  )
  RETURNING users.id INTO v_user_id;

  -- For parent registrations, the athlete is the child (use athlete_name field)
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

GRANT EXECUTE ON FUNCTION
  register_user(TEXT,TEXT,TEXT,TEXT,TEXT,DATE,TEXT,TEXT)
  TO anon, authenticated;

-- ── invite_athlete ────────────────────────────────────────────────────────────
-- Called from the admin Athletes page. Creates a user account (if email given)
-- and an athlete record with invite_status = 'invited'.
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
RETURNS TABLE(
  athlete_id UUID,
  user_id    UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    UUID;
  v_athlete_id UUID;
  v_temp_pass  TEXT := gen_random_uuid()::TEXT;
BEGIN
  IF p_email IS NOT NULL AND trim(p_email) <> '' THEN
    IF NOT EXISTS (SELECT 1 FROM users u WHERE u.email = p_email) THEN
      INSERT INTO users (email, password_hash, role, first_name, last_name)
      VALUES (
        p_email,
        extensions.crypt(v_temp_pass, extensions.gen_salt('bf', 10)),
        'athlete',
        p_first_name,
        p_last_name
      )
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
    v_user_id,
    p_first_name, p_last_name,
    NULLIF(trim(COALESCE(p_email, '')), ''),
    p_phone, p_dob,
    NULLIF(trim(COALESCE(p_position, '')), ''),
    NULLIF(trim(COALESCE(p_school, '')), ''),
    NULLIF(trim(COALESCE(p_goals, '')), ''),
    NULLIF(trim(COALESCE(p_coach_notes, '')), ''),
    NULLIF(trim(COALESCE(p_emergency_name, '')), ''),
    NULLIF(trim(COALESCE(p_emergency_phone, '')), ''),
    NULLIF(trim(COALESCE(p_emergency_rel, '')), ''),
    CASE
      WHEN p_email IS NOT NULL AND trim(p_email) <> '' THEN 'invited'
      ELSE NULL
    END
  )
  RETURNING athletes.id INTO v_athlete_id;

  RETURN QUERY SELECT v_athlete_id, v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION
  invite_athlete(TEXT,TEXT,TEXT,TEXT,DATE,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT)
  TO anon, authenticated;
