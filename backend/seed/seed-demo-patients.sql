-- PharmaSense — Demo Patient Seed Data (Part 6 §6.2)

-- Patient 1: Maria Lopez (Allergy + interaction demo)
-- Penicillin allergy triggers BLOCKED on Amoxicillin (drug class cross-reactivity).
-- Current Lisinopril + proposed NSAID triggers interaction warning.
INSERT INTO patients (id, user_id, first_name, last_name, date_of_birth, allergies, current_medications, insurance_plan, insurance_member_id, medical_history)
VALUES (
    'a1111111-1111-1111-1111-111111111111',
    'u1111111-1111-1111-1111-111111111111',
    'Maria', 'Lopez',
    '1985-03-15',
    '["Penicillin", "Sulfa drugs"]',
    '["Lisinopril 20mg daily", "Metformin 500mg twice daily"]',
    'BlueCross PPO Gold',
    'BC-2024-00101',
    'Type 2 diabetes, hypertension. History of penicillin allergy (rash). Sulfa allergy (hives).'
) ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    allergies = EXCLUDED.allergies,
    current_medications = EXCLUDED.current_medications,
    medical_history = EXCLUDED.medical_history;

-- Patient 2: James Chen (Multi-drug, interaction-heavy)
-- Warfarin + Aspirin triggers SEVERE interaction block.
-- Multiple current medications test duplicate therapy checks.
INSERT INTO patients (id, user_id, first_name, last_name, date_of_birth, allergies, current_medications, insurance_plan, insurance_member_id, medical_history)
VALUES (
    'a2222222-2222-2222-2222-222222222222',
    'u2222222-2222-2222-2222-222222222222',
    'James', 'Chen',
    '1958-11-02',
    '[]',
    '["Warfarin 5mg daily", "Metformin 1000mg twice daily", "Atorvastatin 40mg daily", "Metoprolol 50mg daily", "Jardiance 10mg daily"]',
    'Aetna HMO Select',
    'AE-2024-55032',
    'Atrial fibrillation (on Warfarin), Type 2 diabetes, hyperlipidemia, heart failure.'
) ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    allergies = EXCLUDED.allergies,
    current_medications = EXCLUDED.current_medications,
    medical_history = EXCLUDED.medical_history;

-- Patient 3: Sofia Rivera (Clean path, Spanish language)
-- No allergies, no current meds → clean approval path.
-- Spanish language → demonstrates i18n and Spanish voice pack.
INSERT INTO patients (id, user_id, first_name, last_name, date_of_birth, allergies, current_medications, insurance_plan, insurance_member_id, medical_history)
VALUES (
    'a3333333-3333-3333-3333-333333333333',
    'u3333333-3333-3333-3333-333333333333',
    'Sofia', 'Rivera',
    '1995-07-22',
    '[]',
    '[]',
    'UnitedHealth Basic',
    'UH-2024-78901',
    'No significant medical history. Preferred language: Spanish.'
) ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    allergies = EXCLUDED.allergies,
    current_medications = EXCLUDED.current_medications,
    medical_history = EXCLUDED.medical_history;
