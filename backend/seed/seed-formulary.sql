-- PharmaSense — Formulary Seed Data (30 medications across 5 tiers)
-- Columns aligned with §7.3: plan_name, medication_name, generic_name, tier, copay, covered, prior_auth_required

INSERT INTO formulary_entries (plan_name, medication_name, generic_name, tier, copay, covered, prior_auth_required) VALUES

-- Tier 1: Preferred Generic ($0–$10)
('DEMO_PLAN', 'Metformin',            'metformin',            1,   5, TRUE,  FALSE),
('DEMO_PLAN', 'Lisinopril',           'lisinopril',           1,   5, TRUE,  FALSE),
('DEMO_PLAN', 'Amoxicillin',          'amoxicillin',          1,   8, TRUE,  FALSE),
('DEMO_PLAN', 'Ibuprofen',            'ibuprofen',            1,   5, TRUE,  FALSE),
('DEMO_PLAN', 'Omeprazole',           'omeprazole',           1,   8, TRUE,  FALSE),
('DEMO_PLAN', 'Acetaminophen',        'acetaminophen',        1,   3, TRUE,  FALSE),
('DEMO_PLAN', 'Hydrochlorothiazide',  'hydrochlorothiazide',  1,   5, TRUE,  FALSE),
('DEMO_PLAN', 'Metoprolol',           'metoprolol',           1,   8, TRUE,  FALSE),

-- Tier 2: Non-preferred Generic ($15–$30)
('DEMO_PLAN', 'Atorvastatin',  'atorvastatin',  2,  20, TRUE,  FALSE),
('DEMO_PLAN', 'Losartan',      'losartan',      2,  18, TRUE,  FALSE),
('DEMO_PLAN', 'Amlodipine',    'amlodipine',    2,  18, TRUE,  FALSE),
('DEMO_PLAN', 'Sertraline',    'sertraline',    2,  20, TRUE,  FALSE),
('DEMO_PLAN', 'Gabapentin',    'gabapentin',    2,  22, TRUE,  FALSE),
('DEMO_PLAN', 'Simvastatin',   'simvastatin',   2,  18, TRUE,  FALSE),
('DEMO_PLAN', 'Fluoxetine',    'fluoxetine',    2,  18, TRUE,  FALSE),
('DEMO_PLAN', 'Clopidogrel',   'clopidogrel',   2,  25, TRUE,  FALSE),

-- Tier 3: Preferred Brand ($40–$75)
('DEMO_PLAN', 'Eliquis',   'apixaban',              3,  55, TRUE,  FALSE),
('DEMO_PLAN', 'Jardiance',  'empagliflozin',        3,  60, TRUE,  FALSE),
('DEMO_PLAN', 'Ozempic',    'semaglutide',          3,  65, TRUE,  TRUE),
('DEMO_PLAN', 'Humira',     'adalimumab',           3,  70, TRUE,  TRUE),
('DEMO_PLAN', 'Xarelto',    'rivaroxaban',          3,  50, TRUE,  FALSE),
('DEMO_PLAN', 'Entresto',   'sacubitril/valsartan', 3,  65, TRUE,  TRUE),
('DEMO_PLAN', 'Trulicity',  'dulaglutide',          3,  60, TRUE,  TRUE),

-- Tier 4: Non-preferred Brand ($100–$200)
('DEMO_PLAN', 'Keytruda',  'pembrolizumab',  4, 175, TRUE, TRUE),
('DEMO_PLAN', 'Stelara',   'ustekinumab',    4, 140, TRUE, TRUE),
('DEMO_PLAN', 'Dupixent',  'dupilumab',      4, 160, TRUE, TRUE),
('DEMO_PLAN', 'Skyrizi',   'risankizumab',   4, 165, TRUE, TRUE),

-- Tier 5 / Not Covered
('DEMO_PLAN', 'Experimental Drug X', 'experimental-x',   5, 0, FALSE, FALSE),
('DEMO_PLAN', 'CosmeticFill',        'cosmetic-filler',  5, 0, FALSE, FALSE),
('DEMO_PLAN', 'WeightLoss Ultra',    'weightloss-ultra', 5, 0, FALSE, FALSE)

ON CONFLICT DO NOTHING;
