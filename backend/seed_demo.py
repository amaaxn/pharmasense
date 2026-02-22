"""
Seed realistic demo data: patients, visits, prescriptions, and analytics events.
Run from the backend directory:
    python seed_demo.py
"""

from __future__ import annotations

import asyncio
import json
import random
import uuid
from datetime import datetime, timedelta, timezone

import httpx

# ── Load settings ─────────────────────────────────────────────────────────────
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from pharmasense.config import settings

SUPA_URL  = settings.supabase_url.rstrip("/") + "/rest/v1"
SUPA_KEY  = settings.supabase_service_role_key
HEADERS   = {
    "apikey": SUPA_KEY,
    "Authorization": f"Bearer {SUPA_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# ── Helpers ────────────────────────────────────────────────────────────────────

async def post(client: httpx.AsyncClient, table: str, data: dict) -> dict:
    r = await client.post(f"{SUPA_URL}/{table}", json=data, headers=HEADERS)
    if r.status_code not in (200, 201):
        print(f"  ERROR inserting into {table}: {r.status_code} {r.text[:200]}")
        return {}
    body = r.json()
    return body[0] if isinstance(body, list) else body

async def select(client: httpx.AsyncClient, table: str, params: dict | None = None) -> list[dict]:
    p = {"select": "*", **(params or {})}
    r = await client.get(f"{SUPA_URL}/{table}", params=p, headers=HEADERS)
    if r.status_code != 200:
        print(f"  ERROR selecting from {table}: {r.status_code} {r.text[:200]}")
        return []
    return r.json()

def ts(days_ago: float = 0, hour: int = 9, minute: int = 0) -> str:
    t = datetime.now(timezone.utc) - timedelta(days=days_ago)
    return t.replace(hour=hour, minute=minute, second=0, microsecond=0).isoformat()

# ── Seed data ──────────────────────────────────────────────────────────────────

PATIENTS = [
    {
        "first_name": "Emily",  "last_name": "Chen",
        "date_of_birth": "1985-03-15",
        "allergies": ["Penicillin"],
        "insurance_plan": "BlueCross Preferred",
        "insurance_member_id": "BC-100432",
        "medical_history": "Hypertension, Type 2 Diabetes. Non-smoker.",
    },
    {
        "first_name": "Marcus", "last_name": "Johnson",
        "date_of_birth": "1972-07-22",
        "allergies": [],
        "insurance_plan": "Aetna Select",
        "insurance_member_id": "AE-887721",
        "medical_history": "Hyperlipidemia, Coronary Artery Disease. Prior MI 2019.",
    },
    {
        "first_name": "Sophia", "last_name": "Williams",
        "date_of_birth": "1990-11-08",
        "allergies": ["Sulfa"],
        "insurance_plan": "United Gold",
        "insurance_member_id": "UH-334567",
        "medical_history": "Major Depressive Disorder, GERD. No prior hospitalizations.",
    },
    {
        "first_name": "David",  "last_name": "Kim",
        "date_of_birth": "1968-04-30",
        "allergies": ["Aspirin"],
        "insurance_plan": "Cigna HMO",
        "insurance_member_id": "CG-219043",
        "medical_history": "Hypertension, Hypothyroidism. Well-controlled on current regimen.",
    },
    {
        "first_name": "Aisha",  "last_name": "Patel",
        "date_of_birth": "1995-08-19",
        "allergies": ["Latex", "Codeine"],
        "insurance_plan": "Medicaid Plus",
        "insurance_member_id": "MC-678901",
        "medical_history": "Asthma, Generalized Anxiety Disorder. No known drug allergies except listed.",
    },
]

# (drug_name, generic_name, dosage, frequency, duration, route, tier, copay, is_covered, coverage_status)
DRUG_CATALOG = [
    ("Lisinopril",        "lisinopril",        "10 mg",  "once daily",   "90 days", "oral",       1,  5.00, True,  "TIER_1"),
    ("Metformin",         "metformin HCl",     "500 mg", "twice daily",  "90 days", "oral",       1, 10.00, True,  "TIER_1"),
    ("Atorvastatin",      "atorvastatin",      "40 mg",  "once daily",   "90 days", "oral",       2, 25.00, True,  "TIER_2"),
    ("Sertraline",        "sertraline HCl",    "50 mg",  "once daily",   "60 days", "oral",       2, 30.00, True,  "TIER_2"),
    ("Omeprazole",        "omeprazole",        "20 mg",  "once daily",   "30 days", "oral",       1,  8.00, True,  "TIER_1"),
    ("Amlodipine",        "amlodipine",        "5 mg",   "once daily",   "90 days", "oral",       1, 12.00, True,  "TIER_1"),
    ("Levothyroxine",     "levothyroxine",     "50 mcg", "once daily",   "90 days", "oral",       1, 15.00, True,  "TIER_1"),
    ("Gabapentin",        "gabapentin",        "300 mg", "3× daily",     "30 days", "oral",       3, 55.00, True,  "TIER_3"),
    ("Duloxetine",        "duloxetine HCl",    "60 mg",  "once daily",   "30 days", "oral",       3, 60.00, True,  "TIER_3"),
    ("Albuterol Inhaler", "albuterol sulfate", "90 mcg", "as needed",    "30 days", "inhalation", 2, 20.00, True,  "TIER_2"),
    ("Fluticasone",       "fluticasone prop.", "50 mcg", "twice daily",  "30 days", "inhalation", 2, 35.00, True,  "TIER_2"),
    ("Pantoprazole",      "pantoprazole",      "40 mg",  "once daily",   "30 days", "oral",       2, 18.00, True,  "TIER_2"),
    ("Escitalopram",      "escitalopram",      "10 mg",  "once daily",   "30 days", "oral",       2, 28.00, True,  "TIER_2"),
]

# Visit scenarios: (chief_complaint, notes, drugs_indices, duration_minutes)
VISIT_SCENARIOS = [
    (
        "Routine HTN follow-up",
        "Patient reports BP has been 145/90 at home. Currently on lisinopril, tolerating well. Denies chest pain, SOB.",
        [0, 5],  # Lisinopril + Amlodipine
        12,
    ),
    (
        "T2DM management",
        "HbA1c 7.8%. Patient struggling with diet compliance. Fasting glucose averaging 180 mg/dL. Feet exam normal.",
        [1],  # Metformin
        18,
    ),
    (
        "Hyperlipidemia review",
        "LDL 142, total cholesterol 210. Patient declines lifestyle intervention alone. No muscle complaints.",
        [2],  # Atorvastatin
        10,
    ),
    (
        "Depression screening positive",
        "PHQ-9 score 14. Patient reports persistent low mood × 6 weeks, sleep disruption, anhedonia. No SI.",
        [3, 12],  # Sertraline + Escitalopram alt
        25,
    ),
    (
        "GERD flare",
        "Heartburn 4–5×/week, worsening with spicy foods. No dysphagia or alarm symptoms. Trial of OTC PPI insufficient.",
        [4, 11],  # Omeprazole + Pantoprazole
        15,
    ),
    (
        "Hypothyroidism management",
        "TSH 8.2. Patient fatigued, cold intolerance, constipation. Previously on 25 mcg, now increasing dose.",
        [6],  # Levothyroxine
        14,
    ),
    (
        "Neuropathic pain",
        "Diabetic peripheral neuropathy. Burning pain feet/legs, worse at night, interfering with sleep. NRS 6/10.",
        [7],  # Gabapentin
        20,
    ),
    (
        "Anxiety & depression",
        "GAD-7 score 12. Patient also has mild MDD. Prefers single agent. No prior psychiatric medications.",
        [8],  # Duloxetine
        22,
    ),
    (
        "Asthma exacerbation",
        "Increased rescue inhaler use × 2 weeks. Nighttime symptoms. PEFR 68% predicted. Work exposure suspected.",
        [9, 10],  # Albuterol + Fluticasone
        16,
    ),
    (
        "Annual wellness visit",
        "No acute complaints. Preventive labs ordered. BP 128/82. BMI 26.4. Vaccines updated.",
        [0, 2],  # Lisinopril + Atorvastatin
        30,
    ),
]


async def main() -> None:
    async with httpx.AsyncClient(timeout=30.0) as client:
        # ── Get existing clinician ─────────────────────────────────────────────
        clinicians = await select(client, "clinicians")
        if not clinicians:
            print("No clinician found. Make sure clinician@pharmasense.dev is set up.")
            return
        clinician = clinicians[0]
        clinician_id = clinician["id"]
        print(f"Using clinician: {clinician.get('first_name', '')} {clinician.get('last_name', '')} ({clinician_id})")

        # ── Clear existing seed data (optional — idempotent) ──────────────────
        print("\nCleaning up previous seed data from analytics_events...")
        await client.delete(
            f"{SUPA_URL}/analytics_events",
            params={"event_type": "neq.NEVER_DELETE_THIS"},
            headers=HEADERS,
        )

        # ── Create patients ────────────────────────────────────────────────────
        print("\nCreating patients...")
        patient_ids: list[str] = []
        for p_data in PATIENTS:
            fake_user_id = str(uuid.uuid4())
            row = await post(client, "patients", {
                "user_id": fake_user_id,
                "first_name": p_data["first_name"],
                "last_name": p_data["last_name"],
                "date_of_birth": p_data["date_of_birth"],
                "allergies": p_data["allergies"],
                "insurance_plan": p_data["insurance_plan"],
                "insurance_member_id": p_data["insurance_member_id"],
                "medical_history": p_data["medical_history"],
            })
            if row.get("id"):
                patient_ids.append(row["id"])
                print(f"  ✓ Patient: {p_data['first_name']} {p_data['last_name']} ({row['id'][:8]}…)")
            else:
                print(f"  ✗ Failed to create patient {p_data['first_name']}")

        if not patient_ids:
            print("No patients created. Aborting.")
            return

        # ── Create visits, prescriptions, prescription_items, events ──────────
        print("\nCreating visits, prescriptions, and analytics events...")

        total_visits = 0
        total_prescriptions = 0
        total_events = 0

        # Assign ~2 scenarios per patient, spread over last 30 days
        scenario_pool = VISIT_SCENARIOS.copy()
        random.shuffle(scenario_pool)

        analytics_batch: list[dict] = []

        for idx, patient_id in enumerate(patient_ids):
            # 2 completed + 1 in_progress per patient
            patient_scenarios = scenario_pool[idx * 2: idx * 2 + 2]
            if not patient_scenarios:
                patient_scenarios = [VISIT_SCENARIOS[idx % len(VISIT_SCENARIOS)]]

            for s_idx, scenario in enumerate(patient_scenarios):
                chief, notes, drug_indices, duration = scenario
                days_ago = (idx * 6) + (s_idx * 3) + 1  # spread over past month
                visit_hour = 9 + (s_idx * 2)
                is_completed = s_idx == 0  # first scenario = completed, second = in_progress

                visit_row = await post(client, "visits", {
                    "patient_id": patient_id,
                    "clinician_id": clinician_id,
                    "status": "completed" if is_completed else "in_progress",
                    "chief_complaint": chief,
                    "notes": notes,
                    "created_at": ts(days_ago, visit_hour, 0),
                    "updated_at": ts(days_ago, visit_hour, duration),
                })
                if not visit_row.get("id"):
                    print(f"  ✗ Failed to create visit for patient {patient_id[:8]}")
                    continue

                visit_id = visit_row["id"]
                total_visits += 1

                # Analytics: VISIT_CREATED
                visit_created_at = ts(days_ago, visit_hour, 0)
                analytics_batch.append({
                    "event_type": "VISIT_CREATED",
                    "event_data": {"visitId": visit_id, "patientId": patient_id},
                    "user_id": None,
                    "session_id": f"seed-session-{idx}",
                    "created_at": visit_created_at,
                })

                if not is_completed:
                    continue  # no prescriptions for in-progress visits

                # Pick drugs for this visit
                drugs = [DRUG_CATALOG[i] for i in drug_indices if i < len(DRUG_CATALOG)]
                if not drugs:
                    drugs = [DRUG_CATALOG[0]]

                # Analytics: RECOMMENDATION_GENERATED
                analytics_batch.append({
                    "event_type": "RECOMMENDATION_GENERATED",
                    "event_data": {
                        "visitId": visit_id,
                        "blockedCount": 0,
                        "totalOptions": len(drugs),
                        "warningCount": random.randint(0, 1),
                    },
                    "user_id": None,
                    "session_id": f"seed-session-{idx}",
                    "created_at": ts(days_ago, visit_hour, 5),
                })

                # Create prescription
                prx_row = await post(client, "prescriptions", {
                    "visit_id": visit_id,
                    "patient_id": patient_id,
                    "clinician_id": clinician_id,
                    "status": "approved",
                    "approved_at": ts(days_ago, visit_hour, duration - 2),
                    "created_at": ts(days_ago, visit_hour, 4),
                    "updated_at": ts(days_ago, visit_hour, duration - 2),
                })
                if not prx_row.get("id"):
                    print(f"  ✗ Failed to create prescription for visit {visit_id[:8]}")
                    continue

                prx_id = prx_row["id"]
                total_prescriptions += 1

                # Create prescription_items and OPTION_APPROVED events
                for drug in drugs:
                    (drug_name, generic_name, dosage, frequency,
                     duration_str, route, tier, copay, is_covered, cov_status) = drug

                    await post(client, "prescription_items", {
                        "prescription_id": prx_id,
                        "drug_name": drug_name,
                        "generic_name": generic_name,
                        "dosage": dosage,
                        "frequency": frequency,
                        "duration": duration_str,
                        "route": route,
                        "tier": tier,
                        "copay": copay,
                        "is_covered": is_covered,
                        "created_at": ts(days_ago, visit_hour, duration - 2),
                    })

                    analytics_batch.append({
                        "event_type": "OPTION_APPROVED",
                        "event_data": {
                            "visitId": visit_id,
                            "prescriptionId": prx_id,
                            "medication": drug_name,
                            "copay": copay,
                            "copayDelta": round(random.uniform(5, 30), 2),
                            "tier": tier,
                            "coverageStatus": cov_status,
                        },
                        "user_id": None,
                        "session_id": f"seed-session-{idx}",
                        "created_at": ts(days_ago, visit_hour, duration - 1),
                    })

                # Analytics: VISIT_COMPLETED
                analytics_batch.append({
                    "event_type": "VISIT_COMPLETED",
                    "event_data": {
                        "visitId": visit_id,
                        "clinicianId": clinician_id,
                        "durationMinutes": duration,
                        "prescriptionsCount": len(drugs),
                    },
                    "user_id": None,
                    "session_id": f"seed-session-{idx}",
                    "created_at": ts(days_ago, visit_hour, duration),
                })

                print(f"  ✓ Visit '{chief[:40]}…' → {len(drugs)} Rx ({', '.join(d[0] for d in drugs)})")

        # ── Batch-insert analytics events ──────────────────────────────────────
        print(f"\nInserting {len(analytics_batch)} analytics events...")
        # Insert in chunks of 20 to avoid request size limits
        chunk_size = 20
        for i in range(0, len(analytics_batch), chunk_size):
            chunk = analytics_batch[i:i + chunk_size]
            r = await client.post(
                f"{SUPA_URL}/analytics_events",
                json=chunk,
                headers=HEADERS,
            )
            if r.status_code in (200, 201):
                total_events += len(chunk)
            else:
                print(f"  ERROR inserting events chunk: {r.status_code} {r.text[:200]}")

        # ── Summary ────────────────────────────────────────────────────────────
        print(f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Seed complete!
  Patients:      {len(patient_ids)}
  Visits:        {total_visits}
  Prescriptions: {total_prescriptions}
  Events:        {total_events}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next steps:
  1. Hard-refresh the browser (Cmd+Shift+R)
  2. Clinician dashboard → should show new patients + visits
  3. Analytics → click 'Sync Now' to push events to Snowflake
""")


if __name__ == "__main__":
    asyncio.run(main())
