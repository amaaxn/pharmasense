"""Prescription operation DTOs (Part 2B §4.6–4.7)."""

from __future__ import annotations

from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class PrescriptionApprovalRequest(BaseModel):
    prescription_id: UUID
    confirmed_safety_review: bool
    comment: str | None = None


class PrescriptionRejectionRequest(BaseModel):
    prescription_id: UUID
    reason: str = Field(min_length=1)


class AnalyticsEventType(str, Enum):
    RECOMMENDATION_GENERATED = "RECOMMENDATION_GENERATED"
    OPTION_BLOCKED = "OPTION_BLOCKED"
    OPTION_APPROVED = "OPTION_APPROVED"
    OPTION_REJECTED = "OPTION_REJECTED"
    VOICE_PACK_GENERATED = "VOICE_PACK_GENERATED"
    PATIENT_PACK_VIEWED = "PATIENT_PACK_VIEWED"
