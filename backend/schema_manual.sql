-- PharmaSense — run this in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- patients
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  allergies JSONB NOT NULL DEFAULT '[]',
  current_medications JSONB NOT NULL DEFAULT '[]',
  insurance_plan VARCHAR(200) NOT NULL DEFAULT '',
  insurance_member_id VARCHAR(100) NOT NULL DEFAULT '',
  medical_history TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- clinicians
CREATE TABLE IF NOT EXISTS clinicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  npi_number VARCHAR(20) UNIQUE NOT NULL,
  specialty VARCHAR(200) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- visits
CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  clinician_id UUID NOT NULL REFERENCES clinicians(id),
  status VARCHAR(30) NOT NULL DEFAULT 'in_progress',
  chief_complaint TEXT,
  notes TEXT,
  drawing_data JSONB,
  extracted_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_visits_patient_id ON visits(patient_id);
CREATE INDEX IF NOT EXISTS ix_visits_clinician_id ON visits(clinician_id);

-- prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  clinician_id UUID NOT NULL REFERENCES clinicians(id),
  status VARCHAR(30) NOT NULL DEFAULT 'recommended',
  rejection_reason TEXT,
  approved_at TIMESTAMPTZ,
  safety_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_prescriptions_visit_id ON prescriptions(visit_id);
CREATE INDEX IF NOT EXISTS ix_prescriptions_patient_id ON prescriptions(patient_id);

-- prescription_items
CREATE TABLE IF NOT EXISTS prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id),
  drug_name VARCHAR(200) NOT NULL,
  generic_name VARCHAR(200) NOT NULL DEFAULT '',
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(100) NOT NULL,
  duration VARCHAR(100) NOT NULL DEFAULT '',
  route VARCHAR(50) NOT NULL DEFAULT 'oral',
  tier INTEGER,
  copay NUMERIC(10,2),
  is_covered BOOLEAN NOT NULL DEFAULT true,
  requires_prior_auth BOOLEAN NOT NULL DEFAULT false,
  safety_flags JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_prescription_items_prescription_id ON prescription_items(prescription_id);

-- formulary_entries
CREATE TABLE IF NOT EXISTS formulary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name VARCHAR(200) NOT NULL DEFAULT '',
  medication_name VARCHAR(200) NOT NULL,
  generic_name VARCHAR(200) NOT NULL DEFAULT '',
  tier INTEGER NOT NULL,
  copay NUMERIC(10,2) NOT NULL DEFAULT 0,
  covered BOOLEAN NOT NULL DEFAULT true,
  prior_auth_required BOOLEAN NOT NULL DEFAULT false,
  quantity_limit VARCHAR(200) NOT NULL DEFAULT '',
  step_therapy_required BOOLEAN NOT NULL DEFAULT false,
  alternatives_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_formulary_entries_plan_name ON formulary_entries(plan_name);
CREATE INDEX IF NOT EXISTS ix_formulary_entries_medication_name ON formulary_entries(medication_name);

-- drug_interactions
CREATE TABLE IF NOT EXISTS drug_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_a VARCHAR(200) NOT NULL,
  drug_b VARCHAR(200) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  description TEXT NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_drug_interaction_pair UNIQUE(drug_a, drug_b)
);

-- dose_ranges
CREATE TABLE IF NOT EXISTS dose_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_name VARCHAR(200) NOT NULL,
  min_dose_mg FLOAT NOT NULL,
  max_dose_mg FLOAT NOT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'mg',
  frequency VARCHAR(50) NOT NULL DEFAULT 'once daily',
  population VARCHAR(50) NOT NULL DEFAULT 'adult',
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- safety_checks
CREATE TABLE IF NOT EXISTS safety_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id),
  check_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  medication_name VARCHAR(200) NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  blocking BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_safety_checks_prescription_id ON safety_checks(prescription_id);

-- analytics_events
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  user_id UUID,
  session_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS ix_analytics_events_created_at ON analytics_events(created_at);

-- alembic version stamp
CREATE TABLE IF NOT EXISTS alembic_version (
  version_num VARCHAR(32) NOT NULL,
  CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);
INSERT INTO alembic_version VALUES ('0001') ON CONFLICT DO NOTHING;

SELECT 'All tables created successfully' AS result;
