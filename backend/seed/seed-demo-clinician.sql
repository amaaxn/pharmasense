-- PharmaSense — Demo Clinician Seed Data (Part 6 §6.3)
-- Login as dr.smith during demo.

INSERT INTO clinicians (id, user_id, first_name, last_name, npi_number, specialty)
VALUES (
    'c1111111-1111-1111-1111-111111111111',
    'uc111111-1111-1111-1111-111111111111',
    'Alex', 'Smith',
    '1234567890',
    'Internal Medicine'
) ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    specialty = EXCLUDED.specialty;
