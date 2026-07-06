-- Migration 024: Fix "column reference id is ambiguous" in authenticate_user.
-- Same root cause as migration 023: RETURNS TABLE(id UUID, ...) puts an output
-- variable named "id" in scope. The UPDATE used unqualified "id" in its WHERE
-- clause, causing ambiguity. Qualify as users.id to fix.

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

  -- Use table-qualified users.id to avoid ambiguity with the output column "id"
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
