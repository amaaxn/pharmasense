-- PharmaSense — Demo Patient & Clinician Seed Data

-- Patient 1: Multiple allergies, current medications (allergy/interaction demo)
INSERT INTO patients (id, user_id, first_name, last_name, date_of_birth, allergies, current_medications, insurance_plan, insurance_member_id)
VALUES (
    'a1111111-1111-1111-1111-111111111111',
    'u1111111-1111-1111-1111-111111111111',
    'Maria', 'Santos',
    '1985-03-15',
    '["penicillin", "sulfa drugs"]',
    '["Lisinopril 10mg daily", "Metformin 500mg twice daily"]',
    'BlueCross PPO Gold',
    'BC-2024-00101'
) ON CONFLICT (id) DO NOTHING;

-- Patient 2: Diabetes + heart condition, multiple drugs (interaction demo)
INSERT INTO patients (id, user_id, first_name, last_name, date_of_birth, allergies, current_medications, insurance_plan, insurance_member_id)
VALUES (
    'a2222222-2222-2222-2222-222222222222',
    'u2222222-2222-2222-2222-222222222222',
    'James', 'Thompson',
    '1958-11-02',
    '[]',
    '["Metformin 1000mg twice daily", "Eliquis 5mg twice daily", "Atorvastatin 40mg daily", "Metoprolol 50mg daily", "Jardiance 10mg daily"]',
    'Aetna HMO Select',
    'AE-2024-55032'
) ON CONFLICT (id) DO NOTHING;

-- Patient 3: No allergies, basic insurance (clean path demo)
INSERT INTO patients (id, user_id, first_name, last_name, date_of_birth, allergies, current_medications, insurance_plan, insurance_member_id)
VALUES (
    'a3333333-3333-3333-3333-333333333333',
    'u3333333-3333-3333-3333-333333333333',
    'Aisha', 'Patel',
    '1995-07-22',
    '[]',
    '[]',
    'UnitedHealth Basic',
    'UH-2024-78901'
) ON CONFLICT (id) DO NOTHING;

-- Demo clinician
INSERT INTO clinicians (id, user_id, first_name, last_name, npi_number, specialty)
VALUES (
    'c1111111-1111-1111-1111-111111111111',
    'uc111111-1111-1111-1111-111111111111',
    'Dr. Sarah', 'Chen',
    '1234567890',
    'Internal Medicine'
) ON CONFLICT (id) DO NOTHING;
