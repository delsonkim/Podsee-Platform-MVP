-- Add secondary school academic subjects and IP/NA stream levels

-- New academic subjects (sort_order 17–25)
INSERT INTO subjects (name, sort_order) VALUES
  ('Elementary Mathematics', 17),
  ('Additional Mathematics', 18),
  ('Combined Science (Physics/Chemistry)', 19),
  ('Combined Science (Chemistry/Biology)', 20),
  ('Principles of Accounts', 21),
  ('Economics', 22),
  ('Combined Humanities (SS/History)', 23),
  ('Combined Humanities (SS/Geography)', 24),
  ('Combined Humanities (SS/Literature)', 25)
ON CONFLICT DO NOTHING;

-- New levels: Integrated Programme (IP) and Normal Academic (NA)
INSERT INTO levels (code, label, level_group, sort_order) VALUES
  ('IP1', 'IP Year 1', 'secondary', 14),
  ('IP2', 'IP Year 2', 'secondary', 15),
  ('IP3', 'IP Year 3', 'secondary', 16),
  ('IP4', 'IP Year 4', 'secondary', 17),
  ('NA1', 'Normal Academic 1', 'secondary', 18),
  ('NA2', 'Normal Academic 2', 'secondary', 19),
  ('NA3', 'Normal Academic 3', 'secondary', 20),
  ('NA4', 'Normal Academic 4', 'secondary', 21)
ON CONFLICT DO NOTHING;
