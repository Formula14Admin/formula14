-- Allow multiple time-slots per coach per day.
-- Drops the (coach_id, day_of_week) unique constraint and adds slot_index.

-- 1. Drop old unique constraint (may have been added in 016 or 999)
ALTER TABLE coach_availability DROP CONSTRAINT IF EXISTS coach_availability_coach_dow_unique;

-- 2. Add slot_index so we can distinguish morning vs evening slots
ALTER TABLE coach_availability ADD COLUMN IF NOT EXISTS slot_index INTEGER NOT NULL DEFAULT 0;

-- 3. New unique constraint on (coach_id, day_of_week, slot_index)
ALTER TABLE coach_availability DROP CONSTRAINT IF EXISTS coach_availability_coach_dow_slot_unique;
ALTER TABLE coach_availability ADD CONSTRAINT coach_availability_coach_dow_slot_unique UNIQUE (coach_id, day_of_week, slot_index);
