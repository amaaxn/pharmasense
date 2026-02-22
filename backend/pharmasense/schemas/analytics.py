"""Analytics event data schemas and dashboard DTOs (Part 6 §1.4, §2.7)."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# §1.4 — Per-event-type data payloads stored in AnalyticsEvent.event_data
# ---------------------------------------------------------------------------


class RecommendationGeneratedData(BaseModel):
    visit_id: str = Field(alias="visitId")
    total_options: int = Field(alias="totalOptions")
    blocked_count: int = Field(alias="blockedCount")
    warning_count: int = Field(alias="warningCount")

    model_config = {"populate_by_name": True}


class OptionBlockedData(BaseModel):
    visit_id: str = Field(alias="visitId")
    medication: str
    reason: str

    model_config = {"populate_by_name": True}


class OptionApprovedData(BaseModel):
    prescription_id: str = Field(alias="prescriptionId")
    medication: str
    copay: float | None = None
    visit_id: str = Field(alias="visitId")

    model_config = {"populate_by_name": True}


class OptionRejectedData(BaseModel):
    prescription_id: str = Field(alias="prescriptionId")
    medication: str
    reason: str

    model_config = {"populate_by_name": True}


class VoicePackGeneratedData(BaseModel):
    prescription_id: str = Field(alias="prescriptionId")
    language: str = "en"
    duration_seconds: float | None = Field(None, alias="durationSeconds")

    model_config = {"populate_by_name": True}


class PatientPackViewedData(BaseModel):
    prescription_id: str = Field(alias="prescriptionId")
    patient_id: str = Field(alias="patientId")

    model_config = {"populate_by_name": True}


class VisitCreatedData(BaseModel):
    visit_id: str = Field(alias="visitId")
    patient_id: str = Field(alias="patientId")
    clinician_id: str = Field(alias="clinicianId")

    model_config = {"populate_by_name": True}


class VisitCompletedData(BaseModel):
    visit_id: str = Field(alias="visitId")
    patient_id: str = Field(alias="patientId")
    clinician_id: str = Field(alias="clinicianId")
    duration_minutes: float | None = Field(None, alias="durationMinutes")
    prescriptions_count: int = Field(0, alias="prescriptionsCount")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# §2.7 — Snowflake / Dashboard DTOs
# ---------------------------------------------------------------------------


class CopaySavingsSummary(BaseModel):
    total_copay_saved: float = 0.0
    average_copay: float = 0.0
    total_prescriptions: int = 0


class CopayByStatus(BaseModel):
    coverage_status: str
    count: int = 0
    total_copay: float = 0.0


class SafetyBlockReason(BaseModel):
    block_type: str
    count: int = 0
    percentage: float = 0.0


class VisitEfficiency(BaseModel):
    total_visits: int = 0
    avg_duration_minutes: float = 0.0
    total_prescriptions: int = 0


class AdherenceRisk(BaseModel):
    medication: str
    copay: float
    tier: int | None = None
    coverage_status: str = "UNKNOWN"
    risk_level: str


class AnalyticsDashboardResponse(BaseModel):
    copay_savings: CopaySavingsSummary
    copay_by_status: list[CopayByStatus] = []
    safety_blocks: list[SafetyBlockReason] = []
    visit_efficiency: VisitEfficiency
    adherence_risks: list[AdherenceRisk] = []
    data_source: str = "local"
    last_synced_at: datetime | None = None


class EventCountByType(BaseModel):
    event_type: str
    count: int


class SyncResult(BaseModel):
    synced_count: int = 0
    failed_count: int = 0
    message: str = ""
