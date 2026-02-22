"""Visits router — /api/visits (Part 1 §6.3, Part 6 §1.1).

Emits ``VISIT_CREATED`` and ``VISIT_COMPLETED`` analytics events.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from pharmasense.dependencies.auth import AuthenticatedUser, get_current_user, require_role
from pharmasense.dependencies.database import get_db
from pharmasense.schemas.common import ApiResponse
from pharmasense.schemas.prescription_ops import AnalyticsEventType
from pharmasense.services.analytics_service import AnalyticsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/visits", tags=["visits"])


class CreateVisitRequest(BaseModel):
    patient_id: str
    chief_complaint: str | None = None


class CompleteVisitRequest(BaseModel):
    duration_minutes: float | None = None
    prescriptions_count: int = 0


def _get_analytics_service(db: AsyncSession = Depends(get_db)) -> AnalyticsService:
    return AnalyticsService(session=db)


@router.post("")
async def create_visit(
    request: CreateVisitRequest,
    user: AuthenticatedUser = Depends(require_role("clinician")),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[dict]:
    analytics = AnalyticsService(session=db)
    analytics.emit(
        AnalyticsEventType.VISIT_CREATED,
        {
            "visitId": "",
            "patientId": request.patient_id,
            "clinicianId": str(user.user_id),
        },
        user_id=str(user.user_id),
    )
    return ApiResponse(success=True, data={})


@router.get("")
async def list_visits(user: AuthenticatedUser = Depends(get_current_user)) -> ApiResponse[list]:
    return ApiResponse(success=True, data=[])


@router.get("/{visit_id}")
async def get_visit(visit_id: str, user: AuthenticatedUser = Depends(get_current_user)) -> ApiResponse[dict]:
    return ApiResponse(success=True, data={"visit_id": visit_id})


@router.put("/{visit_id}")
async def update_visit(visit_id: str, user: AuthenticatedUser = Depends(require_role("clinician"))) -> ApiResponse[dict]:
    return ApiResponse(success=True, data={"visit_id": visit_id})


@router.post("/{visit_id}/complete")
async def complete_visit(
    visit_id: str,
    request: CompleteVisitRequest,
    user: AuthenticatedUser = Depends(require_role("clinician")),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[dict]:
    analytics = AnalyticsService(session=db)
    analytics.emit(
        AnalyticsEventType.VISIT_COMPLETED,
        {
            "visitId": visit_id,
            "patientId": "",
            "clinicianId": str(user.user_id),
            "durationMinutes": request.duration_minutes,
            "prescriptionsCount": request.prescriptions_count,
        },
        user_id=str(user.user_id),
    )
    return ApiResponse(success=True, data={"visit_id": visit_id, "status": "completed"})


@router.post("/{visit_id}/extract")
async def extract_visit(visit_id: str, user: AuthenticatedUser = Depends(require_role("clinician"))) -> ApiResponse[dict]:
    return ApiResponse(success=True, data={"visit_id": visit_id})
