"""PrescriptionService integration tests (Part 2B §10.2).

GeminiService is mocked; all other services are real.
"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID

import pytest
import pytest_asyncio

from pharmasense.exceptions import (
    ResourceNotFoundError,
    SafetyBlockError,
    ValidationError,
)
from pharmasense.schemas.formulary_service import FormularyEntryData
from pharmasense.schemas.gemini import (
    GeminiRecommendationOutput,
    PatientInstructionsOutput,
    RecommendationAlternative,
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
    DoseRangeData,
    DrugInteractionData,
)
from pharmasense.schemas.validation import (
    ProposedDrug,
    ValidationRequest,
)
from pharmasense.services.analytics_service import AnalyticsService
from pharmasense.services.formulary_service import FormularyService
from pharmasense.services.gemini_service import GeminiService
from pharmasense.services.prescription_service import PrescriptionService
from pharmasense.services.rules_engine_service import RulesEngineService


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_gemini() -> MagicMock:
    mock = MagicMock(spec=GeminiService)
    mock.generate_recommendations = AsyncMock()
    mock.generate_patient_instructions = AsyncMock()
    return mock


@pytest.fixture
def rules_engine() -> RulesEngineService:
    return RulesEngineService()


@pytest.fixture
def formulary_svc() -> FormularyService:
    return FormularyService()


@pytest.fixture
def analytics_svc() -> AnalyticsService:
    return AnalyticsService()


@pytest.fixture
def svc(
    mock_gemini: MagicMock,
    rules_engine: RulesEngineService,
    formulary_svc: FormularyService,
    analytics_svc: AnalyticsService,
) -> PrescriptionService:
    return PrescriptionService(
        gemini_service=mock_gemini,
        rules_engine=rules_engine,
        formulary_service=formulary_svc,
        analytics_service=analytics_svc,
    )


@pytest.fixture
def demo_formulary() -> list[FormularyEntryData]:
    return [
        FormularyEntryData(
            drug_name="Metformin", generic_name="metformin",
            plan_name="DEMO_PLAN", tier=1, copay=5.0,
        ),
        FormularyEntryData(
            drug_name="Lisinopril", generic_name="lisinopril",
            plan_name="DEMO_PLAN", tier=1, copay=10.0,
        ),
        FormularyEntryData(
            drug_name="Amoxicillin", generic_name="amoxicillin",
            plan_name="DEMO_PLAN", tier=1, copay=8.0,
        ),
    ]


@pytest.fixture
def interactions() -> list[DrugInteractionData]:
    return [
        DrugInteractionData(
            drug_a="Warfarin", drug_b="Aspirin",
            severity="SEVERE",
            description="Increased risk of bleeding",
        ),
    ]


@pytest.fixture
def dose_ranges() -> list[DoseRangeData]:
    return [
        DoseRangeData(medication_name="Metformin", min_dose_mg=500, max_dose_mg=2550),
        DoseRangeData(medication_name="Lisinopril", min_dose_mg=5, max_dose_mg=40),
    ]


def _make_gemini_output(*meds: tuple[str, str, str, str, str]) -> GeminiRecommendationOutput:
    """Helper to build GeminiRecommendationOutput from (med, dosage, freq, dur, rationale) tuples."""
    items = []
    for med, dosage, freq, dur, rat in meds:
        items.append(GeminiRecItem(
            medication=med,
            dosage=dosage,
            frequency=freq,
            duration=dur,
            rationale=rat,
            formulary_status="COVERED_PREFERRED",
        ))
    return GeminiRecommendationOutput(
        recommendations=items,
        clinical_reasoning="AI reasoning summary",
    )


def _make_request(
    *,
    allergies: list[str] | None = None,
    current_medications: list[str] | None = None,
    chief_complaint: str = "routine check-up",
) -> RecommendationRequest:
    return RecommendationRequest(
        visit_id=uuid.uuid4(),
        chief_complaint=chief_complaint,
        patient_id=uuid.uuid4(),
        current_medications=current_medications or [],
        allergies=allergies or [],
    )


# ===========================================================================
# §10.2 — Full recommendation pipeline tests
# ===========================================================================

class TestGenerateRecommendations:

    @pytest.mark.asyncio
    async def test_clean_patient_all_recommended(
        self,
        svc: PrescriptionService,
        mock_gemini: MagicMock,
        demo_formulary: list[FormularyEntryData],
        dose_ranges: list[DoseRangeData],
    ) -> None:
        """Clean patient → 3 options returned, all RECOMMENDED (no blocks)."""
        mock_gemini.generate_recommendations.return_value = _make_gemini_output(
            ("Metformin", "500mg", "twice daily", "ongoing", "First-line for T2DM"),
            ("Lisinopril", "10mg", "once daily", "ongoing", "BP control"),
            ("Amoxicillin", "500mg", "three times daily", "7 days", "Infection"),
        )
        request = _make_request()
        resp = await svc.generate_recommendations(
            request,
            formulary=demo_formulary,
            dose_ranges=dose_ranges,
        )
        assert isinstance(resp, RecommendationResponse)
        assert len(resp.recommendations) == 3
        for item in resp.recommendations:
            assert item.warnings == [] or all(
                "blocked" not in w.lower() for w in item.warnings
            )

    @pytest.mark.asyncio
    async def test_penicillin_allergy_blocks_amoxicillin(
        self,
        svc: PrescriptionService,
        mock_gemini: MagicMock,
        demo_formulary: list[FormularyEntryData],
        dose_ranges: list[DoseRangeData],
    ) -> None:
        """Patient with penicillin allergy → amoxicillin option has allergy FAIL warning."""
        mock_gemini.generate_recommendations.return_value = _make_gemini_output(
            ("Amoxicillin", "500mg", "three times daily", "7 days", "Infection"),
        )
        request = _make_request(allergies=["Penicillin"])
        resp = await svc.generate_recommendations(
            request,
            formulary=demo_formulary,
            dose_ranges=dose_ranges,
        )
        amox = resp.recommendations[0]
        assert any("allerg" in w.lower() for w in amox.warnings)

    @pytest.mark.asyncio
    async def test_warfarin_aspirin_interaction_blocked(
        self,
        svc: PrescriptionService,
        mock_gemini: MagicMock,
        demo_formulary: list[FormularyEntryData],
        interactions: list[DrugInteractionData],
        dose_ranges: list[DoseRangeData],
    ) -> None:
        """Patient on Warfarin, Gemini suggests Aspirin → BLOCKED with SEVERE interaction."""
        mock_gemini.generate_recommendations.return_value = _make_gemini_output(
            ("Aspirin", "81mg", "once daily", "ongoing", "Cardioprotective"),
        )
        request = _make_request(current_medications=["Warfarin"])
        resp = await svc.generate_recommendations(
            request,
            formulary=demo_formulary,
            drug_interactions=interactions,
            dose_ranges=dose_ranges,
        )
        aspirin = resp.recommendations[0]
        assert any("severe" in w.lower() for w in aspirin.warnings)

    @pytest.mark.asyncio
    async def test_analytics_emitted(
        self,
        svc: PrescriptionService,
        mock_gemini: MagicMock,
        analytics_svc: AnalyticsService,
        demo_formulary: list[FormularyEntryData],
    ) -> None:
        mock_gemini.generate_recommendations.return_value = _make_gemini_output(
            ("Metformin", "500mg", "twice daily", "ongoing", "T2DM"),
        )
        request = _make_request()
        await svc.generate_recommendations(request, formulary=demo_formulary)
        events = analytics_svc.pending_events
        assert any(e["event_type"] == "RECOMMENDATION_GENERATED" for e in events)


# ===========================================================================
# §10.2 — Approval / rejection tests
# ===========================================================================

class TestApproveRejectPrescription:

    @pytest.mark.asyncio
    async def test_approve_recommended_prescription(
        self,
        svc: PrescriptionService,
        mock_gemini: MagicMock,
        demo_formulary: list[FormularyEntryData],
    ) -> None:
        """Approve RECOMMENDED prescription → status APPROVED, receipt generated."""
        mock_gemini.generate_recommendations.return_value = _make_gemini_output(
            ("Metformin", "500mg", "twice daily", "ongoing", "T2DM"),
        )
        request = _make_request()
        resp = await svc.generate_recommendations(request, formulary=demo_formulary)
        assert len(resp.recommendations) == 1

        # Retrieve the persisted prescription ID
        rx_id = list(svc._store._prescriptions.keys())[0]
        approval = PrescriptionApprovalRequest(
            prescription_id=rx_id,
            confirmed_safety_review=True,
            comment="Looks good",
        )
        receipt = await svc.approve_prescription(
            approval,
            patient_name="Jane Doe",
            clinician_name="Dr. Smith",
        )
        assert receipt.status == "approved"
        assert receipt.drugs[0].drug_name == "Metformin"
        assert receipt.patient_name == "Jane Doe"

    @pytest.mark.asyncio
    async def test_approve_blocked_prescription_raises(
        self,
        svc: PrescriptionService,
        mock_gemini: MagicMock,
        demo_formulary: list[FormularyEntryData],
        interactions: list[DrugInteractionData],
    ) -> None:
        """Approve BLOCKED prescription → SafetyBlockError raised."""
        mock_gemini.generate_recommendations.return_value = _make_gemini_output(
            ("Aspirin", "81mg", "once daily", "ongoing", "Cardioprotective"),
        )
        request = _make_request(current_medications=["Warfarin"])
        await svc.generate_recommendations(
            request, formulary=demo_formulary, drug_interactions=interactions,
        )

        rx_id = list(svc._store._prescriptions.keys())[0]
        approval = PrescriptionApprovalRequest(
            prescription_id=rx_id,
            confirmed_safety_review=True,
        )
        with pytest.raises(SafetyBlockError):
            await svc.approve_prescription(approval)

    @pytest.mark.asyncio
    async def test_approve_without_safety_review_raises(
        self,
        svc: PrescriptionService,
        mock_gemini: MagicMock,
        demo_formulary: list[FormularyEntryData],
    ) -> None:
        """Approve without confirmed_safety_review → ValidationError raised."""
        mock_gemini.generate_recommendations.return_value = _make_gemini_output(
            ("Metformin", "500mg", "twice daily", "ongoing", "T2DM"),
        )
        request = _make_request()
        await svc.generate_recommendations(request, formulary=demo_formulary)

        rx_id = list(svc._store._prescriptions.keys())[0]
        approval = PrescriptionApprovalRequest(
            prescription_id=rx_id,
            confirmed_safety_review=False,
        )
        with pytest.raises(ValidationError):
            await svc.approve_prescription(approval)

    @pytest.mark.asyncio
    async def test_reject_prescription(
        self,
        svc: PrescriptionService,
        mock_gemini: MagicMock,
        analytics_svc: AnalyticsService,
        demo_formulary: list[FormularyEntryData],
    ) -> None:
        """Reject prescription → status REJECTED, analytics event emitted."""
        mock_gemini.generate_recommendations.return_value = _make_gemini_output(
            ("Metformin", "500mg", "twice daily", "ongoing", "T2DM"),
        )
        request = _make_request()
        await svc.generate_recommendations(request, formulary=demo_formulary)

        rx_id = list(svc._store._prescriptions.keys())[0]
        rejection = PrescriptionRejectionRequest(
            prescription_id=rx_id,
            reason="Patient declined",
        )
        await svc.reject_prescription(rejection)

        rx = svc._store.get_prescription(rx_id)
        assert rx is not None
        assert rx["status"] == "rejected"
        assert rx["rejection_reason"] == "Patient declined"
        events = analytics_svc.pending_events
        assert any(e["event_type"] == "OPTION_REJECTED" for e in events)


# ===========================================================================
# §10.2 — Receipt retrieval
# ===========================================================================

class TestGetReceipt:

    @pytest.mark.asyncio
    async def test_get_receipt_after_approval(
        self,
        svc: PrescriptionService,
        mock_gemini: MagicMock,
        demo_formulary: list[FormularyEntryData],
    ) -> None:
        mock_gemini.generate_recommendations.return_value = _make_gemini_output(
            ("Metformin", "500mg", "twice daily", "ongoing", "T2DM"),
        )
        request = _make_request()
        await svc.generate_recommendations(request, formulary=demo_formulary)

        rx_id = list(svc._store._prescriptions.keys())[0]
        approval = PrescriptionApprovalRequest(
            prescription_id=rx_id,
            confirmed_safety_review=True,
        )
        await svc.approve_prescription(approval)
        receipt = await svc.get_receipt(rx_id)
        assert receipt.status == "approved"

    @pytest.mark.asyncio
    async def test_get_receipt_not_found(self, svc: PrescriptionService) -> None:
        with pytest.raises(ResourceNotFoundError):
            await svc.get_receipt(uuid.uuid4())


# ===========================================================================
# §10.2 — Patient pack generation
# ===========================================================================

class TestGeneratePatientPack:

    @pytest.mark.asyncio
    async def test_patient_pack_for_approved(
        self,
        svc: PrescriptionService,
        mock_gemini: MagicMock,
        demo_formulary: list[FormularyEntryData],
    ) -> None:
        mock_gemini.generate_recommendations.return_value = _make_gemini_output(
            ("Metformin", "500mg", "twice daily", "ongoing", "T2DM"),
        )
        mock_gemini.generate_patient_instructions.return_value = PatientInstructionsOutput(
            medication_name="Metformin",
            purpose="Treats type 2 diabetes",
            how_to_take="Take with food",
        )
        request = _make_request()
        await svc.generate_recommendations(request, formulary=demo_formulary)

        rx_id = list(svc._store._prescriptions.keys())[0]
        approval = PrescriptionApprovalRequest(
            prescription_id=rx_id, confirmed_safety_review=True,
        )
        await svc.approve_prescription(approval)

        pack = await svc.generate_patient_pack(rx_id)
        assert pack.medication_name == "Metformin"
        assert pack.purpose == "Treats type 2 diabetes"

    @pytest.mark.asyncio
    async def test_patient_pack_for_non_approved_raises(
        self,
        svc: PrescriptionService,
        mock_gemini: MagicMock,
        demo_formulary: list[FormularyEntryData],
    ) -> None:
        mock_gemini.generate_recommendations.return_value = _make_gemini_output(
            ("Metformin", "500mg", "twice daily", "ongoing", "T2DM"),
        )
        request = _make_request()
        await svc.generate_recommendations(request, formulary=demo_formulary)

        rx_id = list(svc._store._prescriptions.keys())[0]
        with pytest.raises(ValidationError):
            await svc.generate_patient_pack(rx_id)


# ===========================================================================
# §10.2 — Standalone validation
# ===========================================================================

class TestValidatePrescriptions:

    @pytest.mark.asyncio
    async def test_validation_clean_drugs(
        self,
        svc: PrescriptionService,
        demo_formulary: list[FormularyEntryData],
        dose_ranges: list[DoseRangeData],
    ) -> None:
        request = ValidationRequest(
            visit_id=uuid.uuid4(),
            patient_id=uuid.uuid4(),
            proposed_drugs=[
                ProposedDrug(drug_name="Metformin", dosage="500mg", frequency="twice daily"),
                ProposedDrug(drug_name="Lisinopril", dosage="10mg", frequency="once daily"),
            ],
        )
        resp = await svc.validate_prescriptions(
            request,
            formulary=demo_formulary,
            dose_ranges=dose_ranges,
        )
        assert resp.all_passed is True
        assert resp.blocked is False
        assert len(resp.results) == 2

    @pytest.mark.asyncio
    async def test_validation_with_allergy_blocks(
        self,
        svc: PrescriptionService,
        demo_formulary: list[FormularyEntryData],
    ) -> None:
        request = ValidationRequest(
            visit_id=uuid.uuid4(),
            patient_id=uuid.uuid4(),
            proposed_drugs=[
                ProposedDrug(drug_name="Amoxicillin", dosage="500mg", frequency="tid"),
            ],
        )
        resp = await svc.validate_prescriptions(
            request,
            patient_allergies=["Penicillin"],
            formulary=demo_formulary,
        )
        assert resp.blocked is True
        assert len(resp.block_reasons) > 0
        assert resp.results[0].passed is False
