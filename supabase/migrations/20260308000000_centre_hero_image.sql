-- Add hero image URL column to centres table
ALTER TABLE centres ADD COLUMN hero_image_url text;

-- Create public storage bucket for centre images
INSERT INTO storage.buckets (id, name, public)
VALUES ('centre-images', 'centre-images', true)
ON CONFLICT (id) DO NOTHING;
