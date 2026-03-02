-- ============================================================
-- Podsee — Mock Data
-- Run this AFTER the initial schema migration.
-- Safe to re-run: uses DELETE to clear existing mock data first.
-- ============================================================

-- ── Clear existing mock data (in reverse dependency order) ────
DELETE FROM bookings;
DELETE FROM trial_slots;
DELETE FROM teacher_levels;
DELETE FROM teacher_subjects;
DELETE FROM teachers;
DELETE FROM centre_levels;
DELETE FROM centre_subjects;
DELETE FROM centres;


-- ============================================================
-- CENTRE 1: Bright Minds Learning Centre (Academic — Tampines)
-- ============================================================

INSERT INTO centres (
  name, slug, area, address, nearest_mrt, parking_info,
  description, teaching_style, class_size,
  replacement_class_policy, makeup_class_policy,
  commitment_terms, notice_period_terms, payment_terms,
  years_operating, track_record
) VALUES (
  'Bright Minds Learning Centre',
  'bright-minds-learning-centre',
  'Tampines',
  '10 Tampines Central 1, #03-12, Tampines 1, Singapore 529536',
  'Tampines MRT (EW2/DT32), 3-min walk',
  'Multi-storey carpark at Tampines 1 mall. First 2 hours free with mall validation stamp.',
  'Bright Minds specialises in small-group tuition for Primary and Secondary students in Mathematics, Science and English. We focus on building strong fundamentals while equipping students with exam techniques that get results. Classes are kept to 3–4 students so every child gets individual attention.',
  'Small-group sessions of 3–4 students. Each lesson combines concept explanation, guided practice and timed assessment. Students receive weekly worksheets and a monthly progress report.',
  4,
  'One replacement class per term with 48 hours advance notice. Replacements must be scheduled within the same term.',
  'Makeup classes are covered under the replacement class policy above.',
  'Month-to-month. No minimum commitment or lock-in required.',
  '1 month written notice (WhatsApp accepted) to discontinue.',
  'Monthly fees due on the 1st of each month via PayNow or bank transfer. Invoice sent on the 25th of the preceding month.',
  8,
  '90% of our PSLE students achieved AL1–AL3 in Mathematics in 2025. 4 students scored A or higher for O-Level Additional Mathematics in the 2025 sitting.'
);

-- Subjects
INSERT INTO centre_subjects (centre_id, subject_id, display_name, description) VALUES
  (
    (SELECT id FROM centres WHERE slug = 'bright-minds-learning-centre'),
    (SELECT id FROM subjects WHERE name = 'Mathematics'),
    'Mathematics (Primary & Secondary)',
    'Covers Primary Mathematics (P3–P6) including PSLE preparation, and Secondary Mathematics (Sec 1–4) including E-Math and A-Math. Lessons are structured around past-year exam papers and MOE syllabus requirements.'
  ),
  (
    (SELECT id FROM centres WHERE slug = 'bright-minds-learning-centre'),
    (SELECT id FROM subjects WHERE name = 'Science'),
    'Science (Primary)',
    'Covers Primary Science (P3–P6) with a focus on concept mastery and structured answering techniques for PSLE. Students are trained to identify keywords and apply the SEA (Situation, Evidence, Answer) framework.'
  ),
  (
    (SELECT id FROM centres WHERE slug = 'bright-minds-learning-centre'),
    (SELECT id FROM subjects WHERE name = 'English Language'),
    'English & Comprehension',
    'Covers English Language for Primary and Secondary levels. Focus areas include comprehension, composition writing and oral communication. Classes are not called ''English'' here because we go beyond the standard syllabus — we train analytical reading and persuasive writing as distinct skills.'
  );

-- Levels
INSERT INTO centre_levels (centre_id, level_id) VALUES
  ((SELECT id FROM centres WHERE slug = 'bright-minds-learning-centre'), (SELECT id FROM levels WHERE code = 'P3')),
  ((SELECT id FROM centres WHERE slug = 'bright-minds-learning-centre'), (SELECT id FROM levels WHERE code = 'P4')),
  ((SELECT id FROM centres WHERE slug = 'bright-minds-learning-centre'), (SELECT id FROM levels WHERE code = 'P5')),
  ((SELECT id FROM centres WHERE slug = 'bright-minds-learning-centre'), (SELECT id FROM levels WHERE code = 'P6')),
  ((SELECT id FROM centres WHERE slug = 'bright-minds-learning-centre'), (SELECT id FROM levels WHERE code = 'SEC1')),
  ((SELECT id FROM centres WHERE slug = 'bright-minds-learning-centre'), (SELECT id FROM levels WHERE code = 'SEC2')),
  ((SELECT id FROM centres WHERE slug = 'bright-minds-learning-centre'), (SELECT id FROM levels WHERE code = 'SEC3')),
  ((SELECT id FROM centres WHERE slug = 'bright-minds-learning-centre'), (SELECT id FROM levels WHERE code = 'SEC4'));

-- Teachers
INSERT INTO teachers (centre_id, name, role, is_founder, qualifications, bio, years_experience, sort_order) VALUES
  (
    (SELECT id FROM centres WHERE slug = 'bright-minds-learning-centre'),
    'Mrs Linda Lim',
    'Founder & Head Tutor',
    true,
    'B.Sc. (Hons) Mathematics, NUS; PGDE, NIE',
    'Linda founded Bright Minds in 2018 after a decade as a MOE teacher at Tampines Primary School. She started the centre to give students the focused, individual attention that classroom settings cannot provide. Her structured approach has helped over 200 students improve by at least one grade band within two terms.',
    15,
    0
  ),
  (
    (SELECT id FROM centres WHERE slug = 'bright-minds-learning-centre'),
    'Mr Jason Tan',
    'Secondary Mathematics Specialist',
    false,
    'B.Eng. (Electrical Engineering), NTU; NIE-trained',
    'Jason specialises in Secondary E-Math and A-Math. His engineering background gives him a practical, application-based approach to problem-solving that Secondary students find highly relatable. He has a strong track record with both O-Level and Integrated Programme students.',
    7,
    1
  );

-- Teacher subjects
INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES
  ((SELECT id FROM teachers WHERE name = 'Mrs Linda Lim'), (SELECT id FROM subjects WHERE name = 'Mathematics')),
  ((SELECT id FROM teachers WHERE name = 'Mrs Linda Lim'), (SELECT id FROM subjects WHERE name = 'Science')),
  ((SELECT id FROM teachers WHERE name = 'Mrs Linda Lim'), (SELECT id FROM subjects WHERE name = 'English Language')),
  ((SELECT id FROM teachers WHERE name = 'Mr Jason Tan'),  (SELECT id FROM subjects WHERE name = 'Mathematics'));

-- Teacher levels
INSERT INTO teacher_levels (teacher_id, level_id) VALUES
  ((SELECT id FROM teachers WHERE name = 'Mrs Linda Lim'), (SELECT id FROM levels WHERE code = 'P3')),
  ((SELECT id FROM teachers WHERE name = 'Mrs Linda Lim'), (SELECT id FROM levels WHERE code = 'P4')),
  ((SELECT id FROM teachers WHERE name = 'Mrs Linda Lim'), (SELECT id FROM levels WHERE code = 'P5')),
  ((SELECT id FROM teachers WHERE name = 'Mrs Linda Lim'), (SELECT id FROM levels WHERE code = 'P6')),
  ((SELECT id FROM teachers WHERE name = 'Mr Jason Tan'),  (SELECT id FROM levels WHERE code = 'SEC1')),
  ((SELECT id FROM teachers WHERE name = 'Mr Jason Tan'),  (SELECT id FROM levels WHERE code = 'SEC2')),
  ((SELECT id FROM teachers WHERE name = 'Mr Jason Tan'),  (SELECT id FROM levels WHERE code = 'SEC3')),
  ((SELECT id FROM teachers WHERE name = 'Mr Jason Tan'),  (SELECT id FROM levels WHERE code = 'SEC4'));

-- Trial slots (academic — uses level_id)
INSERT INTO trial_slots (centre_id, subject_id, level_id, date, start_time, end_time, trial_fee, max_students, spots_remaining, notes) VALUES
  (
    (SELECT id FROM centres WHERE slug = 'bright-minds-learning-centre'),
    (SELECT id FROM subjects WHERE name = 'Mathematics'),
    (SELECT id FROM levels WHERE code = 'P5'),
    '2026-03-14', '14:00', '15:00', 30.00, 2, 2,
    'Trial covers fractions and ratio. Bring assessment book if you have one.'
  ),
  (
    (SELECT id FROM centres WHERE slug = 'bright-minds-learning-centre'),
    (SELECT id FROM subjects WHERE name = 'Science'),
    (SELECT id FROM levels WHERE code = 'P6'),
    '2026-03-15', '10:00', '11:00', 30.00, 2, 1,
    'Trial covers energy and forces. Past-year PSLE questions will be used.'
  ),
  (
    (SELECT id FROM centres WHERE slug = 'bright-minds-learning-centre'),
    (SELECT id FROM subjects WHERE name = 'Mathematics'),
    (SELECT id FROM levels WHERE code = 'SEC2'),
    '2026-03-16', '16:00', '17:30', 45.00, 2, 2,
    'Trial covers simultaneous equations and quadratic expressions.'
  );


-- ============================================================
-- CENTRE 2: Harmony Music Studio (Piano & Violin — Buona Vista)
-- ============================================================

INSERT INTO centres (
  name, slug, area, address, nearest_mrt, parking_info,
  description, teaching_style, class_size,
  replacement_class_policy, makeup_class_policy,
  commitment_terms, notice_period_terms, payment_terms,
  years_operating, track_record
) VALUES (
  'Harmony Music Studio',
  'harmony-music-studio',
  'Buona Vista',
  '25 Rochester Park, #01-05, Singapore 139212',
  'Buona Vista MRT (EW21/CC22), 8-min walk via Rochester Park',
  'Limited street parking along Rochester Park. Nearest carpark at one-north Business Park (5-min walk, charges apply).',
  'Harmony Music Studio offers one-to-one Piano and Violin lessons from complete beginners through to ABRSM Grade 8. Our teachers are graduates of the Yong Siew Toh Conservatory of Music and bring a combined 28 years of teaching experience. We focus on building genuine musicality alongside technical skill.',
  'All lessons are one-to-one to give each student complete focus. Lessons follow a structured progression aligned to ABRSM syllabi, with performance opportunities through our annual recital each December.',
  1,
  'One replacement lesson per month with 24 hours advance notice. Replacement must be taken within the same calendar month.',
  'Makeup lessons are covered under the replacement class policy above.',
  'Term enrolment (10 lessons per term). First term is pro-rated if joining mid-term.',
  '4 weeks written notice before the end of the current term.',
  'Full term fees payable before the first lesson of each term via PayNow (UEN: 201412345B).',
  12,
  'Over 150 students have passed ABRSM examinations with Distinction or Merit. 3 former students are currently enrolled at Yong Siew Toh Conservatory of Music, NUS.'
);

-- Subjects
INSERT INTO centre_subjects (centre_id, subject_id, display_name, description) VALUES
  (
    (SELECT id FROM centres WHERE slug = 'harmony-music-studio'),
    (SELECT id FROM subjects WHERE name = 'Piano'),
    'Piano (ABRSM)',
    'One-to-one piano lessons from beginner to ABRSM Grade 8. Content is tailored to your child''s current level and goals — whether recreational enjoyment or formal ABRSM examinations.'
  ),
  (
    (SELECT id FROM centres WHERE slug = 'harmony-music-studio'),
    (SELECT id FROM subjects WHERE name = 'Violin'),
    'Violin (ABRSM)',
    'One-to-one violin lessons from beginner to ABRSM Grade 8. Students learn proper posture, bowing technique and music theory alongside their chosen repertoire.'
  );

-- Levels (music uses age bands + music grades)
INSERT INTO centre_levels (centre_id, level_id) VALUES
  ((SELECT id FROM centres WHERE slug = 'harmony-music-studio'), (SELECT id FROM levels WHERE code = 'AGE6-8')),
  ((SELECT id FROM centres WHERE slug = 'harmony-music-studio'), (SELECT id FROM levels WHERE code = 'AGE9-12')),
  ((SELECT id FROM centres WHERE slug = 'harmony-music-studio'), (SELECT id FROM levels WHERE code = 'AGE13UP')),
  ((SELECT id FROM centres WHERE slug = 'harmony-music-studio'), (SELECT id FROM levels WHERE code = 'MUS-PREP')),
  ((SELECT id FROM centres WHERE slug = 'harmony-music-studio'), (SELECT id FROM levels WHERE code = 'MUS-G1')),
  ((SELECT id FROM centres WHERE slug = 'harmony-music-studio'), (SELECT id FROM levels WHERE code = 'MUS-G2')),
  ((SELECT id FROM centres WHERE slug = 'harmony-music-studio'), (SELECT id FROM levels WHERE code = 'MUS-G3')),
  ((SELECT id FROM centres WHERE slug = 'harmony-music-studio'), (SELECT id FROM levels WHERE code = 'MUS-G4')),
  ((SELECT id FROM centres WHERE slug = 'harmony-music-studio'), (SELECT id FROM levels WHERE code = 'MUS-G5')),
  ((SELECT id FROM centres WHERE slug = 'harmony-music-studio'), (SELECT id FROM levels WHERE code = 'MUS-G6')),
  ((SELECT id FROM centres WHERE slug = 'harmony-music-studio'), (SELECT id FROM levels WHERE code = 'MUS-G7')),
  ((SELECT id FROM centres WHERE slug = 'harmony-music-studio'), (SELECT id FROM levels WHERE code = 'MUS-G8'));

-- Teachers
INSERT INTO teachers (centre_id, name, role, is_founder, qualifications, bio, years_experience, sort_order) VALUES
  (
    (SELECT id FROM centres WHERE slug = 'harmony-music-studio'),
    'Ms Sarah Chen',
    'Founder & Piano Principal',
    true,
    'B.Mus (Piano Performance), Yong Siew Toh Conservatory of Music, NUS; DipABRSM (Music Teaching)',
    'Sarah founded Harmony Music Studio in 2014 after a decade of performing and teaching privately across Singapore and Malaysia. She believes every child can develop a genuine love for music when taught at the right pace and with the right encouragement. Her students have consistently achieved Distinctions at ABRSM examinations.',
    18,
    0
  ),
  (
    (SELECT id FROM centres WHERE slug = 'harmony-music-studio'),
    'Mr Daniel Koh',
    'Violin Teacher',
    false,
    'B.Mus (Violin Performance), Yong Siew Toh Conservatory of Music, NUS',
    'Daniel is a professional violinist and educator who performs regularly with local orchestras including the Singapore Symphony Orchestra. He teaches violin from beginner through to ABRSM Grade 8, with a strong focus on tone production and musical expression alongside technical development.',
    10,
    1
  );

-- Teacher subjects
INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES
  ((SELECT id FROM teachers WHERE name = 'Ms Sarah Chen'), (SELECT id FROM subjects WHERE name = 'Piano')),
  ((SELECT id FROM teachers WHERE name = 'Mr Daniel Koh'),  (SELECT id FROM subjects WHERE name = 'Violin'));

-- Teacher levels
INSERT INTO teacher_levels (teacher_id, level_id) VALUES
  ((SELECT id FROM teachers WHERE name = 'Ms Sarah Chen'), (SELECT id FROM levels WHERE code = 'MUS-PREP')),
  ((SELECT id FROM teachers WHERE name = 'Ms Sarah Chen'), (SELECT id FROM levels WHERE code = 'MUS-G1')),
  ((SELECT id FROM teachers WHERE name = 'Ms Sarah Chen'), (SELECT id FROM levels WHERE code = 'MUS-G2')),
  ((SELECT id FROM teachers WHERE name = 'Ms Sarah Chen'), (SELECT id FROM levels WHERE code = 'MUS-G3')),
  ((SELECT id FROM teachers WHERE name = 'Ms Sarah Chen'), (SELECT id FROM levels WHERE code = 'MUS-G4')),
  ((SELECT id FROM teachers WHERE name = 'Ms Sarah Chen'), (SELECT id FROM levels WHERE code = 'MUS-G5')),
  ((SELECT id FROM teachers WHERE name = 'Ms Sarah Chen'), (SELECT id FROM levels WHERE code = 'MUS-G6')),
  ((SELECT id FROM teachers WHERE name = 'Ms Sarah Chen'), (SELECT id FROM levels WHERE code = 'MUS-G7')),
  ((SELECT id FROM teachers WHERE name = 'Ms Sarah Chen'), (SELECT id FROM levels WHERE code = 'MUS-G8')),
  ((SELECT id FROM teachers WHERE name = 'Mr Daniel Koh'),  (SELECT id FROM levels WHERE code = 'MUS-PREP')),
  ((SELECT id FROM teachers WHERE name = 'Mr Daniel Koh'),  (SELECT id FROM levels WHERE code = 'MUS-G1')),
  ((SELECT id FROM teachers WHERE name = 'Mr Daniel Koh'),  (SELECT id FROM levels WHERE code = 'MUS-G2')),
  ((SELECT id FROM teachers WHERE name = 'Mr Daniel Koh'),  (SELECT id FROM levels WHERE code = 'MUS-G3')),
  ((SELECT id FROM teachers WHERE name = 'Mr Daniel Koh'),  (SELECT id FROM levels WHERE code = 'MUS-G4')),
  ((SELECT id FROM teachers WHERE name = 'Mr Daniel Koh'),  (SELECT id FROM levels WHERE code = 'MUS-G5')),
  ((SELECT id FROM teachers WHERE name = 'Mr Daniel Koh'),  (SELECT id FROM levels WHERE code = 'MUS-G6')),
  ((SELECT id FROM teachers WHERE name = 'Mr Daniel Koh'),  (SELECT id FROM levels WHERE code = 'MUS-G7')),
  ((SELECT id FROM teachers WHERE name = 'Mr Daniel Koh'),  (SELECT id FROM levels WHERE code = 'MUS-G8'));

-- Trial slots (music — uses age_min/age_max + custom_level, no level_id)
INSERT INTO trial_slots (centre_id, subject_id, age_min, age_max, custom_level, date, start_time, end_time, trial_fee, max_students, spots_remaining, notes) VALUES
  (
    (SELECT id FROM centres WHERE slug = 'harmony-music-studio'),
    (SELECT id FROM subjects WHERE name = 'Piano'),
    5, 8, 'Beginner / Pre-Grade',
    '2026-03-14', '10:00', '10:30', 40.00, 1, 1,
    '30-minute trial for young beginners aged 5–8. No prior experience needed. A mini keyboard is available if your child does not yet have one at home.'
  ),
  (
    (SELECT id FROM centres WHERE slug = 'harmony-music-studio'),
    (SELECT id FROM subjects WHERE name = 'Piano'),
    9, 15, 'Grade 3–5',
    '2026-03-15', '11:00', '11:45', 55.00, 1, 1,
    '45-minute trial for students around ABRSM Grade 3–5. Please bring your current exam pieces if you have them so the teacher can assess your level accurately.'
  ),
  (
    (SELECT id FROM centres WHERE slug = 'harmony-music-studio'),
    (SELECT id FROM subjects WHERE name = 'Violin'),
    6, 12, 'Beginner / Pre-Grade',
    '2026-03-21', '09:00', '09:30', 40.00, 1, 1,
    '30-minute beginner violin trial for ages 6–12. Violins in 1/4, 1/2 and 3/4 sizes are available for loan during the trial.'
  );


-- ============================================================
-- CENTRE 3: Dragon Gate Wushu Academy (Wushu & Lion Dance — Jurong East)
-- ============================================================

INSERT INTO centres (
  name, slug, area, address, nearest_mrt, parking_info,
  description, teaching_style, class_size,
  replacement_class_policy, makeup_class_policy,
  commitment_terms, notice_period_terms, payment_terms,
  years_operating, track_record
) VALUES (
  'Dragon Gate Wushu Academy',
  'dragon-gate-wushu-academy',
  'Jurong East',
  '2 Jurong East Street 21, #04-01, IMM Building, Singapore 609601',
  'Jurong East MRT (EW24/NS1), 5-min walk via covered linkway',
  'Ample parking at IMM Building. First 30 minutes free, $1.20 per half hour thereafter.',
  'Dragon Gate Wushu Academy is one of Singapore''s longest-running Wushu schools, offering structured training from complete beginners through to competitive level. We also offer Lion Dance as a group programme. Classes are grouped by age and skill level, and our curriculum is designed so students build real technique — not just routines.',
  'Group classes of 8–12 students organised by age and skill level. Beginners follow a structured 12-week Foundations curriculum before progressing to intermediate forms training. All students are assessed every term and advanced when ready.',
  12,
  'One replacement class per month with 24 hours advance notice. Must be taken within the same calendar month.',
  'Makeup classes are covered under the replacement class policy above. No separate makeup entitlement.',
  'Term enrolment (12 sessions per term). Sibling pairs receive a 10% discount on the second enrolment.',
  '4 weeks written notice (WhatsApp accepted) before the start of the new term.',
  'Full term fees due before the first class of each term via PayNow (UEN: 200312345A) or cash.',
  18,
  '12 students have represented Singapore at international Wushu competitions. Our Lion Dance troupe has performed at 200+ events including the 2023 Singapore National Day Parade and multiple corporate CNY events.'
);

-- Subjects
INSERT INTO centre_subjects (centre_id, subject_id, display_name, description) VALUES
  (
    (SELECT id FROM centres WHERE slug = 'dragon-gate-wushu-academy'),
    (SELECT id FROM subjects WHERE name = 'Wushu'),
    'Wushu (Foundations to Competitive)',
    'Structured Wushu training covering basic stances, kicks and forms (Changquan) for beginners, progressing through to competitive-level routines for advanced students. Students are grouped by age and assessed each term before advancing.'
  ),
  (
    (SELECT id FROM centres WHERE slug = 'dragon-gate-wushu-academy'),
    (SELECT id FROM subjects WHERE name = 'Lion Dance'),
    'Lion Dance (Group Programme)',
    'Traditional Southern Lion Dance taught in groups of 6–10 students. Open to ages 8 and above with no prior experience required. Students train as a team and have the opportunity to perform at real events organised by the academy.'
  );

-- Levels (enrichment — uses age bands + skill bands)
INSERT INTO centre_levels (centre_id, level_id) VALUES
  ((SELECT id FROM centres WHERE slug = 'dragon-gate-wushu-academy'), (SELECT id FROM levels WHERE code = 'AGE6-8')),
  ((SELECT id FROM centres WHERE slug = 'dragon-gate-wushu-academy'), (SELECT id FROM levels WHERE code = 'AGE9-12')),
  ((SELECT id FROM centres WHERE slug = 'dragon-gate-wushu-academy'), (SELECT id FROM levels WHERE code = 'AGE13UP')),
  ((SELECT id FROM centres WHERE slug = 'dragon-gate-wushu-academy'), (SELECT id FROM levels WHERE code = 'BEG')),
  ((SELECT id FROM centres WHERE slug = 'dragon-gate-wushu-academy'), (SELECT id FROM levels WHERE code = 'INT')),
  ((SELECT id FROM centres WHERE slug = 'dragon-gate-wushu-academy'), (SELECT id FROM levels WHERE code = 'ADV'));

-- Teachers
INSERT INTO teachers (centre_id, name, role, is_founder, qualifications, bio, years_experience, sort_order) VALUES
  (
    (SELECT id FROM centres WHERE slug = 'dragon-gate-wushu-academy'),
    'Sifu Wong Chee Keong',
    'Founder & Chief Instructor',
    true,
    'National Wushu Athlete, represented Singapore 1998–2006; Singapore Wushu Dragon & Lion Dance Federation Certified Instructor (Level 3)',
    'Sifu Wong is a former national Wushu athlete who represented Singapore at the 2003 and 2005 World Wushu Championships. He founded Dragon Gate in 2008 to preserve and promote Chinese martial arts culture in Singapore. He personally oversees all curriculum development and coaches the competitive team. Outside the academy, he serves on the technical committee of the Singapore Wushu Dragon & Lion Dance Federation.',
    28,
    0
  ),
  (
    (SELECT id FROM centres WHERE slug = 'dragon-gate-wushu-academy'),
    'Coach Priya Nair',
    'Wushu & Lion Dance Coach',
    false,
    'B.Sc. Sports Science, Singapore Institute of Technology; Singapore Wushu Dragon & Lion Dance Federation Certified Instructor (Level 2)',
    'Priya joined Dragon Gate in 2019 after competing at national level for 8 years. She leads the beginner and intermediate Wushu classes as well as the Lion Dance programme. Her patient, encouraging teaching style is particularly well-suited to younger students and first-timers.',
    9,
    1
  );

-- Teacher subjects
INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES
  ((SELECT id FROM teachers WHERE name = 'Sifu Wong Chee Keong'), (SELECT id FROM subjects WHERE name = 'Wushu')),
  ((SELECT id FROM teachers WHERE name = 'Sifu Wong Chee Keong'), (SELECT id FROM subjects WHERE name = 'Lion Dance')),
  ((SELECT id FROM teachers WHERE name = 'Coach Priya Nair'),      (SELECT id FROM subjects WHERE name = 'Wushu')),
  ((SELECT id FROM teachers WHERE name = 'Coach Priya Nair'),      (SELECT id FROM subjects WHERE name = 'Lion Dance'));

-- Teacher levels
INSERT INTO teacher_levels (teacher_id, level_id) VALUES
  ((SELECT id FROM teachers WHERE name = 'Sifu Wong Chee Keong'), (SELECT id FROM levels WHERE code = 'INT')),
  ((SELECT id FROM teachers WHERE name = 'Sifu Wong Chee Keong'), (SELECT id FROM levels WHERE code = 'ADV')),
  ((SELECT id FROM teachers WHERE name = 'Coach Priya Nair'),      (SELECT id FROM levels WHERE code = 'BEG')),
  ((SELECT id FROM teachers WHERE name = 'Coach Priya Nair'),      (SELECT id FROM levels WHERE code = 'INT'));

-- Trial slots (enrichment — uses age_min/age_max + custom_level)
INSERT INTO trial_slots (centre_id, subject_id, age_min, age_max, custom_level, date, start_time, end_time, trial_fee, max_students, spots_remaining, notes) VALUES
  (
    (SELECT id FROM centres WHERE slug = 'dragon-gate-wushu-academy'),
    (SELECT id FROM subjects WHERE name = 'Wushu'),
    6, 9, 'Foundations (Ages 6–9)',
    '2026-03-14', '09:00', '10:00', 25.00, 4, 3,
    'Beginner Wushu trial for ages 6–9. Wear comfortable sports attire and sports shoes. No prior experience needed.'
  ),
  (
    (SELECT id FROM centres WHERE slug = 'dragon-gate-wushu-academy'),
    (SELECT id FROM subjects WHERE name = 'Wushu'),
    10, 17, 'Foundations (Ages 10–17)',
    '2026-03-14', '10:30', '12:00', 25.00, 6, 5,
    '90-minute Wushu trial for older beginners. Covers basic stances, kicks and the opening sequence of the first form.'
  ),
  (
    (SELECT id FROM centres WHERE slug = 'dragon-gate-wushu-academy'),
    (SELECT id FROM subjects WHERE name = 'Lion Dance'),
    8, 17, 'Open to all beginners',
    '2026-03-21', '10:00', '11:30', 20.00, 6, 6,
    'Lion Dance trial open to all beginners aged 8–17. No experience needed. Feel free to come with friends — Lion Dance is a team activity and more fun in a group!'
  );


-- ============================================================
-- MOCK BOOKING (manual entry — no parent/child account needed)
-- ============================================================

INSERT INTO bookings (
  booking_ref,
  trial_slot_id,
  centre_id,
  parent_name_at_booking,
  parent_email_at_booking,
  parent_phone_at_booking,
  child_name_at_booking,
  child_level_at_booking,
  trial_fee_at_booking,
  status,
  referral_source,
  admin_notes
) VALUES (
  'PSE-260302-0001',
  (SELECT id FROM trial_slots
   WHERE centre_id = (SELECT id FROM centres WHERE slug = 'bright-minds-learning-centre')
   AND date = '2026-03-14' AND start_time = '14:00'),
  (SELECT id FROM centres WHERE slug = 'bright-minds-learning-centre'),
  'Mrs Tan Mei Ling',
  'meiltan@gmail.com',
  '+65 9123 4567',
  'Tan Jun Wei',
  'Primary 5',
  30.00,
  'confirmed',
  'Instagram',
  'Parent contacted via WhatsApp on 02 Mar. Centre confirmed slot same day. Father will accompany child to trial.'
);
