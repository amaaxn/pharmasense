-- PharmaSense — Demo Visit & Prescription Seed Data (Part 6 §6.1)
-- Pre-existing visits so the dashboard has history on first load.

-- ============================================================
-- Visit 1: Maria Lopez — completed visit, approved Azithromycin
-- ============================================================
INSERT INTO visits (id, patient_id, clinician_id, status, chief_complaint, notes, created_at)
VALUES (
    'b1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    'completed',
    'Sore throat, likely strep',
    'Patient presents with sore throat for 3 days. History of penicillin allergy. Currently on Metformin and Lisinopril.',
    NOW() - INTERVAL '2 days'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO prescriptions (id, visit_id, patient_id, clinician_id, status, approved_at, created_at)
VALUES (
    'd1111111-1111-1111-1111-111111111111',
    'b1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    'approved',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO prescription_items (id, prescription_id, drug_name, generic_name, dosage, frequency, duration, tier, copay, is_covered)
VALUES (
    'de111111-1111-1111-1111-111111111111',
    'd1111111-1111-1111-1111-111111111111',
    'Azithromycin', 'azithromycin',
    '250mg', 'once daily', '5 days',
    1, 10.00, TRUE
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Visit 2: James Chen — completed visit, approved Metformin dose adjustment
-- ============================================================
INSERT INTO visits (id, patient_id, clinician_id, status, chief_complaint, notes, created_at)
VALUES (
    'b2222222-2222-2222-2222-222222222222',
    'a2222222-2222-2222-2222-222222222222',
    'c1111111-1111-1111-1111-111111111111',
    'completed',
    'Diabetes follow-up, A1C review',
    'Patient A1C at 7.8%, needs dose adjustment. On Warfarin for AFib — avoid aspirin-containing drugs.',
    NOW() - INTERVAL '5 days'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO prescriptions (id, visit_id, patient_id, clinician_id, status, approved_at, created_at)
VALUES (
    'd2222222-2222-2222-2222-222222222222',
    'b2222222-2222-2222-2222-222222222222',
    'a2222222-2222-2222-2222-222222222222',
    'c1111111-1111-1111-1111-111111111111',
    'approved',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO prescription_items (id, prescription_id, drug_name, generic_name, dosage, frequency, duration, tier, copay, is_covered)
VALUES (
    'de222222-2222-2222-2222-222222222222',
    'd2222222-2222-2222-2222-222222222222',
    'Jardiance', 'empagliflozin',
    '25mg', 'once daily', '90 days',
    3, 65.00, TRUE
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Visit 3: Sofia Rivera — completed visit, approved Omeprazole
-- ============================================================
INSERT INTO visits (id, patient_id, clinician_id, status, chief_complaint, notes, created_at)
VALUES (
    'b3333333-3333-3333-3333-333333333333',
    'a3333333-3333-3333-3333-333333333333',
    'c1111111-1111-1111-1111-111111111111',
    'completed',
    'Acid reflux, heartburn',
    'Patient reports persistent heartburn for 2 weeks. No allergies, no current meds. Clean approval path.',
    NOW() - INTERVAL '1 day'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO prescriptions (id, visit_id, patient_id, clinician_id, status, approved_at, created_at)
VALUES (
    'd3333333-3333-3333-3333-333333333333',
    'b3333333-3333-3333-3333-333333333333',
    'a3333333-3333-3333-3333-333333333333',
    'c1111111-1111-1111-1111-111111111111',
    'approved',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO prescription_items (id, prescription_id, drug_name, generic_name, dosage, frequency, duration, tier, copay, is_covered)
VALUES (
    'de333333-3333-3333-3333-333333333333',
    'd3333333-3333-3333-3333-333333333333',
    'Omeprazole', 'omeprazole',
    '20mg', 'once daily', '14 days',
    1, 8.00, TRUE
) ON CONFLICT (id) DO NOTHING;
