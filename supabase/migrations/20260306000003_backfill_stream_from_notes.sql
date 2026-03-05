-- Backfill stream from notes for slots parsed before stream field existed.
-- The old AI parser wrote its reasoning into notes when it encountered G-level
-- terms but had no stream field to put them in.

UPDATE trial_slots
SET stream = 'G3',
    notes = NULL
WHERE stream IS NULL
  AND notes ILIKE '%G3 likely indicates%';

UPDATE trial_slots
SET stream = 'G2',
    notes = NULL
WHERE stream IS NULL
  AND notes ILIKE '%G2 likely indicates%';

UPDATE trial_slots
SET stream = 'G1',
    notes = NULL
WHERE stream IS NULL
  AND notes ILIKE '%G1 likely indicates%';
