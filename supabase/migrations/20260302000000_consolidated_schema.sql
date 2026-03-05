-- ============================================================
-- Podsee Trial Booking — Consolidated Schema
-- ============================================================
-- All migrations squashed into a single baseline.
-- Singapore-based platform connecting parents to tuition and
-- enrichment centres through trial class bookings.
-- ============================================================


-- ── Reset: drop everything if it exists (safe to re-run) ─────

DROP TABLE IF EXISTS parse_corrections  CASCADE;
DROP TABLE IF EXISTS reviews            CASCADE;
DROP TABLE IF EXISTS rewards            CASCADE;
DROP TABLE IF EXISTS commissions        CASCADE;
DROP TABLE IF EXISTS trial_outcomes     CASCADE;
DROP TABLE IF EXISTS bookings           CASCADE;
DROP TABLE IF EXISTS trial_slots        CASCADE;
DROP TABLE IF EXISTS teacher_levels     CASCADE;
DROP TABLE IF EXISTS teacher_subjects   CASCADE;
DROP TABLE IF EXISTS teachers           CASCADE;
DROP TABLE IF EXISTS centre_subject_levels CASCADE;
DROP TABLE IF EXISTS centre_levels      CASCADE;
DROP TABLE IF EXISTS centre_subjects    CASCADE;
DROP TABLE IF EXISTS centre_users       CASCADE;
DROP TABLE IF EXISTS admin_users        CASCADE;
DROP TABLE IF EXISTS centres            CASCADE;
DROP TABLE IF EXISTS children           CASCADE;
DROP TABLE IF EXISTS parents            CASCADE;
DROP TABLE IF EXISTS levels             CASCADE;
DROP TABLE IF EXISTS subjects           CASCADE;

DROP TYPE IF EXISTS booking_status          CASCADE;
DROP TYPE IF EXISTS parent_reported_enrolment CASCADE;
DROP TYPE IF EXISTS commission_status       CASCADE;
DROP TYPE IF EXISTS reward_status           CASCADE;
DROP TYPE IF EXISTS level_group             CASCADE;

DROP FUNCTION IF EXISTS set_updated_at      CASCADE;
DROP FUNCTION IF EXISTS decrement_spots     CASCADE;
DROP FUNCTION IF EXISTS increment_spots     CASCADE;


-- ── Enums ─────────────────────────────────────────────────────

CREATE TYPE booking_status AS ENUM (
  'pending',
  'confirmed',
  'completed',
  'converted',
  'no_show',
  'cancelled'
);

CREATE TYPE parent_reported_enrolment AS ENUM (
  'enrolled',
  'not_enrolled'
);

CREATE TYPE commission_status AS ENUM (
  'pending',
  'invoiced',
  'paid',
  'overdue',
  'waived'
);

CREATE TYPE reward_status AS ENUM (
  'pending',
  'approved',
  'paid',
  'rejected'
);

CREATE TYPE level_group AS ENUM (
  'primary',
  'secondary',
  'jc',
  'other'
);


-- ── updated_at trigger ────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ── Atomic capacity RPC functions ─────────────────────────────

CREATE OR REPLACE FUNCTION decrement_spots(slot_id uuid)
RETURNS int
LANGUAGE sql
AS $$
  UPDATE trial_slots
  SET spots_remaining = spots_remaining - 1
  WHERE id = slot_id AND spots_remaining > 0
  RETURNING 1;
$$;

CREATE OR REPLACE FUNCTION increment_spots(slot_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE trial_slots
  SET spots_remaining = spots_remaining + 1
  WHERE id = slot_id AND spots_remaining < max_students;
$$;


-- ── Lookup: subjects ──────────────────────────────────────────

CREATE TABLE subjects (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE,
  sort_order  int         NOT NULL DEFAULT 0,
  is_custom   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);


-- ── Lookup: levels ────────────────────────────────────────────

CREATE TABLE levels (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text        NOT NULL UNIQUE,
  label        text        NOT NULL,
  level_group  level_group NOT NULL,
  sort_order   int         NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);


-- ── parents ───────────────────────────────────────────────────

CREATE TABLE parents (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid        UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  email        text        NOT NULL UNIQUE,
  name         text        NOT NULL,
  phone        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_parents_updated_at
  BEFORE UPDATE ON parents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_parents_auth_user_id ON parents(auth_user_id);


-- ── children ──────────────────────────────────────────────────

CREATE TABLE children (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   uuid        NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  level_id    uuid        NOT NULL REFERENCES levels(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_children_updated_at
  BEFORE UPDATE ON children
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_children_parent_id ON children(parent_id);


-- ── centres ───────────────────────────────────────────────────

CREATE TABLE centres (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                        text        NOT NULL,
  slug                        text        NOT NULL UNIQUE,
  area                        text,
  address                     text,
  nearest_mrt                 text,
  parking_info                text,
  description                 text,
  teaching_style              text,
  teacher_bio                 text,
  teacher_qualifications      text,
  class_size                  int,
  replacement_class_policy    text,
  makeup_class_policy         text,
  commitment_terms            text,
  notice_period_terms         text,
  payment_terms               text,
  other_policies              text,
  years_operating             int,
  track_record                text,
  contact_email               text,
  image_urls                  text[]      NOT NULL DEFAULT '{}',
  trial_type                  text        NOT NULL DEFAULT 'free' CHECK (trial_type IN ('free', 'paid')),
  paynow_qr_image_url        text,
  trial_commission_rate       numeric(8,2) DEFAULT 0,
  conversion_commission_rate  numeric(8,2) DEFAULT 0,
  draft_data                  jsonb,
  has_pending_changes         boolean     NOT NULL DEFAULT false,
  is_active                   boolean     NOT NULL DEFAULT false,
  is_paused                   boolean     NOT NULL DEFAULT false,
  is_trusted                  boolean     NOT NULL DEFAULT false,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_centres_updated_at
  BEFORE UPDATE ON centres
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_centres_is_active ON centres(is_active);
CREATE INDEX idx_centres_is_paused ON centres(is_paused);
CREATE INDEX idx_centres_pending ON centres(has_pending_changes) WHERE has_pending_changes = true;


-- ── centre_subjects (junction) ────────────────────────────────

CREATE TABLE centre_subjects (
  centre_id    uuid NOT NULL REFERENCES centres(id)  ON DELETE CASCADE,
  subject_id   uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  display_name text,
  description  text,
  PRIMARY KEY (centre_id, subject_id)
);

CREATE INDEX idx_centre_subjects_subject_id ON centre_subjects(subject_id);


-- ── centre_levels (junction) ──────────────────────────────────

CREATE TABLE centre_levels (
  centre_id  uuid NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
  level_id   uuid NOT NULL REFERENCES levels(id)  ON DELETE CASCADE,
  PRIMARY KEY (centre_id, level_id)
);

CREATE INDEX idx_centre_levels_level_id ON centre_levels(level_id);


-- ── centre_subject_levels (precise pairing) ───────────────────

CREATE TABLE centre_subject_levels (
  centre_id  uuid NOT NULL REFERENCES centres(id)  ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  level_id   uuid NOT NULL REFERENCES levels(id)   ON DELETE CASCADE,
  PRIMARY KEY (centre_id, subject_id, level_id)
);

CREATE INDEX idx_csl_centre_id  ON centre_subject_levels(centre_id);
CREATE INDEX idx_csl_subject_id ON centre_subject_levels(subject_id);
CREATE INDEX idx_csl_level_id   ON centre_subject_levels(level_id);


-- ── centre_users (dashboard auth) ─────────────────────────────

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


-- ── admin_users ───────────────────────────────────────────────

CREATE TABLE admin_users (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  email        text        NOT NULL UNIQUE,
  role         text        NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_users_auth_user_id ON admin_users(auth_user_id);
CREATE INDEX idx_admin_users_email ON admin_users(email);


-- ── teachers ──────────────────────────────────────────────────

CREATE TABLE teachers (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id        uuid        NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  role             text,
  is_founder       boolean     NOT NULL DEFAULT false,
  qualifications   text,
  bio              text,
  years_experience int,
  sort_order       int         NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_teachers_updated_at
  BEFORE UPDATE ON teachers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_teachers_centre_id ON teachers(centre_id);


-- ── teacher_subjects (junction) ───────────────────────────────

CREATE TABLE teacher_subjects (
  teacher_id  uuid NOT NULL REFERENCES teachers(id)  ON DELETE CASCADE,
  subject_id  uuid NOT NULL REFERENCES subjects(id)  ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, subject_id)
);

CREATE INDEX idx_teacher_subjects_subject_id ON teacher_subjects(subject_id);


-- ── teacher_levels (junction) ─────────────────────────────────

CREATE TABLE teacher_levels (
  teacher_id  uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  level_id    uuid NOT NULL REFERENCES levels(id)   ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, level_id)
);

CREATE INDEX idx_teacher_levels_level_id ON teacher_levels(level_id);


-- ── trial_slots ───────────────────────────────────────────────

CREATE TABLE trial_slots (
  id               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id        uuid         NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
  subject_id       uuid         NOT NULL REFERENCES subjects(id),
  level_id         uuid         REFERENCES levels(id),
  age_min          int,
  age_max          int,
  custom_level     text,
  date             date         NOT NULL,
  start_time       time         NOT NULL,
  end_time         time         NOT NULL,
  trial_fee        numeric(8,2) NOT NULL,
  max_students     int          NOT NULL DEFAULT 1,
  spots_remaining  int          NOT NULL DEFAULT 1,
  is_draft         boolean      NOT NULL DEFAULT false,
  notes            text,
  created_at       timestamptz  NOT NULL DEFAULT now(),
  updated_at       timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT chk_times          CHECK (end_time > start_time),
  CONSTRAINT chk_fee_positive   CHECK (trial_fee >= 0),
  CONSTRAINT chk_spots_valid    CHECK (spots_remaining >= 0 AND spots_remaining <= max_students),
  CONSTRAINT chk_age_range      CHECK (age_max IS NULL OR age_min IS NULL OR age_max >= age_min),
  CONSTRAINT chk_level_present  CHECK (
    level_id IS NOT NULL OR
    (age_min IS NOT NULL AND age_max IS NOT NULL) OR
    custom_level IS NOT NULL
  )
);

CREATE TRIGGER trg_trial_slots_updated_at
  BEFORE UPDATE ON trial_slots
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_trial_slots_centre_id   ON trial_slots(centre_id);
CREATE INDEX idx_trial_slots_date        ON trial_slots(date);
CREATE INDEX idx_trial_slots_subject_id  ON trial_slots(subject_id);
CREATE INDEX idx_trial_slots_level_id    ON trial_slots(level_id);
CREATE INDEX idx_trial_slots_centre_date ON trial_slots(centre_id, date);
CREATE INDEX idx_trial_slots_available   ON trial_slots(centre_id, date) WHERE spots_remaining > 0;
CREATE INDEX idx_trial_slots_draft       ON trial_slots(is_draft) WHERE is_draft = true;


-- ── bookings ──────────────────────────────────────────────────

CREATE TABLE bookings (
  id                        uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref               text           NOT NULL UNIQUE,
  trial_slot_id             uuid           NOT NULL REFERENCES trial_slots(id),
  centre_id                 uuid           NOT NULL REFERENCES centres(id),
  child_id                  uuid           REFERENCES children(id),
  parent_id                 uuid           REFERENCES parents(id),
  parent_name_at_booking    text           NOT NULL,
  parent_email_at_booking   text           NOT NULL,
  parent_phone_at_booking   text,
  child_name_at_booking     text           NOT NULL,
  child_level_at_booking    text           NOT NULL,
  trial_fee_at_booking      numeric(8,2)   NOT NULL,
  status                    booking_status NOT NULL DEFAULT 'pending',
  acknowledged_at           timestamptz,
  referral_source           text,
  cancelled_by              text           CHECK (cancelled_by IN ('parent', 'centre', 'reschedule')),
  cancelled_at              timestamptz,
  cancel_reason             text,
  rescheduled_from          uuid           REFERENCES bookings(id),
  payment_screenshot_url    text,
  is_flagged                boolean        NOT NULL DEFAULT false,
  flag_reason               text,
  admin_notes               text,
  created_at                timestamptz    NOT NULL DEFAULT now(),
  updated_at                timestamptz    NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_bookings_trial_slot_id    ON bookings(trial_slot_id);
CREATE INDEX idx_bookings_centre_id        ON bookings(centre_id);
CREATE INDEX idx_bookings_child_id         ON bookings(child_id);
CREATE INDEX idx_bookings_parent_id        ON bookings(parent_id);
CREATE INDEX idx_bookings_status           ON bookings(status);
CREATE INDEX idx_bookings_is_flagged       ON bookings(is_flagged) WHERE is_flagged = true;
CREATE INDEX idx_bookings_created_at       ON bookings(created_at);
CREATE INDEX idx_bookings_centre_status    ON bookings(centre_id, status);
CREATE INDEX idx_bookings_cancelled_by     ON bookings(cancelled_by) WHERE cancelled_by IS NOT NULL;
CREATE INDEX idx_bookings_rescheduled_from ON bookings(rescheduled_from) WHERE rescheduled_from IS NOT NULL;


-- ── trial_outcomes ────────────────────────────────────────────

CREATE TABLE trial_outcomes (
  id                       uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id               uuid                      NOT NULL UNIQUE REFERENCES bookings(id),
  parent_reported_status   parent_reported_enrolment,
  reported_at              timestamptz,
  centre_reported_status   parent_reported_enrolment,
  centre_reported_at       timestamptz,
  admin_verified           boolean                   NOT NULL DEFAULT false,
  admin_verified_at        timestamptz,
  admin_notes              text,
  created_at               timestamptz               NOT NULL DEFAULT now(),
  updated_at               timestamptz               NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_trial_outcomes_updated_at
  BEFORE UPDATE ON trial_outcomes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_trial_outcomes_booking_id ON trial_outcomes(booking_id);


-- ── commissions ───────────────────────────────────────────────

CREATE TABLE commissions (
  id                 uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_outcome_id   uuid              NOT NULL REFERENCES trial_outcomes(id),
  centre_id          uuid              NOT NULL REFERENCES centres(id),
  commission_type    text              NOT NULL DEFAULT 'conversion',
  commission_amount  numeric(8,2)      NOT NULL,
  status             commission_status NOT NULL DEFAULT 'pending',
  invoice_number     text              UNIQUE,
  invoiced_at        timestamptz,
  paid_at            timestamptz,
  notes              text,
  created_at         timestamptz       NOT NULL DEFAULT now(),
  updated_at         timestamptz       NOT NULL DEFAULT now(),

  CONSTRAINT commissions_outcome_type_key UNIQUE (trial_outcome_id, commission_type),
  CONSTRAINT chk_commission_positive CHECK (commission_amount > 0),
  CONSTRAINT chk_commission_type CHECK (commission_type IN ('trial', 'conversion'))
);

CREATE TRIGGER trg_commissions_updated_at
  BEFORE UPDATE ON commissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_commissions_trial_outcome_id ON commissions(trial_outcome_id);
CREATE INDEX idx_commissions_centre_id        ON commissions(centre_id);
CREATE INDEX idx_commissions_status           ON commissions(status);


-- ── rewards ───────────────────────────────────────────────────

CREATE TABLE rewards (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_outcome_id  uuid          NOT NULL UNIQUE REFERENCES trial_outcomes(id),
  parent_id         uuid          NOT NULL REFERENCES parents(id),
  reward_amount     numeric(8,2)  NOT NULL,
  status            reward_status NOT NULL DEFAULT 'pending',
  approved_at       timestamptz,
  paid_at           timestamptz,
  payment_method    text,
  payment_reference text,
  notes             text,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT chk_reward_positive CHECK (reward_amount > 0)
);

CREATE TRIGGER trg_rewards_updated_at
  BEFORE UPDATE ON rewards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_rewards_parent_id ON rewards(parent_id);
CREATE INDEX idx_rewards_status    ON rewards(status);


-- ── reviews ───────────────────────────────────────────────────

CREATE TABLE reviews (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid        NOT NULL UNIQUE REFERENCES bookings(id),
  parent_id   uuid        NOT NULL REFERENCES parents(id),
  centre_id   uuid        NOT NULL REFERENCES centres(id),
  rating      int         NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  status      text        NOT NULL DEFAULT 'pending_approval'
              CHECK (status IN ('pending_approval', 'approved', 'rejected')),
  approved_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_reviews_centre_id ON reviews(centre_id);
CREATE INDEX idx_reviews_status    ON reviews(status);
CREATE INDEX idx_reviews_parent_id ON reviews(parent_id);


-- ── parse_corrections (AI parser self-learning) ─────────────

CREATE TABLE parse_corrections (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id       uuid        REFERENCES centres(id) ON DELETE CASCADE,
  field_type      text        NOT NULL,
  ai_raw_text     text        NOT NULL,
  ai_value        text,
  ai_match_id     uuid,
  ai_confidence   text,
  user_value      text        NOT NULL,
  user_match_id   uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_parse_corrections_centre ON parse_corrections(centre_id);
CREATE INDEX idx_parse_corrections_field ON parse_corrections(field_type);


-- ── Storage bucket ────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('centre-images', 'centre-images', true)
ON CONFLICT (id) DO NOTHING;


-- ── Seed: subjects ────────────────────────────────────────────

INSERT INTO subjects (name, sort_order) VALUES
  ('Mathematics',            1),
  ('English Language',       2),
  ('Science',                3),
  ('Chinese Language',       4),
  ('Malay Language',         5),
  ('Tamil Language',         6),
  ('Higher Chinese',         7),
  ('History',                8),
  ('Geography',              9),
  ('Literature',            10),
  ('Physics',               11),
  ('Chemistry',             12),
  ('Biology',               13),
  ('Combined Science',      14),
  ('Social Studies',        15),
  ('General Paper',         16),
  ('Elementary Mathematics', 17),
  ('Additional Mathematics', 18),
  ('Combined Science (Physics/Chemistry)', 19),
  ('Combined Science (Chemistry/Biology)', 20),
  ('Principles of Accounts', 21),
  ('Economics',              22),
  ('Combined Humanities (SS/History)',     23),
  ('Combined Humanities (SS/Geography)',   24),
  ('Combined Humanities (SS/Literature)',  25),
  ('Piano',                101),
  ('Violin',               102),
  ('Guitar',               103),
  ('Drums',                104),
  ('Vocal / Singing',      105),
  ('Music (General)',      106),
  ('Art & Craft',          201),
  ('Drawing / Sketching',  202),
  ('Chinese Calligraphy',  203),
  ('Ballet',               301),
  ('Dance',                302),
  ('Drama',                303),
  ('Taekwondo',            401),
  ('Wushu',                402),
  ('Lion Dance',           403),
  ('Swimming',             404),
  ('Chess',                501),
  ('Coding / Programming', 502),
  ('Creative Writing',     503),
  ('Public Speaking',      504),
  ('Abacus / Mental Maths',505),
  -- MOE subjects (secondary academic)
  ('Nutrition and Food Science',  26),
  ('Design & Technology',         27),
  ('Business Studies',            28),
  ('Computing',                   29),
  ('Exercise and Sports Science', 30),
  ('Electronics',                 31),
  -- Mother Tongue variants
  ('Higher Malay',                32),
  ('Higher Tamil',                33),
  ('Literature in Chinese',       34),
  ('Literature in Malay',         35),
  ('Literature in Tamil',         36),
  -- Combined Humanities (Mother Tongue Literature electives)
  ('Combined Humanities (SS/Lit in Chinese)', 37),
  ('Combined Humanities (SS/Lit in Malay)',   38),
  ('Combined Humanities (SS/Lit in Tamil)',   39),
  -- JC / A-Level subjects
  ('Further Mathematics',           40),
  ('Management of Business',        41),
  ('English Language and Linguistics', 42),
  ('China Studies in English',      43),
  ('China Studies in Chinese',      44),
  ('Music',                         45),
  -- Combined Science variant
  ('Combined Science (Physics/Biology)', 46);


-- ── Seed: levels ──────────────────────────────────────────────

INSERT INTO levels (code, label, level_group, sort_order) VALUES
  ('P1',       'Primary 1',              'primary',    1),
  ('P2',       'Primary 2',              'primary',    2),
  ('P3',       'Primary 3',              'primary',    3),
  ('P4',       'Primary 4',              'primary',    4),
  ('P5',       'Primary 5',              'primary',    5),
  ('P6',       'Primary 6',              'primary',    6),
  ('SEC1',     'Secondary 1',            'secondary',  7),
  ('SEC2',     'Secondary 2',            'secondary',  8),
  ('SEC3',     'Secondary 3',            'secondary',  9),
  ('SEC4',     'Secondary 4',            'secondary', 10),
  ('SEC5',     'Secondary 5',            'secondary', 11),
  ('JC1',      'JC1',                    'jc',        12),
  ('JC2',      'JC2',                    'jc',        13),
  ('IP1',      'IP Year 1',              'secondary', 14),
  ('IP2',      'IP Year 2',              'secondary', 15),
  ('IP3',      'IP Year 3',              'secondary', 16),
  ('IP4',      'IP Year 4',              'secondary', 17),
  ('NA1',      'Normal Academic 1',      'secondary', 18),
  ('NA2',      'Normal Academic 2',      'secondary', 19),
  ('NA3',      'Normal Academic 3',      'secondary', 20),
  ('NA4',      'Normal Academic 4',      'secondary', 21),
  ('AGE3-5',   'Ages 3–5',              'other',    100),
  ('AGE6-8',   'Ages 6–8',              'other',    101),
  ('AGE9-12',  'Ages 9–12',             'other',    102),
  ('AGE13UP',  'Ages 13 & above',       'other',    103),
  ('BEG',      'Beginner',              'other',    200),
  ('INT',      'Intermediate',          'other',    201),
  ('ADV',      'Advanced',              'other',    202),
  ('MUS-PREP', 'Music Prep / Pre-Grade','other',    300),
  ('MUS-G1',   'Music Grade 1',         'other',    301),
  ('MUS-G2',   'Music Grade 2',         'other',    302),
  ('MUS-G3',   'Music Grade 3',         'other',    303),
  ('MUS-G4',   'Music Grade 4',         'other',    304),
  ('MUS-G5',   'Music Grade 5',         'other',    305),
  ('MUS-G6',   'Music Grade 6',         'other',    306),
  ('MUS-G7',   'Music Grade 7',         'other',    307),
  ('MUS-G8',   'Music Grade 8',         'other',    308);


-- ── Seed: admin user ──────────────────────────────────────────

INSERT INTO admin_users (email, role) VALUES ('delsonkim2003@gmail.com', 'superadmin');
