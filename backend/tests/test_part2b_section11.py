"""Part 2B §11 — Acceptance Criteria (all 16 criteria).

Each test function is named ``test_criterion_<N>_<short_name>`` and maps 1:1
to the table in the spec.  A reviewer can verify coverage by matching the
function name suffix to the spec row number.
"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from pharmasense.schemas.formulary_service import (
    CoverageStatus,
    FormularyEntryData,
)
from pharmasense.schemas.gemini import (
    FormularyEntryExtracted,
    FormularyExtractionOutput,
    GeminiRecommendationOutput,
    PatientInstructionsOutput,
    RecommendationItem as GeminiRecItem,
)
from pharmasense.schemas.prescription_ops import (
    PrescriptionApprovalRequest,
    PrescriptionRejectionRequest,
)
from pharmasense.schemas.recommendation import RecommendationRequest
from pharmasense.schemas.rules_engine import (
    CheckStatus,
    CheckType,
    DoseRangeData,
    DrugInteractionData,
    RulesEngineInput,
)
from pharmasense.routers.prescriptions import router, _get_prescription_service
from pharmasense.services.analytics_service import AnalyticsService
from pharmasense.services.formulary_service import FormularyService
from pharmasense.services.gemini_service import GeminiService
from pharmasense.services.prescription_service import PrescriptionService
from pharmasense.services.rules_engine_service import RulesEngineService, _parse_dose_to_mg


# =========================================================================
# Shared helpers
# =========================================================================

INTERACTIONS = [
    DrugInteractionData(drug_a="Warfarin", drug_b="Aspirin", severity="SEVERE", description="Increased bleeding risk"),
    DrugInteractionData(drug_a="Lisinopril", drug_b="Ibuprofen", severity="MODERATE", description="Reduced antihypertensive effect"),
]

DOSE_RANGES = [
    DoseRangeData(medication_name="Metformin", min_dose_mg=500, max_dose_mg=2550),
    DoseRangeData(medication_name="Lisinopril", min_dose_mg=5, max_dose_mg=40),
    DoseRangeData(medication_name="Atorvastatin", min_dose_mg=10, max_dose_mg=80),
]

DEMO_FORMULARY = [
    FormularyEntryData(drug_name="Metformin", generic_name="metformin", plan_name="DEMO_PLAN", tier=1, copay=5.0, is_covered=True, requires_prior_auth=False),
    FormularyEntryData(drug_name="Lisinopril", generic_name="lisinopril", plan_name="DEMO_PLAN", tier=1, copay=10.0, is_covered=True, requires_prior_auth=False),
    FormularyEntryData(drug_name="Amoxicillin", generic_name="amoxicillin", plan_name="DEMO_PLAN", tier=1, copay=8.0, is_covered=True, requires_prior_auth=False),
    FormularyEntryData(drug_name="Atorvastatin", generic_name="atorvastatin", plan_name="DEMO_PLAN", tier=1, copay=8.0, is_covered=True, requires_prior_auth=False),
    FormularyEntryData(drug_name="Eliquis", generic_name="apixaban", plan_name="DEMO_PLAN", tier=3, copay=75.0, is_covered=True, requires_prior_auth=True),
]

engine = RulesEngineService()
formulary_svc = FormularyService()


def _mock_gemini() -> MagicMock:
    m = MagicMock(spec=GeminiService)
    m.generate_recommendations = AsyncMock()
    m.generate_patient_instructions = AsyncMock()
    return m


def _make_svc(mg: MagicMock | None = None) -> tuple[PrescriptionService, AnalyticsService, MagicMock]:
    mg = mg or _mock_gemini()
    analytics = AnalyticsService()
    svc = PrescriptionService(
        gemini_service=mg, rules_engine=RulesEngineService(),
        formulary_service=FormularyService(), analytics_service=analytics,
    )
    return svc, analytics, mg


def _gemini_out(*meds: tuple[str, str, str, str, str]) -> GeminiRecommendationOutput:
    return GeminiRecommendationOutput(
        recommendations=[
            GeminiRecItem(medication=m, dosage=d, frequency=f, duration=dur, rationale=r, formulary_status="COVERED")
            for m, d, f, dur, r in meds
        ],
        clinical_reasoning="AI reasoning",
    )


def _build_test_app(svc: PrescriptionService) -> FastAPI:
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[_get_prescription_service] = lambda: svc
    return app


# =========================================================================
# Criterion 1: Allergy check catches exact name match
# =========================================================================

def test_criterion_01_allergy_exact_name_match() -> None:
    out = engine.evaluate(RulesEngineInput(
        medication_name="Penicillin V", patient_allergies=["Penicillin"],
    ))
    c = [x for x in out.checks if x.check_type == CheckType.ALLERGY][0]
    assert c.status == CheckStatus.FAIL
    assert c.blocking is True


# =========================================================================
# Criterion 2: Allergy check catches drug class cross-reactivity
# =========================================================================

def test_criterion_02_allergy_drug_class_cross_reactivity() -> None:
    """'penicillin' allergy blocks 'amoxicillin' via DRUG_CLASS_MAP."""
    out = engine.evaluate(RulesEngineInput(
        medication_name="Amoxicillin", patient_allergies=["penicillin"],
    ))
    c = [x for x in out.checks if x.check_type == CheckType.ALLERGY][0]
    assert c.status == CheckStatus.FAIL
    assert c.blocking is True


# =========================================================================
# Criterion 3: Drug interaction check queries both directions
# =========================================================================

def test_criterion_03_interaction_both_directions() -> None:
    """Data stores (Warfarin, Aspirin). Both orderings must match."""
    # Direction 1: medication=Aspirin, current=Warfarin (drug_a=Warfarin matches current, drug_b=Aspirin matches med)
    out1 = engine.evaluate(RulesEngineInput(
        medication_name="Aspirin", current_medications=["Warfarin"],
        drug_interactions=INTERACTIONS,
    ))
    ix1 = [x for x in out1.checks if x.check_type == CheckType.DRUG_INTERACTION]
    assert any(x.status == CheckStatus.FAIL for x in ix1), "(Aspirin proposed, Warfarin current) must match"

    # Direction 2: medication=Warfarin, current=Aspirin (reversed — drug_a=Warfarin matches med, drug_b=Aspirin matches current)
    out2 = engine.evaluate(RulesEngineInput(
        medication_name="Warfarin", current_medications=["Aspirin"],
        drug_interactions=INTERACTIONS,
    ))
    ix2 = [x for x in out2.checks if x.check_type == CheckType.DRUG_INTERACTION]
    assert any(x.status == CheckStatus.FAIL for x in ix2), "(Warfarin proposed, Aspirin current) must match"


# =========================================================================
# Criterion 4: SEVERE interactions are blocking
# =========================================================================

def test_criterion_04_severe_interactions_blocking() -> None:
    out = engine.evaluate(RulesEngineInput(
        medication_name="Aspirin", current_medications=["Warfarin"],
        drug_interactions=INTERACTIONS,
    ))
    assert out.has_blocking_failure is True


# =========================================================================
# Criterion 5: MODERATE interactions are warnings
# =========================================================================

def test_criterion_05_moderate_interactions_are_warnings() -> None:
    out = engine.evaluate(RulesEngineInput(
        medication_name="Ibuprofen", current_medications=["Lisinopril"],
        drug_interactions=INTERACTIONS,
    ))
    ix = [x for x in out.checks if x.check_type == CheckType.DRUG_INTERACTION]
    assert any(x.status == CheckStatus.WARNING for x in ix)
    assert out.has_blocking_failure is False


# =========================================================================
# Criterion 6: Dose range check parses "500mg", "0.5g", "250 mcg"
# =========================================================================

def test_criterion_06_dose_parsing() -> None:
    assert _parse_dose_to_mg("500mg") == 500.0
    assert _parse_dose_to_mg("0.5g") == 500.0
    assert _parse_dose_to_mg("250 mcg") == 0.25


# =========================================================================
# Criterion 7: Dose exceeding max is blocking
# =========================================================================

def test_criterion_07_dose_exceeding_max_is_blocking() -> None:
    out = engine.evaluate(RulesEngineInput(
        medication_name="Atorvastatin", dosage="120mg", dose_ranges=DOSE_RANGES,
    ))
    d = [x for x in out.checks if x.check_type == CheckType.DOSE_RANGE][0]
    assert d.status == CheckStatus.FAIL
    assert d.blocking is True


# =========================================================================
# Criterion 8: Duplicate therapy detects same-class drugs
# =========================================================================

def test_criterion_08_duplicate_therapy_same_class() -> None:
    """Two statins (Atorvastatin + Simvastatin) detected as duplicate."""
    out = engine.evaluate(RulesEngineInput(
        medication_name="Simvastatin", current_medications=["Atorvastatin"],
    ))
    d = [x for x in out.checks if x.check_type == CheckType.DUPLICATE_THERAPY][0]
    assert d.status == CheckStatus.WARNING
    assert "statin" in d.details.lower()


# =========================================================================
# Criterion 9: Formulary lookup returns coverage for known drug
# =========================================================================

def test_criterion_09_formulary_coverage_known_drug() -> None:
    """Metformin → COVERED, Tier 1, copay from seed ($5)."""
    result = formulary_svc.lookup_coverage("Metformin", DEMO_FORMULARY, plan_name="DEMO_PLAN")
    assert result.status == CoverageStatus.COVERED
    assert result.tier == 1
    assert result.copay == 5.0


# =========================================================================
# Criterion 10: Formulary lookup returns UNKNOWN for missing drug
# =========================================================================

def test_criterion_10_formulary_unknown_missing_drug() -> None:
    """Unknown drug → UNKNOWN with alternatives."""
    result = formulary_svc.lookup_coverage("UnknownDrugXYZ", DEMO_FORMULARY)
    assert result.status == CoverageStatus.UNKNOWN

    alts = formulary_svc.find_alternatives("UnknownDrugXYZ", DEMO_FORMULARY)
    assert len(alts) > 0


# =========================================================================
# Criterion 11: Alternative suggestions return cheaper covered options
# =========================================================================

def test_criterion_11_alternatives_sorted_by_copay_ascending() -> None:
    alts = formulary_svc.find_alternatives("ExperimentalDrug", DEMO_FORMULARY)
    copays = [a.copay for a in alts]
    assert copays == sorted(copays), "Alternatives must be sorted by copay ascending"
    assert all(a.copay >= 0 for a in alts)


# =========================================================================
# Criterion 12: Full pipeline — Gemini → Rules → Coverage → DB persist
#               POST /api/prescriptions/recommend returns annotated options
# =========================================================================

def test_criterion_12_full_pipeline_http() -> None:
    """POST /api/prescriptions/recommend returns annotated options with safety + coverage."""
    mg = _mock_gemini()
    mg.generate_recommendations.return_value = _gemini_out(
        ("Metformin", "500mg", "twice daily", "ongoing", "T2DM"),
        ("Amoxicillin", "500mg", "tid", "7 days", "Infection"),
    )
    svc, _, _ = _make_svc(mg)
    app = _build_test_app(svc)
    client = TestClient(app)

    payload = {
        "visit_id": str(uuid.uuid4()),
        "chief_complaint": "diabetes + infection",
        "patient_id": str(uuid.uuid4()),
        "allergies": [],
        "current_medications": [],
    }
    resp = client.post("/api/prescriptions/recommend", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True

    recs = body["data"]["recommendations"]
    assert len(recs) == 2
    for rec in recs:
        assert "primary" in rec
        assert "warnings" in rec
        primary = rec["primary"]
        assert "drug_name" in primary
        assert "dosage" in primary
        assert "is_covered" in primary or primary.get("tier") is not None

    # Verify a prescription was persisted in the in-memory store
    assert len(svc._store._prescriptions) == 1


# =========================================================================
# Criterion 13: Blocked prescription cannot be approved (HTTP 422)
# =========================================================================

def test_criterion_13_blocked_rx_returns_422() -> None:
    """POST /api/prescriptions/approve returns 422 for blocked Rx."""
    svc, _, _ = _make_svc()
    rx_id = uuid.uuid4()
    svc._store.save_prescription({
        "id": rx_id,
        "visit_id": uuid.uuid4(),
        "patient_id": uuid.uuid4(),
        "status": "recommended",
        "items": [{"primary": {"drug_name": "Aspirin"}, "warnings": ["SEVERE interaction: Aspirin + Warfarin"]}],
        "rules_results": [{"medication": "Aspirin", "blocked": True}],
    })
    app = _build_test_app(svc)
    client = TestClient(app)

    resp = client.post("/api/prescriptions/approve", json={
        "prescription_id": str(rx_id),
        "confirmed_safety_review": True,
    })
    assert resp.status_code == 422


# =========================================================================
# Criterion 14: Approved prescription generates receipt
#               Receipt contains coverage, safety checks, patient instructions
# =========================================================================

@pytest.mark.asyncio
async def test_criterion_14_approved_rx_generates_receipt() -> None:
    """Receipt contains coverage, safety checks, and patient instructions."""
    svc, _, mg = _make_svc()
    mg.generate_recommendations.return_value = _gemini_out(
        ("Metformin", "500mg", "twice daily", "ongoing", "T2DM"),
    )
    mg.generate_patient_instructions.return_value = PatientInstructionsOutput(
        medication_name="Metformin",
        purpose="Treats type 2 diabetes",
        how_to_take="Take 500mg with food twice daily",
        what_to_avoid=["Alcohol in excess"],
        side_effects=["Nausea", "Diarrhea"],
        when_to_seek_help=["Signs of lactic acidosis"],
    )

    await svc.generate_recommendations(
        RecommendationRequest(
            visit_id=uuid.uuid4(), chief_complaint="T2DM",
            patient_id=uuid.uuid4(),
        ),
        formulary=DEMO_FORMULARY, dose_ranges=DOSE_RANGES,
    )
    rx_id = list(svc._store._prescriptions.keys())[0]

    receipt = await svc.approve_prescription(
        PrescriptionApprovalRequest(prescription_id=rx_id, confirmed_safety_review=True),
        patient_name="Jane Doe", clinician_name="Dr. Smith",
        plan_name="DEMO_PLAN", member_id="M-12345",
    )

    # Receipt structural checks
    assert receipt.status == "approved"
    assert len(receipt.drugs) >= 1
    assert receipt.drugs[0].drug_name == "Metformin"

    # Coverage section
    assert receipt.coverage is not None
    assert receipt.coverage.plan_name == "DEMO_PLAN"
    assert receipt.coverage.member_id == "M-12345"
    assert receipt.coverage.items_covered >= 1

    # Safety section
    assert receipt.safety is not None
    assert receipt.safety.all_passed is True

    # Patient instructions (via generate_patient_pack)
    pack = await svc.generate_patient_pack(rx_id)
    assert pack.medication_name == "Metformin"
    assert pack.purpose != ""
    assert pack.how_to_take != ""
    assert len(pack.what_to_avoid) > 0
    assert len(pack.side_effects) > 0
    assert len(pack.when_to_seek_help) > 0


# =========================================================================
# Criterion 15: Analytics events emitted for all actions
#               recommendation, approve, reject, block
# =========================================================================

@pytest.mark.asyncio
async def test_criterion_15_analytics_events_for_all_actions() -> None:
    """Events: RECOMMENDATION_GENERATED, OPTION_BLOCKED, OPTION_APPROVED, OPTION_REJECTED."""
    svc, analytics, mg = _make_svc()

    # 1. Generate recommendations that include a blocked option
    mg.generate_recommendations.return_value = _gemini_out(
        ("Aspirin", "81mg", "once daily", "ongoing", "Cardioprotective"),
        ("Metformin", "500mg", "twice daily", "ongoing", "T2DM"),
    )
    await svc.generate_recommendations(
        RecommendationRequest(
            visit_id=uuid.uuid4(), chief_complaint="test",
            patient_id=uuid.uuid4(),
            current_medications=["Warfarin"], allergies=[],
        ),
        formulary=DEMO_FORMULARY,
        drug_interactions=INTERACTIONS,
        dose_ranges=DOSE_RANGES,
    )
    rx_id = list(svc._store._prescriptions.keys())[0]

    event_types_so_far = {e["event_type"] for e in analytics.pending_events}
    assert "RECOMMENDATION_GENERATED" in event_types_so_far
    assert "OPTION_BLOCKED" in event_types_so_far

    # 2. Create a clean prescription and approve it
    mg.generate_recommendations.return_value = _gemini_out(
        ("Lisinopril", "10mg", "once daily", "ongoing", "BP"),
    )
    await svc.generate_recommendations(
        RecommendationRequest(
            visit_id=uuid.uuid4(), chief_complaint="BP",
            patient_id=uuid.uuid4(),
        ),
        formulary=DEMO_FORMULARY, dose_ranges=DOSE_RANGES,
    )
    clean_rx_id = [k for k in svc._store._prescriptions if k != rx_id][0]
    await svc.approve_prescription(
        PrescriptionApprovalRequest(prescription_id=clean_rx_id, confirmed_safety_review=True),
    )

    # 3. Create another prescription and reject it
    mg.generate_recommendations.return_value = _gemini_out(
        ("Atorvastatin", "20mg", "once daily", "ongoing", "Cholesterol"),
    )
    await svc.generate_recommendations(
        RecommendationRequest(
            visit_id=uuid.uuid4(), chief_complaint="cholesterol",
            patient_id=uuid.uuid4(),
        ),
        formulary=DEMO_FORMULARY, dose_ranges=DOSE_RANGES,
    )
    reject_rx_id = [k for k in svc._store._prescriptions if k not in (rx_id, clean_rx_id)][0]
    await svc.reject_prescription(
        PrescriptionRejectionRequest(prescription_id=reject_rx_id, reason="Patient preference"),
    )

    all_types = {e["event_type"] for e in analytics.pending_events}
    assert "RECOMMENDATION_GENERATED" in all_types
    assert "OPTION_BLOCKED" in all_types
    assert "OPTION_APPROVED" in all_types
    assert "OPTION_REJECTED" in all_types


# =========================================================================
# Criterion 16: Formulary PDF ingestion persists to database
#               Upload PDF → formulary_entries rows created
# =========================================================================

def test_criterion_16_formulary_pdf_ingestion() -> None:
    """Gemini extraction output → FormularyEntryData objects created (ready for DB)."""
    extraction = FormularyExtractionOutput(
        plan_name="UPLOADED_PLAN",
        effective_date="2026-02-01",
        entries=[
            FormularyEntryExtracted(drug_name="DrugAlpha", generic_name="alpha", tier=1, copay_min=5.0),
            FormularyEntryExtracted(drug_name="DrugBeta", generic_name="beta", tier=2, copay_min=20.0, requires_prior_auth=True),
            FormularyEntryExtracted(drug_name="DrugGamma", generic_name="gamma", tier=3, copay_min=50.0),
        ],
    )
    entries = formulary_svc.import_extracted_formulary(extraction, plan_name="UPLOADED_PLAN")

    assert len(entries) == 3
    assert entries[0].drug_name == "DrugAlpha"
    assert entries[0].plan_name == "UPLOADED_PLAN"
    assert entries[0].copay == 5.0
    assert entries[1].requires_prior_auth is True
    assert entries[2].tier == 3

    # The entries are FormularyEntryData objects ready for DB persistence
    for entry in entries:
        assert entry.plan_name == "UPLOADED_PLAN"
        assert entry.drug_name != ""
        assert entry.tier >= 1
