-- PharmaSense — Formulary Seed Data (30 medications across 5 tiers)

INSERT INTO formulary_entries (drug_name, generic_name, tier, copay_min, copay_max, requires_prior_auth, is_covered, notes) VALUES

-- Tier 1: Preferred Generic ($0–$10)
('Metformin',            'metformin',            1,   0,   10, FALSE, TRUE, 'First-line diabetes treatment'),
('Lisinopril',           'lisinopril',           1,   0,   10, FALSE, TRUE, 'ACE inhibitor for hypertension'),
('Amoxicillin',          'amoxicillin',          1,   0,   10, FALSE, TRUE, 'Common antibiotic'),
('Ibuprofen',            'ibuprofen',            1,   0,   10, FALSE, TRUE, 'NSAID for pain/inflammation'),
('Omeprazole',           'omeprazole',           1,   0,   10, FALSE, TRUE, 'Proton pump inhibitor for GERD'),
('Acetaminophen',        'acetaminophen',        1,   0,    5, FALSE, TRUE, 'OTC pain reliever'),
('Hydrochlorothiazide',  'hydrochlorothiazide',  1,   0,   10, FALSE, TRUE, 'Thiazide diuretic'),
('Metoprolol',           'metoprolol',           1,   0,   10, FALSE, TRUE, 'Beta-blocker for heart conditions'),

-- Tier 2: Non-preferred Generic ($15–$30)
('Atorvastatin',  'atorvastatin',  2,  15,  30, FALSE, TRUE, 'Statin for cholesterol'),
('Losartan',      'losartan',      2,  15,  25, FALSE, TRUE, 'ARB for hypertension'),
('Amlodipine',    'amlodipine',    2,  15,  25, FALSE, TRUE, 'Calcium channel blocker'),
('Sertraline',    'sertraline',    2,  15,  30, FALSE, TRUE, 'SSRI antidepressant'),
('Gabapentin',    'gabapentin',    2,  15,  30, FALSE, TRUE, 'Anticonvulsant/nerve pain'),
('Simvastatin',   'simvastatin',   2,  15,  25, FALSE, TRUE, 'Statin for cholesterol'),
('Fluoxetine',    'fluoxetine',    2,  15,  25, FALSE, TRUE, 'SSRI antidepressant'),
('Clopidogrel',   'clopidogrel',   2,  20,  30, FALSE, TRUE, 'Antiplatelet agent'),

-- Tier 3: Preferred Brand ($40–$75)
('Eliquis',   'apixaban',              3,  40,  75, FALSE, TRUE, 'Anticoagulant for AFib/DVT'),
('Jardiance',  'empagliflozin',        3,  45,  75, FALSE, TRUE, 'SGLT2 inhibitor for diabetes'),
('Ozempic',    'semaglutide',          3,  50,  75, TRUE,  TRUE, 'GLP-1 agonist for diabetes/weight'),
('Humira',     'adalimumab',           3,  60,  75, TRUE,  TRUE, 'TNF inhibitor for autoimmune'),
('Xarelto',    'rivaroxaban',          3,  40,  70, FALSE, TRUE, 'Anticoagulant'),
('Entresto',   'sacubitril/valsartan', 3,  50,  75, TRUE,  TRUE, 'Heart failure combination'),
('Trulicity',  'dulaglutide',          3,  45,  75, TRUE,  TRUE, 'GLP-1 agonist for diabetes'),

-- Tier 4: Non-preferred Brand ($100–$200)
('Keytruda',  'pembrolizumab',  4, 150, 200, TRUE, TRUE, 'Immunotherapy for cancer'),
('Stelara',   'ustekinumab',    4, 100, 180, TRUE, TRUE, 'IL-12/23 inhibitor'),
('Dupixent',  'dupilumab',      4, 120, 200, TRUE, TRUE, 'IL-4/13 inhibitor for eczema/asthma'),
('Skyrizi',   'risankizumab',   4, 130, 200, TRUE, TRUE, 'IL-23 inhibitor for psoriasis'),

-- Tier 5 / Not Covered
('Experimental Drug X', 'experimental-x',  5, 0, 0, FALSE, FALSE, 'Experimental — not covered'),
('CosmeticFill',        'cosmetic-filler', 5, 0, 0, FALSE, FALSE, 'Cosmetic — not covered'),
('WeightLoss Ultra',    'weightloss-ultra', 5, 0, 0, FALSE, FALSE, 'Not FDA approved — not covered')

ON CONFLICT (drug_name) DO NOTHING;
