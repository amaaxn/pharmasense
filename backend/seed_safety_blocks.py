"""Seed analytics_events with OPTION_BLOCKED entries so the Safety Blocks
chart is populated on the clinician analytics dashboard."""

import asyncio
import uuid
from datetime import datetime, timedelta, timezone

from pharmasense.services.supabase_client import get_supabase

BLOCKED_EVENTS = [
    # Allergy blocks
    {"medication": "Amoxicillin 500 mg", "reason": "Allergy check failed: patient allergic to Penicillin (cross-reactive)", "blockType": "ALLERGY"},
    {"medication": "Cephalexin 250 mg", "reason": "Allergy check failed: patient allergic to Cephalosporins", "blockType": "ALLERGY"},
    {"medication": "Penicillin V 500 mg", "reason": "Allergy check failed: patient allergic to Penicillin", "blockType": "ALLERGY"},
    {"medication": "Ampicillin 250 mg", "reason": "Allergy check failed: patient allergic to Penicillin (same drug class)", "blockType": "ALLERGY"},
    {"medication": "Sulfamethoxazole 800 mg", "reason": "Allergy check failed: patient allergic to Sulfonamides", "blockType": "ALLERGY"},

    # Drug interaction blocks
    {"medication": "Warfarin 5 mg", "reason": "Drug interaction: SEVERE interaction with Aspirin (increased bleeding risk)", "blockType": "INTERACTION"},
    {"medication": "Methotrexate 10 mg", "reason": "Drug interaction: SEVERE interaction with NSAIDs (nephrotoxicity risk)", "blockType": "INTERACTION"},
    {"medication": "Simvastatin 40 mg", "reason": "Drug interaction: SEVERE interaction with Clarithromycin (rhabdomyolysis risk)", "blockType": "INTERACTION"},
    {"medication": "Fluoxetine 20 mg", "reason": "Drug interaction: SEVERE interaction with Tramadol (serotonin syndrome risk)", "blockType": "INTERACTION"},
    {"medication": "Lithium 300 mg", "reason": "Drug interaction: SEVERE interaction with Ibuprofen (lithium toxicity risk)", "blockType": "INTERACTION"},
    {"medication": "Sildenafil 50 mg", "reason": "Drug interaction: SEVERE interaction with Nitroglycerin (fatal hypotension)", "blockType": "INTERACTION"},
    {"medication": "Digoxin 0.25 mg", "reason": "Drug interaction: SEVERE interaction with Amiodarone (digoxin toxicity)", "blockType": "INTERACTION"},

    # Dose range violations
    {"medication": "Metformin 3000 mg", "reason": "Dose range exceeded: max recommended dose is 2550 mg/day", "blockType": "DOSE_RANGE"},
    {"medication": "Lisinopril 80 mg", "reason": "Dose range exceeded: max recommended dose is 40 mg/day", "blockType": "DOSE_RANGE"},
    {"medication": "Atorvastatin 120 mg", "reason": "Dose range exceeded: max recommended dose is 80 mg/day", "blockType": "DOSE_RANGE"},

    # Duplicate therapy
    {"medication": "Omeprazole 20 mg", "reason": "Duplicate therapy: patient already on Esomeprazole (same class – PPI)", "blockType": "DUPLICATE_THERAPY"},
    {"medication": "Losartan 50 mg", "reason": "Duplicate therapy: patient already on Valsartan (same class – ARB)", "blockType": "DUPLICATE_THERAPY"},
]


async def seed():
    supa = get_supabase()
    now = datetime.now(timezone.utc)

    print(f"Inserting {len(BLOCKED_EVENTS)} OPTION_BLOCKED events…")
    for i, evt in enumerate(BLOCKED_EVENTS):
        created = now - timedelta(days=len(BLOCKED_EVENTS) - i, hours=i % 8)
        row = {
            "id": str(uuid.uuid4()),
            "event_type": "OPTION_BLOCKED",
            "event_data": {
                "visitId": str(uuid.uuid4()),
                "medication": evt["medication"],
                "reason": evt["reason"],
                "blockType": evt["blockType"],
            },
            "created_at": created.isoformat(),
        }
        await supa.insert("analytics_events", row)
        print(f"  [{i+1}/{len(BLOCKED_EVENTS)}] {evt['blockType']:20s}  {evt['medication']}")

    print("\nDone! Restart the backend or hit Sync Now on the dashboard to see the data.")


if __name__ == "__main__":
    asyncio.run(seed())
