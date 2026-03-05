-- Add FSBB stream/banding column to trial_slots
-- G1 = Foundational (old N(T)), G2 = Normal Academic (old N(A)), G3 = Express
-- Nullable — only relevant for secondary-level academic subjects

ALTER TABLE trial_slots ADD COLUMN stream text;

COMMENT ON COLUMN trial_slots.stream IS
  'FSBB subject banding: G1 (Foundational), G2 (Normal Academic), G3 (Express), IP, IB, or null';
