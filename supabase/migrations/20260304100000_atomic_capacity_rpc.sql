-- Atomic decrement: returns 1 if decremented, 0 if slot was already full
CREATE OR REPLACE FUNCTION decrement_spots(slot_id uuid)
RETURNS int
LANGUAGE sql
AS $$
  UPDATE trial_slots
  SET spots_remaining = spots_remaining - 1
  WHERE id = slot_id AND spots_remaining > 0
  RETURNING 1;
$$;

-- Atomic increment: restores a spot (used when booking insert fails after decrement)
CREATE OR REPLACE FUNCTION increment_spots(slot_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE trial_slots
  SET spots_remaining = spots_remaining + 1
  WHERE id = slot_id AND spots_remaining < max_students;
$$;
