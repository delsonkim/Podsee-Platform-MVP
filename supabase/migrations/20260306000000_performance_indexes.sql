-- Performance indexes for common query patterns

-- bookings(created_at) — "this month" count + ORDER BY recent bookings
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

-- Composite: bookings(centre_id, status) — centre dashboard status counts
CREATE INDEX IF NOT EXISTS idx_bookings_centre_status ON bookings(centre_id, status);

-- Composite: trial_slots(centre_id, date) — centre detail + dashboard upcoming slots
CREATE INDEX IF NOT EXISTS idx_trial_slots_centre_date ON trial_slots(centre_id, date);

-- Partial: available slots only — speeds up filtering for open slots
CREATE INDEX IF NOT EXISTS idx_trial_slots_available
  ON trial_slots(centre_id, date)
  WHERE spots_remaining > 0;
