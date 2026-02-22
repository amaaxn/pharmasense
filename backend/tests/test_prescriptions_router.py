"""Prescription router tests (Part 2B §5).

Uses FastAPI TestClient with dependency-overridden PrescriptionService.
GeminiService is mocked; all deterministic services are real.
"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from pharmasense.exceptions import (
    ResourceNotFoundError,
    SafetyBlockError,
    ValidationError,
)
from pharmasense.schemas.formulary_service import FormularyEntryData
from pharmasense.schemas.gemini import (
    GeminiRecommendationOutput,
    PatientInstructionsOutput,
    RecommendationItem as GeminiRecItem,
)
from pharmasense.schemas.prescription_ops import (
    PrescriptionApprovalRequest,
    PrescriptionRejectionRequest,
)
from pharmasense.schemas.recommendation import RecommendationRequest
from pharmasense.schemas.rules_engine import DrugInteractionData
from pharmasense.schemas.validation import ProposedDrug, ValidationRequest
from pharmasense.routers.prescriptions import router, _get_prescription_service
from pharmasense.services.analytics_service import AnalyticsService
from pharmasense.services.formulary_service import FormularyService
from pharmasense.services.gemini_service import GeminiService
from pharmasense.services.prescription_service import PrescriptionService
from pharmasense.services.rules_engine_service import RulesEngineService


# ---------------------------------------------------------------------------
# App + fixtures
# ---------------------------------------------------------------------------

def _build_app(svc: PrescriptionService) -> FastAPI:
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[_get_prescription_service] = lambda: svc
    return app


def _mock_gemini() -> MagicMock:
    mock = MagicMock(spec=GeminiService)
    mock.generate_recommendations = AsyncMock()
    mock.generate_patient_instructions = AsyncMock()
    return mock


def _make_svc(mock_gemini: MagicMock | None = None) -> PrescriptionService:
    mg = mock_gemini or _mock_gemini()
    return PrescriptionService(
        gemini_service=mg,
        rules_engine=RulesEngineService(),
        formulary_service=FormularyService(),
        analytics_service=AnalyticsService(),
    )


def _gemini_output(*meds: tuple[str, str, str, str, str]) -> GeminiRecommendationOutput:
    items = [
        GeminiRecItem(
            medication=m, dosage=d, frequency=f, duration=dur,
            rationale=r, formulary_status="COVERED_PREFERRED",
        )
        for m, d, f, dur, r in meds
    ]
    return GeminiRecommendationOutput(
        recommendations=items, clinical_reasoning="test reasoning",
    )


# ---------------------------------------------------------------------------
# POST /api/prescriptions/recommend
# ---------------------------------------------------------------------------

class TestRecommendEndpoint:

    def test_recommend_success(self) -> None:
        mg = _mock_gemini()
        mg.generate_recommendations.return_value = _gemini_output(
            ("Metformin", "500mg", "twice daily", "ongoing", "T2DM"),
        )
        svc = _make_svc(mg)
        app = _build_app(svc)
        client = TestClient(app)

        payload = {
            "visit_id": str(uuid.uuid4()),
            "chief_complaint": "diabetes management",
            "patient_id": str(uuid.uuid4()),
        }
        resp = client.post("/api/prescriptions/recommend", json=payload)
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert len(body["data"]["recommendations"]) == 1


# ---------------------------------------------------------------------------
# POST /api/prescriptions/validate
# ---------------------------------------------------------------------------

class TestValidateEndpoint:

    def test_validate_clean(self) -> None:
        svc = _make_svc()
        app = _build_app(svc)
        client = TestClient(app)

        payload = {
            "visit_id": str(uuid.uuid4()),
            "patient_id": str(uuid.uuid4()),
            "proposed_drugs": [
                {"drug_name": "Metformin", "dosage": "500mg", "frequency": "twice daily"},
            ],
        }
        resp = client.post("/api/prescriptions/validate", json=payload)
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["data"]["all_passed"] is True


# ---------------------------------------------------------------------------
# POST /api/prescriptions/approve  +  reject
# ---------------------------------------------------------------------------

class TestApproveRejectEndpoints:

    def _seed_prescription(self, svc: PrescriptionService) -> uuid.UUID:
        """Directly insert a clean prescription into the in-memory store."""
        rx_id = uuid.uuid4()
        svc._store.save_prescription({
            "id": rx_id,
            "visit_id": uuid.uuid4(),
            "patient_id": uuid.uuid4(),
            "status": "recommended",
            "items": [
                {
                    "primary": {
                        "drug_name": "Metformin",
                        "generic_name": "Metformin",
                        "dosage": "500mg",
                        "frequency": "twice daily",
                        "duration": "ongoing",
                    },
                    "warnings": [],
                }
            ],
            "rules_results": [{"medication": "Metformin", "blocked": False}],
        })
        return rx_id

    def test_approve_success(self) -> None:
        svc = _make_svc()
        rx_id = self._seed_prescription(svc)
        app = _build_app(svc)
        client = TestClient(app)

        payload = {
            "prescription_id": str(rx_id),
            "confirmed_safety_review": True,
            "comment": "All good",
        }
        resp = client.post("/api/prescriptions/approve", json=payload)
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["data"]["status"] == "approved"

    def test_approve_without_safety_review_returns_400(self) -> None:
        svc = _make_svc()
        rx_id = self._seed_prescription(svc)
        app = _build_app(svc)
        client = TestClient(app)

        payload = {
            "prescription_id": str(rx_id),
            "confirmed_safety_review": False,
        }
        resp = client.post("/api/prescriptions/approve", json=payload)
        assert resp.status_code == 400

    def test_approve_blocked_returns_422(self) -> None:
        svc = _make_svc()
        rx_id = uuid.uuid4()
        svc._store.save_prescription({
            "id": rx_id,
            "visit_id": uuid.uuid4(),
            "patient_id": uuid.uuid4(),
            "status": "recommended",
            "items": [
                {
                    "primary": {"drug_name": "Aspirin"},
                    "warnings": ["SEVERE interaction: Aspirin + Warfarin"],
                }
            ],
            "rules_results": [{"medication": "Aspirin", "blocked": True}],
        })
        app = _build_app(svc)
        client = TestClient(app)

        payload = {
            "prescription_id": str(rx_id),
            "confirmed_safety_review": True,
        }
        resp = client.post("/api/prescriptions/approve", json=payload)
        assert resp.status_code == 422

    def test_approve_not_found_returns_404(self) -> None:
        svc = _make_svc()
        app = _build_app(svc)
        client = TestClient(app)

        payload = {
            "prescription_id": str(uuid.uuid4()),
            "confirmed_safety_review": True,
        }
        resp = client.post("/api/prescriptions/approve", json=payload)
        assert resp.status_code == 404

    def test_reject_success(self) -> None:
        svc = _make_svc()
        rx_id = self._seed_prescription(svc)
        app = _build_app(svc)
        client = TestClient(app)

        payload = {
            "prescription_id": str(rx_id),
            "reason": "Patient declined treatment",
        }
        resp = client.post("/api/prescriptions/reject", json=payload)
        assert resp.status_code == 200
        assert resp.json()["success"] is True

    def test_reject_not_found_returns_404(self) -> None:
        svc = _make_svc()
        app = _build_app(svc)
        client = TestClient(app)

        payload = {
            "prescription_id": str(uuid.uuid4()),
            "reason": "N/A",
        }
        resp = client.post("/api/prescriptions/reject", json=payload)
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/prescriptions/{id}/receipt
# ---------------------------------------------------------------------------

class TestReceiptEndpoint:

    def test_receipt_after_approval(self) -> None:
        svc = _make_svc()
        rx_id = uuid.uuid4()
        svc._store.save_prescription({
            "id": rx_id,
            "visit_id": uuid.uuid4(),
            "patient_id": uuid.uuid4(),
            "status": "recommended",
            "items": [
                {
                    "primary": {
                        "drug_name": "Lisinopril",
                        "generic_name": "Lisinopril",
                        "dosage": "10mg",
                        "frequency": "once daily",
                        "duration": "ongoing",
                    },
                    "warnings": [],
                }
            ],
            "rules_results": [{"medication": "Lisinopril", "blocked": False}],
        })
        app = _build_app(svc)
        client = TestClient(app)

        # Approve first
        client.post("/api/prescriptions/approve", json={
            "prescription_id": str(rx_id),
            "confirmed_safety_review": True,
        })

        resp = client.get(f"/api/prescriptions/{rx_id}/receipt")
        assert resp.status_code == 200
        body = resp.json()
        assert body["data"]["status"] == "approved"

    def test_receipt_not_found(self) -> None:
        svc = _make_svc()
        app = _build_app(svc)
        client = TestClient(app)

        resp = client.get(f"/api/prescriptions/{uuid.uuid4()}/receipt")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# POST /api/prescriptions/{id}/patient-pack
# ---------------------------------------------------------------------------

class TestPatientPackEndpoint:

    def test_patient_pack_for_approved(self) -> None:
        mg = _mock_gemini()
        mg.generate_patient_instructions.return_value = PatientInstructionsOutput(
            medication_name="Metformin",
            purpose="Controls blood sugar",
            how_to_take="Take with meals",
        )
        svc = _make_svc(mg)
        rx_id = uuid.uuid4()
        svc._store.save_prescription({
            "id": rx_id,
            "visit_id": uuid.uuid4(),
            "patient_id": uuid.uuid4(),
            "status": "approved",
            "items": [
                {
                    "primary": {
                        "drug_name": "Metformin",
                        "dosage": "500mg",
                        "frequency": "twice daily",
                        "duration": "ongoing",
                    },
                    "warnings": [],
                }
            ],
            "rules_results": [],
        })
        app = _build_app(svc)
        client = TestClient(app)

        resp = client.post(f"/api/prescriptions/{rx_id}/patient-pack")
        assert resp.status_code == 200
        assert resp.json()["data"]["medication_name"] == "Metformin"

    def test_patient_pack_not_approved_returns_400(self) -> None:
        svc = _make_svc()
        rx_id = uuid.uuid4()
        svc._store.save_prescription({
            "id": rx_id,
            "status": "recommended",
            "items": [{"primary": {"drug_name": "X"}, "warnings": []}],
            "rules_results": [],
        })
        app = _build_app(svc)
        client = TestClient(app)

        resp = client.post(f"/api/prescriptions/{rx_id}/patient-pack")
        assert resp.status_code == 400
