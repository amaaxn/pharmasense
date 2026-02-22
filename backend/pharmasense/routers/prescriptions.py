"""Prescription router — /api/prescriptions (Part 2B §5).

Each endpoint delegates to ``PrescriptionService`` and wraps the result in
the standard ``ApiResponse`` envelope.
"""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from pharmasense.exceptions import (
    ResourceNotFoundError,
    SafetyBlockError,
    ValidationError,
)
from pharmasense.schemas.common import ApiResponse
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
from pharmasense.schemas.validation import (
    ValidationRequest,
    ValidationResponse,
)
from pharmasense.services.prescription_service import PrescriptionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/prescriptions", tags=["prescriptions"])


# ---------------------------------------------------------------------------
# Dependency placeholder — overridden in ``main.py`` with real wiring
# ---------------------------------------------------------------------------

def _get_prescription_service() -> PrescriptionService:
    raise NotImplementedError("PrescriptionService dependency not configured")


# ---------------------------------------------------------------------------
# POST /api/prescriptions/recommend
# ---------------------------------------------------------------------------

@router.post("/recommend", response_model=ApiResponse[RecommendationResponse])
async def recommend(
    request: RecommendationRequest,
    svc: PrescriptionService = Depends(_get_prescription_service),
) -> ApiResponse[RecommendationResponse]:
    logger.info("Recommendation request for visit %s", request.visit_id)
    try:
        result = await svc.generate_recommendations(request)
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
) -> ApiResponse[ValidationResponse]:
    logger.info("Validation request for visit %s", request.visit_id)
    try:
        result = await svc.validate_prescriptions(request)
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
