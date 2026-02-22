"""DTOs for POST /api/prescriptions/recommend — Gemini-powered recommendations."""

from uuid import UUID

from pydantic import BaseModel


class RecommendationRequest(BaseModel):
    visit_id: UUID
    chief_complaint: str
    patient_id: UUID
    current_medications: list[str] = []
    allergies: list[str] = []
    notes: str | None = None


class RecommendedDrug(BaseModel):
    drug_name: str
    generic_name: str
    dosage: str
    frequency: str
    duration: str
    route: str = "oral"
    rationale: str
    tier: int | None = None
    estimated_copay: float | None = None
    is_covered: bool | None = None
    requires_prior_auth: bool | None = None


class AlternativeDrug(BaseModel):
    drug_name: str
    generic_name: str
    dosage: str
    reason: str
    tier: int | None = None
    estimated_copay: float | None = None


class RecommendationItem(BaseModel):
    primary: RecommendedDrug
    alternatives: list[AlternativeDrug] = []
    warnings: list[str] = []


class RecommendationResponse(BaseModel):
    visit_id: UUID
    prescription_id: UUID | None = None
    recommendations: list[RecommendationItem]
    gemini_model: str = "gemini-2.5-flash"
    reasoning_summary: str | None = None
