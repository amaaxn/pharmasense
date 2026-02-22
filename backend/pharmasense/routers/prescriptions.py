"""Prescription router — /api/prescriptions (Part 2B §5).

Each endpoint delegates to ``PrescriptionService`` and wraps the result in
the standard ``ApiResponse`` envelope.
"""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from pharmasense.config import settings
from pharmasense.dependencies.database import get_db
from pharmasense.exceptions import (
    ResourceNotFoundError,
    SafetyBlockError,
    ValidationError,
)
from pharmasense.models import DrugInteraction, DoseRange, FormularyEntry
from pharmasense.schemas.common import ApiResponse
from pharmasense.schemas.formulary_service import FormularyEntryData
from pharmasense.schemas.gemini import PatientInstructionsOutput
from pharmasense.schemas.prescription_ops import (
    PrescriptionApprovalRequest,
    PrescriptionRejectionRequest,
)
from pharmasense.schemas.receipt import PrescriptionReceipt
from pharmasense.schemas.recommendation import (
    RecommendationRequest,
    RecommendationResponse,
)
from pharmasense.schemas.rules_engine import DoseRangeData, DrugInteractionData
from pharmasense.schemas.validation import (
    ValidationRequest,
    ValidationResponse,
)
from pharmasense.services.analytics_service import AnalyticsService
from pharmasense.services.formulary_service import FormularyService
from pharmasense.services.gemini_service import GeminiService
from pharmasense.services.prescription_service import PrescriptionService
from pharmasense.services.rules_engine_service import RulesEngineService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/prescriptions", tags=["prescriptions"])

_gemini = GeminiService(settings)
_rules = RulesEngineService()
_formulary_svc = FormularyService()

_shared_store: Any = None


def _get_shared_store():
    from pharmasense.services.prescription_service import _InMemoryPrescriptionStore

    global _shared_store
    if _shared_store is None:
        _shared_store = _InMemoryPrescriptionStore()
    return _shared_store


def _get_prescription_service(
    db: AsyncSession = Depends(get_db),
) -> PrescriptionService:
    analytics = AnalyticsService(session=db)
    return PrescriptionService(
        gemini_service=_gemini,
        rules_engine=_rules,
        formulary_service=_formulary_svc,
        analytics_service=analytics,
        store=_get_shared_store(),
    )


async def _load_formulary(db: AsyncSession) -> list[FormularyEntryData]:
    result = await db.execute(select(FormularyEntry))
    rows = result.scalars().all()
    return [
        FormularyEntryData(
            drug_name=row.medication_name,
            generic_name=row.generic_name,
            plan_name=row.plan_name,
            tier=row.tier,
            copay=float(row.copay),
            is_covered=row.covered,
            requires_prior_auth=row.prior_auth_required,
            quantity_limit=row.quantity_limit,
            step_therapy_required=row.step_therapy_required,
        )
        for row in rows
    ]


async def _load_interactions(db: AsyncSession) -> list[DrugInteractionData]:
    result = await db.execute(select(DrugInteraction))
    rows = result.scalars().all()
    return [
        DrugInteractionData(
            drug_a=row.drug_a,
            drug_b=row.drug_b,
            severity=row.severity,
            description=row.description,
        )
        for row in rows
    ]


async def _load_dose_ranges(db: AsyncSession) -> list[DoseRangeData]:
    result = await db.execute(select(DoseRange))
    rows = result.scalars().all()
    return [
        DoseRangeData(
            medication_name=row.medication_name,
            min_dose_mg=row.min_dose_mg,
            max_dose_mg=row.max_dose_mg,
            unit=row.unit,
            frequency=row.frequency,
        )
        for row in rows
    ]


# ---------------------------------------------------------------------------
# POST /api/prescriptions/recommend
# ---------------------------------------------------------------------------

@router.post("/recommend", response_model=ApiResponse[RecommendationResponse])
async def recommend(
    request: RecommendationRequest,
    svc: PrescriptionService = Depends(_get_prescription_service),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[RecommendationResponse]:
    logger.info("Recommendation request for visit %s", request.visit_id)
    try:
        formulary = await _load_formulary(db)
        interactions = await _load_interactions(db)
        dose_ranges = await _load_dose_ranges(db)
        result = await svc.generate_recommendations(
            request,
            formulary=formulary,
            drug_interactions=interactions,
            dose_ranges=dose_ranges,
        )
        return ApiResponse(success=True, data=result)
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# POST /api/prescriptions/validate
# ---------------------------------------------------------------------------

@router.post("/validate", response_model=ApiResponse[ValidationResponse])
async def validate(
    request: ValidationRequest,
    svc: PrescriptionService = Depends(_get_prescription_service),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[ValidationResponse]:
    logger.info("Validation request for visit %s", request.visit_id)
    try:
        formulary = await _load_formulary(db)
        interactions = await _load_interactions(db)
        dose_ranges = await _load_dose_ranges(db)
        result = await svc.validate_prescriptions(
            request,
            drug_interactions=interactions,
            dose_ranges=dose_ranges,
            formulary=formulary,
        )
        return ApiResponse(success=True, data=result)
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# POST /api/prescriptions/approve
# ---------------------------------------------------------------------------

@router.post("/approve", response_model=ApiResponse[PrescriptionReceipt])
async def approve(
    request: PrescriptionApprovalRequest,
    svc: PrescriptionService = Depends(_get_prescription_service),
) -> ApiResponse[PrescriptionReceipt]:
    logger.info("Approval request for prescription %s", request.prescription_id)
    try:
        receipt = await svc.approve_prescription(request)
        return ApiResponse(success=True, data=receipt)
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except SafetyBlockError as exc:
        raise HTTPException(status_code=422, detail=exc.reason) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# POST /api/prescriptions/reject
# ---------------------------------------------------------------------------

@router.post("/reject", response_model=ApiResponse[None])
async def reject(
    request: PrescriptionRejectionRequest,
    svc: PrescriptionService = Depends(_get_prescription_service),
) -> ApiResponse[None]:
    logger.info("Rejection request for prescription %s", request.prescription_id)
    try:
        await svc.reject_prescription(request)
        return ApiResponse(success=True, data=None)
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# GET /api/prescriptions/{prescription_id}/receipt
# ---------------------------------------------------------------------------

@router.get("/{prescription_id}/receipt", response_model=ApiResponse[PrescriptionReceipt])
async def get_receipt(
    prescription_id: UUID,
    svc: PrescriptionService = Depends(_get_prescription_service),
) -> ApiResponse[PrescriptionReceipt]:
    logger.info("Receipt request for prescription %s", prescription_id)
    try:
        receipt = await svc.get_receipt(prescription_id)
        return ApiResponse(success=True, data=receipt)
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# POST /api/prescriptions/{prescription_id}/patient-pack
# ---------------------------------------------------------------------------

@router.post(
    "/{prescription_id}/patient-pack",
    response_model=ApiResponse[PatientInstructionsOutput],
)
async def generate_patient_pack(
    prescription_id: UUID,
    svc: PrescriptionService = Depends(_get_prescription_service),
) -> ApiResponse[PatientInstructionsOutput]:
    logger.info("Patient pack request for prescription %s", prescription_id)
    try:
        pack = await svc.generate_patient_pack(prescription_id)
        return ApiResponse(success=True, data=pack)
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# POST /api/prescriptions/{prescription_id}/pdf
# ---------------------------------------------------------------------------

@router.post("/{prescription_id}/pdf")
async def download_prescription_pdf(
    prescription_id: UUID,
    svc: PrescriptionService = Depends(_get_prescription_service),
) -> Response:
    logger.info("PDF request for prescription %s", prescription_id)
    try:
        from pharmasense.services.pdf_service import PdfService

        receipt = await svc.get_receipt(prescription_id)
        instructions = await svc.generate_patient_pack(prescription_id)
        pdf_bytes = PdfService().generate(receipt, instructions)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="prescription_{prescription_id}.pdf"'
            },
        )
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
