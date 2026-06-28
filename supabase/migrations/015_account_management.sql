-- Formula14 · Account management enhancements
-- Run in Supabase SQL editor after 001–014.

-- ── Schema additions ──────────────────────────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_at        TIMESTAMPTZ;

ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- ── authenticate_user (updated) ───────────────────────────────────────────────
-- Now also updates last_login_at on users + athletes, and returns must_change_password.

CREATE OR REPLACE FUNCTION authenticate_user(p_email TEXT, p_password TEXT)
RETURNS TABLE(
  id                   UUID,
  email                TEXT,
  first_name           TEXT,
  last_name            TEXT,
  role                 TEXT,
  must_change_password BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user_id UUID;
BEGIN
  SELECT u.id INTO v_user_id
  FROM users u
  WHERE u.email = p_email
    AND u.password_hash = extensions.crypt(p_password, u.password_hash);

  IF v_user_id IS NULL THEN RETURN; END IF;

  UPDATE users SET last_login_at = NOW() WHERE id = v_user_id;
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

-- ── create_athlete_account ────────────────────────────────────────────────────
-- Called from /api/athletes/create-account. Accepts a pre-generated temp password
-- so it can be included in the invitation email.
-- Returns athlete_id, user_id, and whether a brand-new user account was created.

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
RETURNS TABLE(
  athlete_id     UUID,
  user_id        UUID,
  is_new_account BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    UUID;
  v_athlete_id UUID;
  v_is_new     BOOLEAN := false;
BEGIN
  -- Look for existing user
  SELECT u.id INTO v_user_id FROM users u WHERE u.email = p_email;

  IF v_user_id IS NULL THEN
    INSERT INTO users (email, password_hash, role, first_name, last_name, must_change_password)
    VALUES (
      p_email,
      extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
      'athlete',
      p_first_name,
      p_last_name,
      true
    )
    RETURNING users.id INTO v_user_id;
    v_is_new := true;
  END IF;

  -- Look for existing athlete by user_id then by email
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
    -- Link existing athlete to user account (if not already linked)
    UPDATE athletes
    SET user_id = v_user_id, invite_status = 'invited'
    WHERE id = v_athlete_id AND (user_id IS NULL OR user_id != v_user_id);
  END IF;

  RETURN QUERY SELECT v_athlete_id, v_user_id, v_is_new;
END;
$$;

GRANT EXECUTE ON FUNCTION
  create_athlete_account(TEXT,TEXT,TEXT,TEXT,TEXT,DATE,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT)
  TO anon, authenticated;

-- ── update_user_password ──────────────────────────────────────────────────────
-- p_must_change = false → athlete set their own new password (clear the flag)
-- p_must_change = true  → admin reset to temp password (set flag again)

CREATE OR REPLACE FUNCTION update_user_password(
  p_email        TEXT,
  p_new_password TEXT,
  p_must_change  BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users
  SET password_hash        = extensions.crypt(p_new_password, extensions.gen_salt('bf', 10)),
      must_change_password = p_must_change
  WHERE email = p_email;
END;
$$;

GRANT EXECUTE ON FUNCTION update_user_password(TEXT, TEXT, BOOLEAN) TO anon, authenticated;
