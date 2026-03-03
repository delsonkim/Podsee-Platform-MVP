-- Add contact email to centres (needed for auto-provisioning centre dashboard access)
ALTER TABLE centres ADD COLUMN contact_email text;

-- Centre users: links Google OAuth users to centres for dashboard access
-- auth_user_id is nullable — populated on first Google sign-in (matched by email)
CREATE TABLE centre_users (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  centre_id    uuid        NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
  role         text        NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'staff')),
  email        text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (auth_user_id, centre_id)
);

CREATE INDEX idx_centre_users_auth_user_id ON centre_users(auth_user_id);
CREATE INDEX idx_centre_users_centre_id ON centre_users(centre_id);
CREATE INDEX idx_centre_users_email ON centre_users(email);
