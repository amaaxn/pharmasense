-- PharmaSense — Drug Interaction Seed Data (15 interaction pairs)

INSERT INTO drug_interactions (drug_a, drug_b, severity, description) VALUES
('Warfarin',       'Aspirin',                'SEVERE',   'Increased bleeding risk'),
('Lisinopril',     'Potassium supplements',  'MODERATE', 'Risk of hyperkalemia'),
('Metformin',      'Contrast dye',           'SEVERE',   'Risk of lactic acidosis'),
('Sertraline',     'Phenelzine',             'SEVERE',   'Serotonin syndrome risk (SSRI + MAOI)'),
('Amoxicillin',    'Methotrexate',           'MODERATE', 'Increased methotrexate toxicity'),
('Simvastatin',    'Erythromycin',           'SEVERE',   'Rhabdomyolysis risk'),
('Ciprofloxacin',  'Theophylline',           'MODERATE', 'Theophylline toxicity'),
('Warfarin',       'Amiodarone',             'SEVERE',   'Increased INR / bleeding risk'),
('Lisinopril',     'Ibuprofen',              'MODERATE', 'Reduced antihypertensive effect (ACE inhibitor + NSAID)'),
('Digoxin',        'Amiodarone',             'SEVERE',   'Digoxin toxicity'),
('Penicillin',     'Methotrexate',           'MODERATE', 'Reduced methotrexate clearance'),
('Fluoxetine',     'Tramadol',               'SEVERE',   'Serotonin syndrome and seizure risk'),
('Lithium',        'Ibuprofen',              'MODERATE', 'Increased lithium levels (Lithium + NSAID)'),
('Clopidogrel',    'Omeprazole',             'MODERATE', 'Reduced antiplatelet effect'),
('Metronidazole',  'Alcohol',                'SEVERE',   'Disulfiram-like reaction')
ON CONFLICT ON CONSTRAINT uq_drug_interaction_pair DO NOTHING;
