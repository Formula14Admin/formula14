-- Add meta column to booking_session_settings so admin-configured pricing
-- (priceDisplay, notes, etc.) syncs to Supabase and is visible to athletes
-- on all devices (previously stored only in admin localStorage).
ALTER TABLE booking_session_settings
  ADD COLUMN IF NOT EXISTS meta JSONB NOT NULL DEFAULT '{}';
