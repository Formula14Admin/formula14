-- Stores admin-configured session type settings (enabled/disabled) so athletes
-- see the correct available session types regardless of their device.
CREATE TABLE IF NOT EXISTS booking_session_settings (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  settings JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO booking_session_settings (id, settings)
VALUES ('singleton', '{}')
ON CONFLICT (id) DO NOTHING;

GRANT SELECT, INSERT, UPDATE ON booking_session_settings TO anon, authenticated;
