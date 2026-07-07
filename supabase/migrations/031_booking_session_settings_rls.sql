-- Add RLS policies so the anon client can read and write session toggle settings.
-- Without these, all queries against this table return 0 rows even with GRANT.
ALTER TABLE booking_session_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_settings"
  ON booking_session_settings FOR SELECT
  USING (true);

CREATE POLICY "public_write_settings"
  ON booking_session_settings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "public_update_settings"
  ON booking_session_settings FOR UPDATE
  USING (true)
  WITH CHECK (true);
