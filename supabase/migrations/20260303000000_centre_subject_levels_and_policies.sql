-- ============================================================
-- Add centre_subject_levels table for precise subject-level pairings
-- and other_policies column for open-ended policy text.
-- ============================================================

-- Stores the precise pairing: "Centre X offers Subject Y at Level Z"
-- centre_subjects and centre_levels are kept as denormalized roll-ups.
CREATE TABLE centre_subject_levels (
  centre_id  uuid NOT NULL REFERENCES centres(id)  ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  level_id   uuid NOT NULL REFERENCES levels(id)   ON DELETE CASCADE,
  PRIMARY KEY (centre_id, subject_id, level_id)
);

CREATE INDEX idx_csl_centre_id  ON centre_subject_levels(centre_id);
CREATE INDEX idx_csl_subject_id ON centre_subject_levels(subject_id);
CREATE INDEX idx_csl_level_id   ON centre_subject_levels(level_id);

-- Open-ended policies field
ALTER TABLE centres ADD COLUMN other_policies text;
