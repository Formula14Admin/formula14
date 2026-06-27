-- Formula14 · Fix authenticate_user — use extensions.crypt() explicitly
-- Run this in the Supabase SQL editor after 001–004.
--
-- Root cause: pgcrypto's crypt() lives in the "extensions" schema. The
-- SECURITY DEFINER function had SET search_path = public, which hid it.
-- Fix: call extensions.crypt() with the full schema-qualified name.

CREATE OR REPLACE FUNCTION authenticate_user(p_email TEXT, p_password TEXT)
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
BEGIN
  RETURN QUERY
  SELECT
    u.id, u.email, u.first_name, u.last_name, u.role
  FROM users u
  WHERE u.email = p_email
    AND u.password_hash = extensions.crypt(p_password, u.password_hash);
END;
$$;

GRANT EXECUTE ON FUNCTION authenticate_user(TEXT, TEXT) TO anon, authenticated;
