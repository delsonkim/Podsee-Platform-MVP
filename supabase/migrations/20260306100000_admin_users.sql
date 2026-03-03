-- Admin users: links Google OAuth users to admin access
CREATE TABLE admin_users (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  email        text        NOT NULL UNIQUE,
  role         text        NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_users_auth_user_id ON admin_users(auth_user_id);
CREATE INDEX idx_admin_users_email ON admin_users(email);

-- Seed first admin (auth_user_id backfilled on first Google sign-in)
INSERT INTO admin_users (email, role) VALUES ('delsonkim2003@gmail.com', 'superadmin');
