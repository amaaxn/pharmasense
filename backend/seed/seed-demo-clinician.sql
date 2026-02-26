-- PharmaSense — Demo Clinician Seed Data (Part 6 §6.3)
-- Login as dr.smith during demo.

-- Clean up stale data referencing the old clinician with same NPI
DO $$
DECLARE
    old_id UUID;
BEGIN
    SELECT id INTO old_id FROM clinicians WHERE npi_number = '1234567890' AND id != 'c1111111-1111-1111-1111-111111111111';
    IF old_id IS NOT NULL THEN
        DELETE FROM prescription_items WHERE prescription_id IN (SELECT id FROM prescriptions WHERE clinician_id = old_id);
        DELETE FROM prescriptions WHERE clinician_id = old_id;
        DELETE FROM visits WHERE clinician_id = old_id;
        DELETE FROM clinicians WHERE id = old_id;
    END IF;
END $$;

INSERT INTO clinicians (id, user_id, first_name, last_name, npi_number, specialty)
VALUES (
    'c1111111-1111-1111-1111-111111111111',
    'fc111111-1111-1111-1111-111111111111',
    'Alex', 'Smith',
    '1234567890',
    'Internal Medicine'
) ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    specialty = EXCLUDED.specialty;
