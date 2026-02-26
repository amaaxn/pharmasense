-- PharmaSense — Pre-seeded Analytics Events (Part 6 §6.4)
--
-- Expected dashboard results:
--   Total visits: 4
--   Total copay saved: $177
--   Safety blocks: 3 (2 allergy, 1 interaction)
--   Avg time per visit: 7 min
--   Adherence risk: Jardiance at HIGH_RISK ($65 copay)

-- ============================================================
-- VISIT_CREATED events (4 visits)
-- ============================================================
INSERT INTO analytics_events (id, event_type, event_data, created_at) VALUES
('e0000001-0001-0001-0001-000000000001', 'VISIT_CREATED',
 '{"visitId": "b1111111-1111-1111-1111-111111111111", "patientId": "a1111111-1111-1111-1111-111111111111", "clinicianId": "c1111111-1111-1111-1111-111111111111"}',
 NOW() - INTERVAL '5 days'),

('e0000001-0001-0001-0001-000000000002', 'VISIT_CREATED',
 '{"visitId": "b2222222-2222-2222-2222-222222222222", "patientId": "a2222222-2222-2222-2222-222222222222", "clinicianId": "c1111111-1111-1111-1111-111111111111"}',
 NOW() - INTERVAL '4 days'),

('e0000001-0001-0001-0001-000000000003', 'VISIT_CREATED',
 '{"visitId": "b3333333-3333-3333-3333-333333333333", "patientId": "a3333333-3333-3333-3333-333333333333", "clinicianId": "c1111111-1111-1111-1111-111111111111"}',
 NOW() - INTERVAL '2 days'),

('e0000001-0001-0001-0001-000000000004', 'VISIT_CREATED',
 '{"visitId": "b4444444-4444-4444-4444-444444444444", "patientId": "a1111111-1111-1111-1111-111111111111", "clinicianId": "c1111111-1111-1111-1111-111111111111"}',
 NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- VISIT_COMPLETED events (4 visits, avg 7 min)
-- Durations: 6, 8, 5, 9 → avg = 7.0
-- ============================================================
INSERT INTO analytics_events (id, event_type, event_data, created_at) VALUES
('e0000002-0002-0002-0002-000000000001', 'VISIT_COMPLETED',
 '{"visitId": "b1111111-1111-1111-1111-111111111111", "patientId": "a1111111-1111-1111-1111-111111111111", "clinicianId": "c1111111-1111-1111-1111-111111111111", "durationMinutes": 6, "prescriptionsCount": 1}',
 NOW() - INTERVAL '5 days'),

('e0000002-0002-0002-0002-000000000002', 'VISIT_COMPLETED',
 '{"visitId": "b2222222-2222-2222-2222-222222222222", "patientId": "a2222222-2222-2222-2222-222222222222", "clinicianId": "c1111111-1111-1111-1111-111111111111", "durationMinutes": 8, "prescriptionsCount": 2}',
 NOW() - INTERVAL '4 days'),

('e0000002-0002-0002-0002-000000000003', 'VISIT_COMPLETED',
 '{"visitId": "b3333333-3333-3333-3333-333333333333", "patientId": "a3333333-3333-3333-3333-333333333333", "clinicianId": "c1111111-1111-1111-1111-111111111111", "durationMinutes": 5, "prescriptionsCount": 1}',
 NOW() - INTERVAL '2 days'),

('e0000002-0002-0002-0002-000000000004', 'VISIT_COMPLETED',
 '{"visitId": "b4444444-4444-4444-4444-444444444444", "patientId": "a1111111-1111-1111-1111-111111111111", "clinicianId": "c1111111-1111-1111-1111-111111111111", "durationMinutes": 9, "prescriptionsCount": 1}',
 NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- RECOMMENDATION_GENERATED events
-- ============================================================
INSERT INTO analytics_events (id, event_type, event_data, created_at) VALUES
('e0000003-0003-0003-0003-000000000001', 'RECOMMENDATION_GENERATED',
 '{"visitId": "b1111111-1111-1111-1111-111111111111", "totalOptions": 3, "blockedCount": 1, "warningCount": 1}',
 NOW() - INTERVAL '5 days'),

('e0000003-0003-0003-0003-000000000002', 'RECOMMENDATION_GENERATED',
 '{"visitId": "b2222222-2222-2222-2222-222222222222", "totalOptions": 3, "blockedCount": 1, "warningCount": 0}',
 NOW() - INTERVAL '4 days'),

('e0000003-0003-0003-0003-000000000003', 'RECOMMENDATION_GENERATED',
 '{"visitId": "b3333333-3333-3333-3333-333333333333", "totalOptions": 3, "blockedCount": 0, "warningCount": 0}',
 NOW() - INTERVAL '2 days'),

('e0000003-0003-0003-0003-000000000004', 'RECOMMENDATION_GENERATED',
 '{"visitId": "b4444444-4444-4444-4444-444444444444", "totalOptions": 3, "blockedCount": 1, "warningCount": 1}',
 NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- OPTION_BLOCKED events (3 total: 2 allergy, 1 interaction)
-- ============================================================
INSERT INTO analytics_events (id, event_type, event_data, created_at) VALUES
('e0000004-0004-0004-0004-000000000001', 'OPTION_BLOCKED',
 '{"visitId": "b1111111-1111-1111-1111-111111111111", "medication": "Amoxicillin", "reason": "ALLERGY: Patient allergic to Penicillin — Amoxicillin is in the penicillin drug class", "blockType": "ALLERGY"}',
 NOW() - INTERVAL '5 days'),

('e0000004-0004-0004-0004-000000000002', 'OPTION_BLOCKED',
 '{"visitId": "b2222222-2222-2222-2222-222222222222", "medication": "Aspirin", "reason": "INTERACTION: Severe interaction with Warfarin — increased bleeding risk", "blockType": "INTERACTION"}',
 NOW() - INTERVAL '4 days'),

('e0000004-0004-0004-0004-000000000003', 'OPTION_BLOCKED',
 '{"visitId": "b4444444-4444-4444-4444-444444444444", "medication": "Penicillin V", "reason": "ALLERGY: Patient allergic to Penicillin — direct match", "blockType": "ALLERGY"}',
 NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- OPTION_APPROVED events (5 total)
-- copayDelta values: 55, 42, 30, 25, 25 → total $177
-- ============================================================
INSERT INTO analytics_events (id, event_type, event_data, created_at) VALUES
('e0000005-0005-0005-0005-000000000001', 'OPTION_APPROVED',
 '{"prescriptionId": "d1111111-1111-1111-1111-111111111111", "medication": "Azithromycin", "copay": 10, "copayDelta": 55, "coverageStatus": "COVERED", "tier": 1, "visitId": "b1111111-1111-1111-1111-111111111111"}',
 NOW() - INTERVAL '5 days'),

('e0000005-0005-0005-0005-000000000002', 'OPTION_APPROVED',
 '{"prescriptionId": "d2222222-2222-2222-2222-222222222222", "medication": "Jardiance", "copay": 65, "copayDelta": 42, "coverageStatus": "COVERED", "tier": 3, "visitId": "b2222222-2222-2222-2222-222222222222"}',
 NOW() - INTERVAL '4 days'),

('e0000005-0005-0005-0005-000000000003', 'OPTION_APPROVED',
 '{"prescriptionId": "d3333333-3333-3333-3333-333333333333", "medication": "Omeprazole", "copay": 8, "copayDelta": 30, "coverageStatus": "COVERED", "tier": 1, "visitId": "b3333333-3333-3333-3333-333333333333"}',
 NOW() - INTERVAL '2 days'),

('e0000005-0005-0005-0005-000000000004', 'OPTION_APPROVED',
 '{"prescriptionId": "d4444444-4444-4444-4444-444444444444", "medication": "Metformin", "copay": 5, "copayDelta": 25, "coverageStatus": "COVERED", "tier": 1, "visitId": "b4444444-4444-4444-4444-444444444444"}',
 NOW() - INTERVAL '1 day'),

('e0000005-0005-0005-0005-000000000005', 'OPTION_APPROVED',
 '{"prescriptionId": "d5555555-5555-5555-5555-555555555555", "medication": "Atorvastatin", "copay": 20, "copayDelta": 25, "coverageStatus": "COVERED", "tier": 2, "visitId": "b2222222-2222-2222-2222-222222222222"}',
 NOW() - INTERVAL '4 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- OPTION_REJECTED events (1)
-- ============================================================
INSERT INTO analytics_events (id, event_type, event_data, created_at) VALUES
('e0000006-0006-0006-0006-000000000001', 'OPTION_REJECTED',
 '{"prescriptionId": "d6666666-6666-6666-6666-666666666666", "medication": "Ozempic", "reason": "Patient declined due to cost — prior auth required"}',
 NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- VOICE_PACK_GENERATED events (2)
-- ============================================================
INSERT INTO analytics_events (id, event_type, event_data, created_at) VALUES
('e0000007-0007-0007-0007-000000000001', 'VOICE_PACK_GENERATED',
 '{"prescriptionId": "d1111111-1111-1111-1111-111111111111", "language": "en", "durationSeconds": 42.5}',
 NOW() - INTERVAL '5 days'),

('e0000007-0007-0007-0007-000000000002', 'VOICE_PACK_GENERATED',
 '{"prescriptionId": "d3333333-3333-3333-3333-333333333333", "language": "es", "durationSeconds": 38.2}',
 NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PATIENT_PACK_VIEWED events (2)
-- ============================================================
INSERT INTO analytics_events (id, event_type, event_data, created_at) VALUES
('e0000008-0008-0008-0008-000000000001', 'PATIENT_PACK_VIEWED',
 '{"prescriptionId": "d1111111-1111-1111-1111-111111111111", "patientId": "a1111111-1111-1111-1111-111111111111"}',
 NOW() - INTERVAL '4 days'),

('e0000008-0008-0008-0008-000000000002', 'PATIENT_PACK_VIEWED',
 '{"prescriptionId": "d3333333-3333-3333-3333-333333333333", "patientId": "a3333333-3333-3333-3333-333333333333"}',
 NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;
