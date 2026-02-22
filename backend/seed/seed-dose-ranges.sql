-- PharmaSense — Dose Range Seed Data (§8.1 — 15 common medications)
-- Columns aligned with §7.2: medication_name, min_dose_mg, max_dose_mg, unit, frequency, population, source

INSERT INTO dose_ranges (medication_name, min_dose_mg, max_dose_mg, unit, frequency, population, source) VALUES
('Metformin',      500,    2550,  'mg',  'daily total',  'adult', 'FDA prescribing information'),
('Lisinopril',       5,      40,  'mg',  'once daily',   'adult', 'FDA prescribing information'),
('Amoxicillin',    250,    3000,  'mg',  'daily total',  'adult', 'FDA prescribing information'),
('Atorvastatin',    10,      80,  'mg',  'once daily',   'adult', 'FDA prescribing information'),
('Omeprazole',      20,      40,  'mg',  'once daily',   'adult', 'FDA prescribing information'),
('Ibuprofen',      200,    3200,  'mg',  'daily total',  'adult', 'FDA prescribing information'),
('Losartan',        25,     100,  'mg',  'once daily',   'adult', 'FDA prescribing information'),
('Amlodipine',      2.5,     10,  'mg',  'once daily',   'adult', 'FDA prescribing information'),
('Sertraline',      25,     200,  'mg',  'once daily',   'adult', 'FDA prescribing information'),
('Metoprolol',      25,     400,  'mg',  'daily total',  'adult', 'FDA prescribing information'),
('Gabapentin',     300,    3600,  'mg',  'daily total',  'adult', 'FDA prescribing information'),
('Levothyroxine',    0.025,   0.3, 'mg', 'once daily',   'adult', 'FDA prescribing information'),
('Prednisone',       5,      60,  'mg',  'once daily',   'adult', 'FDA prescribing information'),
('Warfarin',         1,      10,  'mg',  'once daily',   'adult', 'FDA prescribing information'),
('Ciprofloxacin',  250,    1500,  'mg',  'daily total',  'adult', 'FDA prescribing information')
ON CONFLICT DO NOTHING;
