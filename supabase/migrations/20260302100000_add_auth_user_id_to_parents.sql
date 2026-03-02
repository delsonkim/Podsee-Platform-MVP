-- Link parents to Supabase auth.users for Google OAuth
ALTER TABLE parents
  ADD COLUMN auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX idx_parents_auth_user_id ON parents(auth_user_id);
