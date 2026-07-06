-- Migration 027: Remove placeholder coach availability seeded in migration 016.
-- Those rows used fake IDs ('s1','s2','s3') with all-day windows, causing the
-- booking page to show slots all day regardless of real coach configuration.

DELETE FROM coach_availability WHERE coach_id IN ('s1', 's2', 's3');
