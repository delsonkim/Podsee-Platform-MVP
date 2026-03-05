-- ============================================================
-- Enable RLS on all tables + public read policies + function permissions
-- ============================================================

-- ── Row Level Security ──────────────────────────────────────

ALTER TABLE subjects              ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels                ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents               ENABLE ROW LEVEL SECURITY;
ALTER TABLE children              ENABLE ROW LEVEL SECURITY;
ALTER TABLE centres               ENABLE ROW LEVEL SECURITY;
ALTER TABLE centre_subjects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE centre_levels         ENABLE ROW LEVEL SECURITY;
ALTER TABLE centre_subject_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE centre_users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subjects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_levels        ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_slots           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_outcomes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards               ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews               ENABLE ROW LEVEL SECURITY;
ALTER TABLE parse_corrections     ENABLE ROW LEVEL SECURITY;

-- Public read access for browsing centres/slots
CREATE POLICY "anon_read_subjects"     ON subjects              FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_levels"       ON levels                FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_centres"      ON centres               FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "anon_read_centre_subj"  ON centre_subjects       FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_centre_lvl"   ON centre_levels         FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_centre_sl"    ON centre_subject_levels FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_trial_slots"  ON trial_slots           FOR SELECT TO anon, authenticated USING (spots_remaining > 0 AND is_draft = false);
CREATE POLICY "anon_read_teachers"     ON teachers              FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_teacher_subj" ON teacher_subjects      FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_teacher_lvl"  ON teacher_levels        FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_read_reviews"      ON reviews               FOR SELECT TO anon, authenticated USING (status = 'approved');


-- ── Revoke public execute on internal functions ─────────────

REVOKE EXECUTE ON FUNCTION set_updated_at()       FROM public;
REVOKE EXECUTE ON FUNCTION decrement_spots(uuid)  FROM public;
REVOKE EXECUTE ON FUNCTION increment_spots(uuid)  FROM public;

GRANT EXECUTE ON FUNCTION set_updated_at()         TO postgres;
GRANT EXECUTE ON FUNCTION decrement_spots(uuid)    TO postgres;
GRANT EXECUTE ON FUNCTION increment_spots(uuid)    TO postgres;
