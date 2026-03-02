-- ============================================================
-- Podsee Trial Booking — Initial Schema
-- ============================================================
-- Singapore-based platform connecting parents to tuition and
-- enrichment centres through trial class bookings.
-- Commission-only model: centres pay only on conversion.
-- Pre-launch: bookings coordinated manually via WhatsApp.
-- ============================================================


-- ── Reset: drop everything if it exists (safe to re-run) ─────
-- Tables dropped with CASCADE so foreign key order doesn't matter.

DROP TABLE IF EXISTS rewards            CASCADE;
DROP TABLE IF EXISTS commissions        CASCADE;
DROP TABLE IF EXISTS trial_outcomes     CASCADE;
DROP TABLE IF EXISTS bookings           CASCADE;
DROP TABLE IF EXISTS trial_slots        CASCADE;
DROP TABLE IF EXISTS teacher_levels     CASCADE;
DROP TABLE IF EXISTS teacher_subjects   CASCADE;
DROP TABLE IF EXISTS teachers           CASCADE;
DROP TABLE IF EXISTS centre_levels      CASCADE;
DROP TABLE IF EXISTS centre_subjects    CASCADE;
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


-- ── Enums ─────────────────────────────────────────────────────

CREATE TYPE booking_status AS ENUM (
  'pending',     -- parent submitted, awaiting centre acknowledgement
  'confirmed',   -- centre acknowledged via WhatsApp
  'completed',   -- trial class has taken place
  'converted',   -- child enrolled after trial
  'no_show',     -- parent did not attend
  'cancelled'    -- either side pulled out
);

CREATE TYPE parent_reported_enrolment AS ENUM (
  'enrolled',
  'not_enrolled'
);

CREATE TYPE commission_status AS ENUM (
  'pending',   -- conversion confirmed, not yet invoiced
  'invoiced',  -- invoice sent to centre
  'paid',      -- payment received
  'overdue',   -- past payment terms, unpaid
  'waived'     -- manually written off
);

CREATE TYPE reward_status AS ENUM (
  'pending',   -- outcome reported, reward not yet approved
  'approved',  -- admin approved payout
  'paid',      -- payment sent to parent
  'rejected'   -- not eligible (e.g. duplicate, unverified)
);

CREATE TYPE level_group AS ENUM (
  'primary',
  'secondary',
  'jc',
  'other'      -- covers enrichment age bands, skill bands, music grades
);


-- ── updated_at trigger ────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ── Lookup: subjects ──────────────────────────────────────────

CREATE TABLE subjects (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE,
  sort_order  int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);


-- ── Lookup: levels ────────────────────────────────────────────

CREATE TABLE levels (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text        NOT NULL UNIQUE,  -- e.g. 'P1', 'SEC1', 'BEG', 'MUS-G3'
  label        text        NOT NULL,         -- e.g. 'Primary 1', 'Beginner', 'Music Grade 3'
  level_group  level_group NOT NULL,
  sort_order   int         NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);


-- ── parents ───────────────────────────────────────────────────

CREATE TABLE parents (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text        NOT NULL UNIQUE,  -- Google OAuth identifier
  name        text        NOT NULL,
  phone       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_parents_updated_at
  BEFORE UPDATE ON parents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


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
-- teacher_bio and teacher_qualifications removed.
-- Teacher information now lives in the teachers table below.

CREATE TABLE centres (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      text        NOT NULL,
  slug                      text        NOT NULL UNIQUE,
  area                      text,
  address                   text,
  nearest_mrt               text,       -- filled by Podsee, not collected from centre
  parking_info              text,       -- filled by Podsee, not collected from centre
  description               text,       -- compiled from structured onboarding answers
  teaching_style            text,
  class_size                int,
  replacement_class_policy  text,
  makeup_class_policy       text,
  commitment_terms          text,
  notice_period_terms       text,
  payment_terms             text,
  years_operating           int,
  track_record              text,
  is_active                 boolean     NOT NULL DEFAULT true,
  is_paused                 boolean     NOT NULL DEFAULT false,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_centres_updated_at
  BEFORE UPDATE ON centres
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_centres_is_active ON centres(is_active);
CREATE INDEX idx_centres_is_paused ON centres(is_paused);


-- ── centre_subjects (junction) ────────────────────────────────
-- display_name: centre's own programme name (e.g. "Creative Writing & Comprehension")
--               if null, falls back to subjects.name on the frontend
-- description:  centre's explanation of what the programme covers and
--               why it may be named differently from our taxonomy

CREATE TABLE centre_subjects (
  centre_id    uuid NOT NULL REFERENCES centres(id)  ON DELETE CASCADE,
  subject_id   uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  display_name text,        -- optional; centre's own programme name
  description  text,        -- optional; explains the programme + any naming differences
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


-- ── teachers ──────────────────────────────────────────────────
-- One row per teacher at a centre.
-- Founders use is_founder = true and sort_order = 0 so they appear first.
-- teacher_subjects and teacher_levels link each teacher to what they personally teach.

CREATE TABLE teachers (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id        uuid        NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  role             text,       -- e.g. 'Founder', 'Head Tutor', 'English Specialist'
  is_founder       boolean     NOT NULL DEFAULT false,
  qualifications   text,       -- e.g. 'NUS B.Eng, NIE-trained'
  bio              text,       -- 2–4 sentences shown on centre listing page
  years_experience int,
  sort_order       int         NOT NULL DEFAULT 0,  -- lower = appears first; founder = 0
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_teachers_updated_at
  BEFORE UPDATE ON teachers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_teachers_centre_id ON teachers(centre_id);


-- ── teacher_subjects (junction) ───────────────────────────────
-- Links a specific teacher to the subjects they personally handle.

CREATE TABLE teacher_subjects (
  teacher_id  uuid NOT NULL REFERENCES teachers(id)  ON DELETE CASCADE,
  subject_id  uuid NOT NULL REFERENCES subjects(id)  ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, subject_id)
);

CREATE INDEX idx_teacher_subjects_subject_id ON teacher_subjects(subject_id);


-- ── teacher_levels (junction) ─────────────────────────────────
-- Links a specific teacher to the levels they personally handle.

CREATE TABLE teacher_levels (
  teacher_id  uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  level_id    uuid NOT NULL REFERENCES levels(id)   ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, level_id)
);

CREATE INDEX idx_teacher_levels_level_id ON teacher_levels(level_id);


-- ── trial_slots ───────────────────────────────────────────────
-- level_id is nullable to support enrichment slots that use age bands
-- or skill levels instead of school year groups.
-- At least one of level_id, age range, or custom_level must be present.

CREATE TABLE trial_slots (
  id               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id        uuid         NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
  subject_id       uuid         NOT NULL REFERENCES subjects(id),

  -- Level: use level_id for academic subjects (P1–JC2, skill bands, music grades).
  -- Use age_min/age_max for age-based enrichment classes.
  -- Use custom_level for free-text descriptions (e.g. 'White Belt', 'Grade 3–4').
  -- At least one must be filled.
  level_id         uuid         REFERENCES levels(id),
  age_min          int,         -- minimum age in years (e.g. 6)
  age_max          int,         -- maximum age in years (e.g. 12)
  custom_level     text,        -- free text shown on listing (e.g. 'White Belt', 'Foundation')

  date             date         NOT NULL,
  start_time       time         NOT NULL,
  end_time         time         NOT NULL,
  trial_fee        numeric(8,2) NOT NULL,
  max_students     int          NOT NULL DEFAULT 1,
  spots_remaining  int          NOT NULL DEFAULT 1,
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

CREATE INDEX idx_trial_slots_centre_id  ON trial_slots(centre_id);
CREATE INDEX idx_trial_slots_date       ON trial_slots(date);
CREATE INDEX idx_trial_slots_subject_id ON trial_slots(subject_id);
CREATE INDEX idx_trial_slots_level_id   ON trial_slots(level_id);


-- ── bookings ──────────────────────────────────────────────────

CREATE TABLE bookings (
  id                       uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref              text           NOT NULL UNIQUE,  -- e.g. PSE-260302-0001
  trial_slot_id            uuid           NOT NULL REFERENCES trial_slots(id),
  centre_id                uuid           NOT NULL REFERENCES centres(id),   -- denormalised for query convenience
  child_id                 uuid           REFERENCES children(id),   -- nullable; parent may not have an account yet in manual phase
  parent_id                uuid           REFERENCES parents(id),    -- nullable; parent may not have an account yet in manual phase

  -- Snapshots captured at booking time so the record is self-contained
  -- even if parent/child/slot data changes later
  parent_name_at_booking   text           NOT NULL,
  parent_email_at_booking  text           NOT NULL,
  parent_phone_at_booking  text,
  child_name_at_booking    text           NOT NULL,
  child_level_at_booking   text           NOT NULL,  -- human-readable label snapshot
  trial_fee_at_booking     numeric(8,2)   NOT NULL,  -- locked price

  -- Status and admin tracking
  status                   booking_status NOT NULL DEFAULT 'pending',
  acknowledged_at          timestamptz,              -- set when centre confirms via WhatsApp
  referral_source          text,
  is_flagged               boolean        NOT NULL DEFAULT false,
  flag_reason              text,
  admin_notes              text,

  created_at               timestamptz    NOT NULL DEFAULT now(),
  updated_at               timestamptz    NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_bookings_trial_slot_id ON bookings(trial_slot_id);
CREATE INDEX idx_bookings_centre_id     ON bookings(centre_id);
CREATE INDEX idx_bookings_child_id      ON bookings(child_id);
CREATE INDEX idx_bookings_parent_id     ON bookings(parent_id);
CREATE INDEX idx_bookings_status        ON bookings(status);
CREATE INDEX idx_bookings_is_flagged    ON bookings(is_flagged) WHERE is_flagged = true;


-- ── trial_outcomes ────────────────────────────────────────────
-- Created when a booking is marked completed.
-- Parent self-reports enrolment; cash reward is the incentive.

CREATE TABLE trial_outcomes (
  id                     uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id             uuid                      NOT NULL UNIQUE REFERENCES bookings(id),
  parent_reported_status parent_reported_enrolment,
  reported_at            timestamptz,
  admin_verified         boolean                   NOT NULL DEFAULT false,
  admin_verified_at      timestamptz,
  admin_notes            text,
  created_at             timestamptz               NOT NULL DEFAULT now(),
  updated_at             timestamptz               NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_trial_outcomes_updated_at
  BEFORE UPDATE ON trial_outcomes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_trial_outcomes_booking_id ON trial_outcomes(booking_id);


-- ── commissions ───────────────────────────────────────────────
-- Tracks what each centre owes Podsee on conversion.
-- Links to trial_outcomes because commission only triggers once
-- a trial is confirmed as converted (not merely completed).
-- One row per verified conversion.

CREATE TABLE commissions (
  id                 uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_outcome_id   uuid              NOT NULL UNIQUE REFERENCES trial_outcomes(id),
  centre_id          uuid              NOT NULL REFERENCES centres(id),  -- denormalised for query convenience
  commission_amount  numeric(8,2)      NOT NULL,
  status             commission_status NOT NULL DEFAULT 'pending',
  invoice_number     text              UNIQUE,
  invoiced_at        timestamptz,
  paid_at            timestamptz,
  notes              text,
  created_at         timestamptz       NOT NULL DEFAULT now(),
  updated_at         timestamptz       NOT NULL DEFAULT now(),

  CONSTRAINT chk_commission_positive CHECK (commission_amount > 0)
);

CREATE TRIGGER trg_commissions_updated_at
  BEFORE UPDATE ON commissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_commissions_trial_outcome_id ON commissions(trial_outcome_id);
CREATE INDEX idx_commissions_centre_id        ON commissions(centre_id);
CREATE INDEX idx_commissions_status           ON commissions(status);


-- ── rewards ───────────────────────────────────────────────────
-- Tracks cash rewards paid to parents who self-report enrolment.
-- One row per eligible trial_outcome.

CREATE TABLE rewards (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_outcome_id  uuid          NOT NULL UNIQUE REFERENCES trial_outcomes(id),
  parent_id         uuid          NOT NULL REFERENCES parents(id),
  reward_amount     numeric(8,2)  NOT NULL,
  status            reward_status NOT NULL DEFAULT 'pending',
  approved_at       timestamptz,
  paid_at           timestamptz,
  payment_method    text,         -- e.g. 'PayNow', 'Bank Transfer'
  payment_reference text,         -- PayNow UEN, transaction ID, etc.
  notes             text,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT chk_reward_positive CHECK (reward_amount > 0)
);

CREATE TRIGGER trg_rewards_updated_at
  BEFORE UPDATE ON rewards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_rewards_parent_id       ON rewards(parent_id);
CREATE INDEX idx_rewards_status          ON rewards(status);


-- ── Seed: subjects ────────────────────────────────────────────
-- Academic subjects (sort 1–18), enrichment subjects (sort 101+).
-- Add new enrichment subjects here as centres are onboarded.

INSERT INTO subjects (name, sort_order) VALUES
  -- Academic
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
  -- Music (instruments)
  ('Piano',                101),
  ('Violin',               102),
  ('Guitar',               103),
  ('Drums',                104),
  ('Vocal / Singing',      105),
  ('Music (General)',      106),
  -- Visual arts
  ('Art & Craft',          201),
  ('Drawing / Sketching',  202),
  ('Chinese Calligraphy',  203),
  -- Performing arts & dance
  ('Ballet',               301),
  ('Dance',                302),
  ('Drama',                303),
  -- Martial arts & sports
  ('Taekwondo',            401),
  ('Wushu',                402),
  ('Lion Dance',           403),
  ('Swimming',             404),
  -- Academic enrichment
  ('Chess',                501),
  ('Coding / Programming', 502),
  ('Creative Writing',     503),
  ('Public Speaking',      504),
  ('Abacus / Mental Maths',505);


-- ── Seed: levels ─────────────────────────────────────────────
-- Academic (sort 1–13), enrichment age bands (100–103),
-- skill bands (200–202), music grades (300–308).
-- Add new entries here as needed — no structural change required.

INSERT INTO levels (code, label, level_group, sort_order) VALUES
  -- Academic: school year groups
  ('P1',       'Primary 1',            'primary',    1),
  ('P2',       'Primary 2',            'primary',    2),
  ('P3',       'Primary 3',            'primary',    3),
  ('P4',       'Primary 4',            'primary',    4),
  ('P5',       'Primary 5',            'primary',    5),
  ('P6',       'Primary 6',            'primary',    6),
  ('SEC1',     'Secondary 1',          'secondary',  7),
  ('SEC2',     'Secondary 2',          'secondary',  8),
  ('SEC3',     'Secondary 3',          'secondary',  9),
  ('SEC4',     'Secondary 4',          'secondary', 10),
  ('SEC5',     'Secondary 5',          'secondary', 11),
  ('JC1',      'JC1',                  'jc',        12),
  ('JC2',      'JC2',                  'jc',        13),
  -- Enrichment: age bands
  ('AGE3-5',   'Ages 3–5',             'other',    100),
  ('AGE6-8',   'Ages 6–8',             'other',    101),
  ('AGE9-12',  'Ages 9–12',            'other',    102),
  ('AGE13UP',  'Ages 13 & above',      'other',    103),
  -- Enrichment: skill bands
  ('BEG',      'Beginner',             'other',    200),
  ('INT',      'Intermediate',         'other',    201),
  ('ADV',      'Advanced',             'other',    202),
  -- Music: grades (ABRSM / Trinity)
  ('MUS-PREP', 'Music Prep / Pre-Grade','other',   300),
  ('MUS-G1',   'Music Grade 1',        'other',    301),
  ('MUS-G2',   'Music Grade 2',        'other',    302),
  ('MUS-G3',   'Music Grade 3',        'other',    303),
  ('MUS-G4',   'Music Grade 4',        'other',    304),
  ('MUS-G5',   'Music Grade 5',        'other',    305),
  ('MUS-G6',   'Music Grade 6',        'other',    306),
  ('MUS-G7',   'Music Grade 7',        'other',    307),
  ('MUS-G8',   'Music Grade 8',        'other',    308);
