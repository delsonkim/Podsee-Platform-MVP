-- Clean up AI reasoning/explanations from the notes field.
-- The old AI parser wrote interpretive notes like "A Math = Additional Mathematics"
-- or "G3 likely indicates..." into the notes field. These are not useful for
-- parents or centres — they are AI thinking out loud. Real notes would be
-- teacher names, room numbers, or logistics from the original schedule.

-- Clear notes that are just subject abbreviation explanations
UPDATE trial_slots
SET notes = NULL
WHERE notes ILIKE '%A Math =%'
   OR notes ILIKE '%E Math =%'
   OR notes ILIKE '%A-Math =%'
   OR notes ILIKE '%E-Math =%'
   OR notes ILIKE '%Additional Mathematics%' AND notes ILIKE '%=%'
   OR notes ILIKE '%Elementary Mathematics%' AND notes ILIKE '%=%';

-- Clear notes that contain AI stream/banding explanations (catch any missed by earlier migration)
UPDATE trial_slots
SET notes = NULL
WHERE notes ILIKE '%likely indicates%'
   OR notes ILIKE '%decoded as%'
   OR notes ILIKE '%based on common curriculum%';

-- Clear notes that are just AI interpretation markers
UPDATE trial_slots
SET notes = NULL
WHERE notes ILIKE '%refers to%' AND (notes ILIKE '%math%' OR notes ILIKE '%subject%' OR notes ILIKE '%level%')
   OR notes ILIKE '%abbreviation for%'
   OR notes ILIKE '%short for%';
