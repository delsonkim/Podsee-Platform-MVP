-- Add contact/social links to centres
ALTER TABLE centres ADD COLUMN IF NOT EXISTS website_url text;
ALTER TABLE centres ADD COLUMN IF NOT EXISTS instagram_url text;
ALTER TABLE centres ADD COLUMN IF NOT EXISTS tiktok_url text;
ALTER TABLE centres ADD COLUMN IF NOT EXISTS whatsapp_number text;
ALTER TABLE centres ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE centres ADD COLUMN IF NOT EXISTS google_maps_url text;

-- Add linkedin and students_taught to teachers
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS students_taught integer;

-- RLS: centres columns are readable by anyone (public page), writable by centre owner + admin
-- (Already covered by existing centres RLS policies)

-- RLS: teachers columns follow same pattern
-- (Already covered by existing teachers RLS policies)
