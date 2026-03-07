-- Section 8: Centre Pricing, Promotions, and Policies
-- Creates structured pricing per subject+level, flexible promotions, and dynamic policy categories.

-- =============================================================================
-- 1. centre_pricing — one row per subject+level+stream combo per centre
-- =============================================================================
CREATE TABLE centre_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id),
  level_id UUID REFERENCES levels(id),
  stream TEXT,

  -- Trial pricing
  trial_type TEXT NOT NULL DEFAULT 'discounted'
    CHECK (trial_type IN ('free', 'discounted', 'same_as_regular', 'multi_lesson')),
  trial_fee NUMERIC(8,2) NOT NULL DEFAULT 0,
  trial_lessons INT NOT NULL DEFAULT 1,

  -- Regular pricing (AI-extracted from admin free text)
  regular_fee NUMERIC(8,2) NOT NULL,
  lessons_per_period INT,
  billing_display TEXT,                         -- AI-generated: "$280/month (4 lessons)", "$85/lesson"
  billing_raw TEXT,                             -- Admin's original free text (kept for re-processing)

  -- Duration & schedule
  lesson_duration_minutes INT,
  trial_same_as_regular BOOLEAN DEFAULT true,
  regular_schedule_note TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(centre_id, subject_id, level_id, stream)
);

-- =============================================================================
-- 2. centre_promotions — flexible promo cards with optional subject/level tags
-- =============================================================================
CREATE TABLE centre_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'flat', 'free')),
  discount_value NUMERIC(8,2),
  applies_to TEXT CHECK (applies_to IN ('trial', 'registration', 'monthly', 'materials', 'all')),
  subject_id UUID REFERENCES subjects(id),
  level_id UUID REFERENCES levels(id),
  valid_from DATE,
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 3. centre_policies — ALL policies stored here (AI-categorized from free text)
--    Replaces the 5 fixed policy columns on centres table (old columns kept for backward compat)
-- =============================================================================
CREATE TABLE centre_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 4. Alter centres table — add new columns
-- =============================================================================
ALTER TABLE centres ADD COLUMN IF NOT EXISTS additional_fees TEXT;

-- =============================================================================
-- 5. RLS policies
-- =============================================================================

-- centre_pricing: public read (active centres only), centre owners can manage their own
ALTER TABLE centre_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_centre_pricing" ON centre_pricing
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM centres WHERE centres.id = centre_pricing.centre_id AND centres.is_active = true
    )
  );

CREATE POLICY "centre_owner_manage_pricing" ON centre_pricing
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM centre_users
      WHERE centre_users.centre_id = centre_pricing.centre_id
        AND centre_users.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM centre_users
      WHERE centre_users.centre_id = centre_pricing.centre_id
        AND centre_users.auth_user_id = auth.uid()
    )
  );

-- centre_promotions: public read (active only), centre owners can manage
ALTER TABLE centre_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_centre_promotions" ON centre_promotions
  FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM centres WHERE centres.id = centre_promotions.centre_id AND centres.is_active = true
    )
  );

CREATE POLICY "centre_owner_manage_promotions" ON centre_promotions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM centre_users
      WHERE centre_users.centre_id = centre_promotions.centre_id
        AND centre_users.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM centre_users
      WHERE centre_users.centre_id = centre_promotions.centre_id
        AND centre_users.auth_user_id = auth.uid()
    )
  );

-- centre_policies: public read, centre owners can manage
ALTER TABLE centre_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_centre_policies" ON centre_policies
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM centres WHERE centres.id = centre_policies.centre_id AND centres.is_active = true
    )
  );

CREATE POLICY "centre_owner_manage_policies" ON centre_policies
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM centre_users
      WHERE centre_users.centre_id = centre_policies.centre_id
        AND centre_users.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM centre_users
      WHERE centre_users.centre_id = centre_policies.centre_id
        AND centre_users.auth_user_id = auth.uid()
    )
  );

-- =============================================================================
-- 6. Service role bypass for admin operations
-- =============================================================================
CREATE POLICY "service_role_all_centre_pricing" ON centre_pricing
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_centre_promotions" ON centre_promotions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_centre_policies" ON centre_policies
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 7. Indexes for common queries
-- =============================================================================
CREATE INDEX idx_centre_pricing_centre_id ON centre_pricing(centre_id);
CREATE INDEX idx_centre_promotions_centre_id ON centre_promotions(centre_id);
CREATE INDEX idx_centre_promotions_active ON centre_promotions(centre_id) WHERE is_active = true;
CREATE INDEX idx_centre_policies_centre_id ON centre_policies(centre_id);
