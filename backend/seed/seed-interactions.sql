-- PharmaSense — Drug Interaction Seed Data (15 interaction pairs)
-- Columns aligned with §7.1: drug_a, drug_b, severity, description, source

INSERT INTO drug_interactions (drug_a, drug_b, severity, description, source) VALUES
('Warfarin',       'Aspirin',                'SEVERE',   'Increased bleeding risk',                               'FDA Drug Safety'),
('Lisinopril',     'Potassium supplements',  'MODERATE', 'Risk of hyperkalemia',                                  'FDA Drug Safety'),
('Metformin',      'Contrast dye',           'SEVERE',   'Risk of lactic acidosis',                               'FDA Drug Safety'),
('Sertraline',     'Phenelzine',             'SEVERE',   'Serotonin syndrome risk (SSRI + MAOI)',                 'FDA Drug Safety'),
('Amoxicillin',    'Methotrexate',           'MODERATE', 'Increased methotrexate toxicity',                       'FDA Drug Safety'),
('Simvastatin',    'Erythromycin',           'SEVERE',   'Rhabdomyolysis risk',                                   'FDA Drug Safety'),
('Ciprofloxacin',  'Theophylline',           'MODERATE', 'Theophylline toxicity',                                 'FDA Drug Safety'),
('Warfarin',       'Amiodarone',             'SEVERE',   'Increased INR / bleeding risk',                         'FDA Drug Safety'),
('Lisinopril',     'Ibuprofen',              'MODERATE', 'Reduced antihypertensive effect (ACE inhibitor + NSAID)', 'FDA Drug Safety'),
('Digoxin',        'Amiodarone',             'SEVERE',   'Digoxin toxicity',                                      'FDA Drug Safety'),
('Penicillin',     'Methotrexate',           'MODERATE', 'Reduced methotrexate clearance',                        'FDA Drug Safety'),
('Fluoxetine',     'Tramadol',               'SEVERE',   'Serotonin syndrome and seizure risk',                   'FDA Drug Safety'),
('Lithium',        'Ibuprofen',              'MODERATE', 'Increased lithium levels (Lithium + NSAID)',             'FDA Drug Safety'),
('Clopidogrel',    'Omeprazole',             'MODERATE', 'Reduced antiplatelet effect',                            'FDA Drug Safety'),
('Metronidazole',  'Alcohol',                'SEVERE',   'Disulfiram-like reaction',                              'FDA Drug Safety')
ON CONFLICT ON CONSTRAINT uq_drug_interaction_pair DO NOTHING;
