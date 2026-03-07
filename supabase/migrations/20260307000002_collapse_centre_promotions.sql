-- Collapse centre_promotions table into a single promotions_text column on centres.
-- The structured promotions table had 7 unused columns; a simple text field is sufficient.

-- 1. Add promotions_text column
ALTER TABLE centres ADD COLUMN IF NOT EXISTS promotions_text TEXT;

-- 2. Migrate existing promotions data (concatenate title: description)
UPDATE centres
SET promotions_text = sub.combined
FROM (
  SELECT
    centre_id,
    string_agg(
      CASE
        WHEN description IS NOT NULL AND description != '' THEN title || ': ' || description
        ELSE title
      END,
      E'\n'
      ORDER BY created_at
    ) AS combined
  FROM centre_promotions
  WHERE is_active = true
  GROUP BY centre_id
) sub
WHERE centres.id = sub.centre_id;

-- 3. Drop the table (cascades RLS policies and indexes)
DROP TABLE IF EXISTS centre_promotions CASCADE;
