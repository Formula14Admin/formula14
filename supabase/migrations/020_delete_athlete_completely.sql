-- Formula14 · Atomic athlete deletion
-- Migration 020 — removes athlete + linked user in one call so the email
-- is freed up and can be re-used for a new registration.

CREATE OR REPLACE FUNCTION delete_athlete_completely(p_athlete_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Capture the linked user before we delete the athlete row
  SELECT user_id INTO v_user_id
  FROM   athletes
  WHERE  id = p_athlete_id;

  -- Delete the athlete — cascades to all profile/booking/goals/habit tables
  DELETE FROM athletes WHERE id = p_athlete_id;

  -- Delete the user record, freeing the email address for re-registration
  IF v_user_id IS NOT NULL THEN
    DELETE FROM users WHERE id = v_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_athlete_completely(UUID) TO anon, authenticated;
