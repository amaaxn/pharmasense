"""Part 2B §10 — Acceptance test matrix.

Every test maps 1:1 to a row in the spec's §10.1 or §10.2 table.
Test IDs follow the pattern `test_s10_1_<row>_<name>` / `test_s10_2_<row>_<name>`
so a reviewer can trace each test back to its spec requirement.

§10.1 rows 1–14: RulesEngineService unit tests (no Gemini, no DB)
§10.1 rows 15–17: FormularyService coverage tests
§10.2 rows 1–7:  PrescriptionService integration tests (Gemini mocked)
"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from pharmasense.exceptions import (
    SafetyBlockError,
    ValidationError,
)
from pharmasense.schemas.formulary_service import (
    CoverageStatus,
    FormularyEntryData,
)
from pharmasense.schemas.gemini import (
    GeminiRecommendationOutput,
    PatientInstructionsOutput,
    RecommendationItem as GeminiRecItem,
)
from pharmasense.schemas.prescription_ops import (
    PrescriptionApprovalRequest,
    PrescriptionRejectionRequest,
)
from pharmasense.schemas.recommendation import (
    RecommendationRequest,
    RecommendationResponse,
)
from pharmasense.schemas.rules_engine import (
    CheckStatus,
    CheckType,
    DoseRangeData,
    DrugInteractionData,
    RulesEngineInput,
)
from pharmasense.services.analytics_service import AnalyticsService
from pharmasense.services.formulary_service import FormularyService
from pharmasense.services.gemini_service import GeminiService
from pharmasense.services.prescription_service import PrescriptionService
from pharmasense.services.rules_engine_service import RulesEngineService


# =========================================================================
# Shared data
# =========================================================================

INTERACTIONS = [
    DrugInteractionData(drug_a="Warfarin", drug_b="Aspirin", severity="SEVERE", description="Increased bleeding risk"),
    DrugInteractionData(drug_a="Lisinopril", drug_b="Ibuprofen", severity="MODERATE", description="Reduced antihypertensive effect"),
]

DOSE_RANGES = [
    DoseRangeData(medication_name="Metformin", min_dose_mg=500, max_dose_mg=2550),
    DoseRangeData(medication_name="Lisinopril", min_dose_mg=5, max_dose_mg=40),
    DoseRangeData(medication_name="Atorvastatin", min_dose_mg=10, max_dose_mg=80),
    DoseRangeData(medication_name="Amoxicillin", min_dose_mg=250, max_dose_mg=3000),
]

DEMO_FORMULARY = [
    FormularyEntryData(drug_name="Metformin", generic_name="metformin", plan_name="DEMO_PLAN", tier=1, copay=5.0, is_covered=True, requires_prior_auth=False),
    FormularyEntryData(drug_name="Lisinopril", generic_name="lisinopril", plan_name="DEMO_PLAN", tier=1, copay=10.0, is_covered=True, requires_prior_auth=False),
    FormularyEntryData(drug_name="Amoxicillin", generic_name="amoxicillin", plan_name="DEMO_PLAN", tier=1, copay=8.0, is_covered=True, requires_prior_auth=False),
    FormularyEntryData(drug_name="Eliquis", generic_name="apixaban", plan_name="DEMO_PLAN", tier=3, copay=75.0, is_covered=True, requires_prior_auth=True),
    FormularyEntryData(drug_name="Atorvastatin", generic_name="atorvastatin", plan_name="DEMO_PLAN", tier=1, copay=8.0, is_covered=True, requires_prior_auth=False),
]


@pytest.fixture
def engine() -> RulesEngineService:
    return RulesEngineService()


@pytest.fixture
def formulary_svc() -> FormularyService:
    return FormularyService()


def _mock_gemini() -> MagicMock:
    mock = MagicMock(spec=GeminiService)
    mock.generate_recommendations = AsyncMock()
    mock.generate_patient_instructions = AsyncMock()
    return mock


def _make_prescription_svc(mock_gemini: MagicMock | None = None) -> tuple[PrescriptionService, AnalyticsService, MagicMock]:
    mg = mock_gemini or _mock_gemini()
    analytics = AnalyticsService()
    svc = PrescriptionService(
        gemini_service=mg,
        rules_engine=RulesEngineService(),
        formulary_service=FormularyService(),
        analytics_service=analytics,
    )
    return svc, analytics, mg


def _gemini_out(*meds: tuple[str, str, str, str, str]) -> GeminiRecommendationOutput:
    return GeminiRecommendationOutput(
        recommendations=[
            GeminiRecItem(medication=m, dosage=d, frequency=f, duration=dur, rationale=r, formulary_status="COVERED_PREFERRED")
            for m, d, f, dur, r in meds
        ],
        clinical_reasoning="Test reasoning",
    )


def _rec_request(*, allergies: list[str] | None = None, meds: list[str] | None = None) -> RecommendationRequest:
    return RecommendationRequest(
        visit_id=uuid.uuid4(), chief_complaint="test", patient_id=uuid.uuid4(),
        allergies=allergies or [], current_medications=meds or [],
    )


# =========================================================================
# §10.1 Row 1: Allergy exact match
# =========================================================================

def test_s10_1_row01_allergy_exact_match(engine: RulesEngineService) -> None:
    """Patient allergic to 'Penicillin', proposed: 'Penicillin V' → ALLERGY FAIL, blocking=true."""
    out = engine.evaluate(RulesEngineInput(medication_name="Penicillin V", patient_allergies=["Penicillin"]))
    c = [x for x in out.checks if x.check_type == CheckType.ALLERGY][0]
    assert c.status == CheckStatus.FAIL
    assert c.blocking is True


# =========================================================================
# §10.1 Row 2: Allergy class match
# =========================================================================

def test_s10_1_row02_allergy_class_match(engine: RulesEngineService) -> None:
    """Patient allergic to 'penicillin', proposed: 'Amoxicillin' → ALLERGY FAIL via drug class map."""
    out = engine.evaluate(RulesEngineInput(medication_name="Amoxicillin", patient_allergies=["penicillin"]))
    c = [x for x in out.checks if x.check_type == CheckType.ALLERGY][0]
    assert c.status == CheckStatus.FAIL
    assert c.blocking is True


# =========================================================================
# §10.1 Row 3: Allergy no match
# =========================================================================

def test_s10_1_row03_allergy_no_match(engine: RulesEngineService) -> None:
    """Patient allergic to 'Penicillin', proposed: 'Ciprofloxacin' → ALLERGY PASS."""
    out = engine.evaluate(RulesEngineInput(medication_name="Ciprofloxacin", patient_allergies=["Penicillin"]))
    c = [x for x in out.checks if x.check_type == CheckType.ALLERGY][0]
    assert c.status == CheckStatus.PASS


# =========================================================================
# §10.1 Row 4: No allergies
# =========================================================================

def test_s10_1_row04_no_allergies(engine: RulesEngineService) -> None:
    """Patient has empty allergy list → ALLERGY PASS."""
    out = engine.evaluate(RulesEngineInput(medication_name="Amoxicillin", patient_allergies=[]))
    c = [x for x in out.checks if x.check_type == CheckType.ALLERGY][0]
    assert c.status == CheckStatus.PASS


# =========================================================================
# §10.1 Row 5: Severe interaction
# =========================================================================

def test_s10_1_row05_severe_interaction(engine: RulesEngineService) -> None:
    """Patient on Warfarin, proposed: Aspirin → INTERACTION FAIL, blocking=true."""
    out = engine.evaluate(RulesEngineInput(
        medication_name="Aspirin", current_medications=["Warfarin"], drug_interactions=INTERACTIONS,
    ))
    ix = [x for x in out.checks if x.check_type == CheckType.DRUG_INTERACTION]
    assert any(x.status == CheckStatus.FAIL and x.blocking for x in ix)
    assert out.has_blocking_failure is True


# =========================================================================
# §10.1 Row 6: Moderate interaction
# =========================================================================

def test_s10_1_row06_moderate_interaction(engine: RulesEngineService) -> None:
    """Patient on Lisinopril, proposed: Ibuprofen → INTERACTION WARNING, blocking=false."""
    out = engine.evaluate(RulesEngineInput(
        medication_name="Ibuprofen", current_medications=["Lisinopril"], drug_interactions=INTERACTIONS,
    ))
    ix = [x for x in out.checks if x.check_type == CheckType.DRUG_INTERACTION]
    assert any(x.status == CheckStatus.WARNING for x in ix)
    assert not any(x.blocking for x in ix)


# =========================================================================
# §10.1 Row 7: No interaction
# =========================================================================

def test_s10_1_row07_no_interaction(engine: RulesEngineService) -> None:
    """Patient on Metformin, proposed: Amoxicillin → INTERACTION PASS."""
    out = engine.evaluate(RulesEngineInput(
        medication_name="Amoxicillin", current_medications=["Metformin"], drug_interactions=INTERACTIONS,
    ))
    ix = [x for x in out.checks if x.check_type == CheckType.DRUG_INTERACTION]
    assert all(x.status == CheckStatus.PASS for x in ix)


# =========================================================================
# §10.1 Row 8: Dose too high
# =========================================================================

def test_s10_1_row08_dose_too_high(engine: RulesEngineService) -> None:
    """Atorvastatin 120mg (max 80mg) → DOSE_RANGE FAIL, blocking=true."""
    out = engine.evaluate(RulesEngineInput(
        medication_name="Atorvastatin", dosage="120mg", dose_ranges=DOSE_RANGES,
    ))
    d = [x for x in out.checks if x.check_type == CheckType.DOSE_RANGE][0]
    assert d.status == CheckStatus.FAIL
    assert d.blocking is True


# =========================================================================
# §10.1 Row 9: Dose too low
# =========================================================================

def test_s10_1_row09_dose_too_low(engine: RulesEngineService) -> None:
    """Metformin 100mg (min 500mg) → DOSE_RANGE WARNING, blocking=false."""
    out = engine.evaluate(RulesEngineInput(
        medication_name="Metformin", dosage="100mg", dose_ranges=DOSE_RANGES,
    ))
    d = [x for x in out.checks if x.check_type == CheckType.DOSE_RANGE][0]
    assert d.status == CheckStatus.WARNING
    assert d.blocking is False


# =========================================================================
# §10.1 Row 10: Dose in range
# =========================================================================

def test_s10_1_row10_dose_in_range(engine: RulesEngineService) -> None:
    """Lisinopril 20mg (range 5-40) → DOSE_RANGE PASS."""
    out = engine.evaluate(RulesEngineInput(
        medication_name="Lisinopril", dosage="20mg", dose_ranges=DOSE_RANGES,
    ))
    d = [x for x in out.checks if x.check_type == CheckType.DOSE_RANGE][0]
    assert d.status == CheckStatus.PASS


# =========================================================================
# §10.1 Row 11: Dose unparseable
# =========================================================================

def test_s10_1_row11_dose_unparseable(engine: RulesEngineService) -> None:
    """Dosage 'two tablets' → DOSE_RANGE WARNING, 'Could not parse'."""
    out = engine.evaluate(RulesEngineInput(
        medication_name="Lisinopril", dosage="two tablets", dose_ranges=DOSE_RANGES,
    ))
    d = [x for x in out.checks if x.check_type == CheckType.DOSE_RANGE][0]
    assert d.status == CheckStatus.WARNING
    assert "Could not parse" in d.details


# =========================================================================
# §10.1 Row 12: Duplicate exact
# =========================================================================

def test_s10_1_row12_duplicate_exact(engine: RulesEngineService) -> None:
    """Patient on Lisinopril, proposed: Lisinopril → DUPLICATE_THERAPY WARNING."""
    out = engine.evaluate(RulesEngineInput(
        medication_name="Lisinopril", current_medications=["Lisinopril"],
    ))
    d = [x for x in out.checks if x.check_type == CheckType.DUPLICATE_THERAPY][0]
    assert d.status == CheckStatus.WARNING


# =========================================================================
# §10.1 Row 13: Duplicate class
# =========================================================================

def test_s10_1_row13_duplicate_class(engine: RulesEngineService) -> None:
    """Patient on Atorvastatin, proposed: Simvastatin → DUPLICATE_THERAPY WARNING (both statins)."""
    out = engine.evaluate(RulesEngineInput(
        medication_name="Simvastatin", current_medications=["Atorvastatin"],
    ))
    d = [x for x in out.checks if x.check_type == CheckType.DUPLICATE_THERAPY][0]
    assert d.status == CheckStatus.WARNING
    assert "statin" in d.details.lower()


# =========================================================================
# §10.1 Row 14: No duplicate
# =========================================================================

def test_s10_1_row14_no_duplicate(engine: RulesEngineService) -> None:
    """Patient on Metformin, proposed: Lisinopril → DUPLICATE_THERAPY PASS."""
    out = engine.evaluate(RulesEngineInput(
        medication_name="Lisinopril", current_medications=["Metformin"],
    ))
    d = [x for x in out.checks if x.check_type == CheckType.DUPLICATE_THERAPY][0]
    assert d.status == CheckStatus.PASS


# =========================================================================
# §10.1 Row 15: Coverage found
# =========================================================================

def test_s10_1_row15_coverage_found(formulary_svc: FormularyService) -> None:
    """Metformin in DEMO_PLAN, Tier 1, $5 → COVERED, copay=$5."""
    result = formulary_svc.lookup_coverage("Metformin", DEMO_FORMULARY, plan_name="DEMO_PLAN")
    assert result.status == CoverageStatus.COVERED
    assert result.tier == 1
    assert result.copay == 5.0


# =========================================================================
# §10.1 Row 16: Coverage not found — with alternatives suggested
# =========================================================================

def test_s10_1_row16_coverage_not_found_with_alternatives(formulary_svc: FormularyService) -> None:
    """'ExperimentalDrug' not in any plan → UNKNOWN, alternatives suggested."""
    result = formulary_svc.lookup_coverage("ExperimentalDrug", DEMO_FORMULARY, plan_name="DEMO_PLAN")
    assert result.status == CoverageStatus.UNKNOWN

    alts = formulary_svc.find_alternatives("ExperimentalDrug", DEMO_FORMULARY, plan_name="DEMO_PLAN")
    assert len(alts) > 0, "Alternatives must be suggested for unknown drugs"
    assert alts[0].copay <= alts[-1].copay, "Alternatives should be sorted by copay ascending"


# =========================================================================
# §10.1 Row 17: Coverage prior auth
# =========================================================================

def test_s10_1_row17_coverage_prior_auth(formulary_svc: FormularyService) -> None:
    """Eliquis in DEMO_PLAN, Tier 3, PA required → PRIOR_AUTH_REQUIRED."""
    result = formulary_svc.lookup_coverage("Eliquis", DEMO_FORMULARY, plan_name="DEMO_PLAN")
    assert result.status == CoverageStatus.PRIOR_AUTH_REQUIRED
    assert result.tier == 3
    assert result.requires_prior_auth is True


# =========================================================================
# §10.2 Row 1: Full recommendation pipeline with clean patient
# =========================================================================

@pytest.mark.asyncio
async def test_s10_2_row1_clean_patient_3_options() -> None:
    """3 options returned, all RECOMMENDED (no blocking warnings)."""
    svc, analytics, mg = _make_prescription_svc()
    mg.generate_recommendations.return_value = _gemini_out(
        ("Metformin", "500mg", "twice daily", "ongoing", "T2DM"),
        ("Lisinopril", "10mg", "once daily", "ongoing", "BP control"),
        ("Amoxicillin", "500mg", "three times daily", "7 days", "Infection"),
    )
    resp = await svc.generate_recommendations(
        _rec_request(), formulary=DEMO_FORMULARY, dose_ranges=DOSE_RANGES,
    )
    assert len(resp.recommendations) == 3
    for item in resp.recommendations:
        blocking_warnings = [w for w in item.warnings if "FAIL" in w.upper() or "block" in w.lower()]
        assert blocking_warnings == []


# =========================================================================
# §10.2 Row 2: Penicillin allergy, Gemini suggests amoxicillin
# =========================================================================

@pytest.mark.asyncio
async def test_s10_2_row2_penicillin_allergy_blocks_amoxicillin() -> None:
    """Amoxicillin option is BLOCKED (allergy warning present)."""
    svc, _, mg = _make_prescription_svc()
    mg.generate_recommendations.return_value = _gemini_out(
        ("Amoxicillin", "500mg", "tid", "7 days", "Infection"),
    )
    resp = await svc.generate_recommendations(
        _rec_request(allergies=["Penicillin"]), formulary=DEMO_FORMULARY, dose_ranges=DOSE_RANGES,
    )
    amox = resp.recommendations[0]
    assert any("allerg" in w.lower() for w in amox.warnings)


# =========================================================================
# §10.2 Row 3: Patient on warfarin, Gemini suggests aspirin
# =========================================================================

@pytest.mark.asyncio
async def test_s10_2_row3_warfarin_aspirin_blocked_severe() -> None:
    """Aspirin option is BLOCKED with SEVERE interaction."""
    svc, _, mg = _make_prescription_svc()
    mg.generate_recommendations.return_value = _gemini_out(
        ("Aspirin", "81mg", "once daily", "ongoing", "Cardioprotective"),
    )
    resp = await svc.generate_recommendations(
        _rec_request(meds=["Warfarin"]),
        formulary=DEMO_FORMULARY,
        drug_interactions=INTERACTIONS,
        dose_ranges=DOSE_RANGES,
    )
    aspirin = resp.recommendations[0]
    assert any("severe" in w.lower() for w in aspirin.warnings)


# =========================================================================
# §10.2 Row 4: Approve RECOMMENDED → APPROVED, receipt generated,
#              patient instructions populated
# =========================================================================

@pytest.mark.asyncio
async def test_s10_2_row4_approve_recommended_full_flow() -> None:
    """Approve → APPROVED, receipt has coverage/safety data, patient instructions populated."""
    svc, analytics, mg = _make_prescription_svc()
    mg.generate_recommendations.return_value = _gemini_out(
        ("Metformin", "500mg", "twice daily", "ongoing", "T2DM"),
    )
    mg.generate_patient_instructions.return_value = PatientInstructionsOutput(
        medication_name="Metformin",
        purpose="Controls blood sugar in type 2 diabetes",
        how_to_take="Take 500mg tablet with breakfast and dinner",
    )

    await svc.generate_recommendations(_rec_request(), formulary=DEMO_FORMULARY, dose_ranges=DOSE_RANGES)
    rx_id = list(svc._store._prescriptions.keys())[0]

    receipt = await svc.approve_prescription(
        PrescriptionApprovalRequest(prescription_id=rx_id, confirmed_safety_review=True),
        patient_name="Jane Doe",
        clinician_name="Dr. Smith",
        plan_name="DEMO_PLAN",
        member_id="M-12345",
    )

    assert receipt.status == "approved"
    assert receipt.drugs[0].drug_name == "Metformin"
    assert receipt.patient_name == "Jane Doe"
    assert receipt.coverage.plan_name == "DEMO_PLAN"
    assert receipt.safety is not None

    pack = await svc.generate_patient_pack(rx_id)
    assert pack.medication_name == "Metformin"
    assert pack.purpose != ""
    assert pack.how_to_take != ""

    events = analytics.pending_events
    assert any(e["event_type"] == "RECOMMENDATION_GENERATED" for e in events)
    assert any(e["event_type"] == "OPTION_APPROVED" for e in events)


# =========================================================================
# §10.2 Row 5: Approve BLOCKED prescription → SafetyBlockError
# =========================================================================

@pytest.mark.asyncio
async def test_s10_2_row5_approve_blocked_raises_safety_block_error() -> None:
    """Blocked prescription cannot be approved — SafetyBlockError (422)."""
    svc, _, mg = _make_prescription_svc()
    mg.generate_recommendations.return_value = _gemini_out(
        ("Aspirin", "81mg", "once daily", "ongoing", "Cardioprotective"),
    )
    await svc.generate_recommendations(
        _rec_request(meds=["Warfarin"]),
        formulary=DEMO_FORMULARY,
        drug_interactions=INTERACTIONS,
    )
    rx_id = list(svc._store._prescriptions.keys())[0]

    with pytest.raises(SafetyBlockError):
        await svc.approve_prescription(
            PrescriptionApprovalRequest(prescription_id=rx_id, confirmed_safety_review=True),
        )


# =========================================================================
# §10.2 Row 6: Approve without confirmed_safety_review → ValidationError
# =========================================================================

@pytest.mark.asyncio
async def test_s10_2_row6_approve_without_safety_review_raises() -> None:
    """Missing safety review confirmation → ValidationError (400)."""
    svc, _, mg = _make_prescription_svc()
    mg.generate_recommendations.return_value = _gemini_out(
        ("Metformin", "500mg", "twice daily", "ongoing", "T2DM"),
    )
    await svc.generate_recommendations(_rec_request(), formulary=DEMO_FORMULARY)
    rx_id = list(svc._store._prescriptions.keys())[0]

    with pytest.raises(ValidationError):
        await svc.approve_prescription(
            PrescriptionApprovalRequest(prescription_id=rx_id, confirmed_safety_review=False),
        )


# =========================================================================
# §10.2 Row 7: Reject prescription → REJECTED, analytics event emitted
# =========================================================================

@pytest.mark.asyncio
async def test_s10_2_row7_reject_prescription() -> None:
    """Reject → status REJECTED, OPTION_REJECTED analytics event emitted."""
    svc, analytics, mg = _make_prescription_svc()
    mg.generate_recommendations.return_value = _gemini_out(
        ("Metformin", "500mg", "twice daily", "ongoing", "T2DM"),
    )
    await svc.generate_recommendations(_rec_request(), formulary=DEMO_FORMULARY)
    rx_id = list(svc._store._prescriptions.keys())[0]

    await svc.reject_prescription(
        PrescriptionRejectionRequest(prescription_id=rx_id, reason="Patient declined"),
    )
    rx = svc._store.get_prescription(rx_id)
    assert rx is not None
    assert rx["status"] == "rejected"
    assert rx["rejection_reason"] == "Patient declined"

    events = analytics.pending_events
    assert any(e["event_type"] == "OPTION_REJECTED" for e in events)
