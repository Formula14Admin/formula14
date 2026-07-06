-- Migration 023: Fix "column reference id is ambiguous" in register_user.
-- The function returns TABLE(id UUID, ...) which puts an output variable named
-- "id" in scope. The DELETE in the orphaned-user branch used unqualified "id",
-- which PostgreSQL couldn't distinguish from the output variable. Fix: qualify
-- all column references with the table name.

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
  v_existing_id UUID;
  v_user_id     UUID;
  v_ath_first   TEXT;
  v_ath_last    TEXT;
BEGIN
  -- Check whether this email already has a users row
  SELECT u.id INTO v_existing_id FROM users u WHERE u.email = p_email;

  IF v_existing_id IS NOT NULL THEN
    -- If any athlete is still linked, the account is active — block registration
    IF EXISTS (SELECT 1 FROM athletes a WHERE a.user_id = v_existing_id) THEN
      RAISE EXCEPTION 'EMAIL_EXISTS';
    ELSE
      -- Orphaned row (athlete was deleted without cleaning up users) — remove it.
      -- Use table-qualified "users.id" to avoid ambiguity with the output column "id".
      DELETE FROM users WHERE users.id = v_existing_id;
    END IF;
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

  -- Resolve athlete name (parent vs self-registration)
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
