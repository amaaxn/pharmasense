"""Gemini output DTOs — Pydantic models for all structured Gemini responses.

Every field matches what the Gemini prompt instructs the model to output.
Use ``model_validate`` for parsing from JSON.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# 3.1  GeminiRecommendationOutput
# ---------------------------------------------------------------------------

class RecommendationAlternative(BaseModel):
    medication: str
    reason: str
    estimated_copay: float | None = None


class RecommendationItem(BaseModel):
    medication: str
    dosage: str
    frequency: str
    duration: str
    rationale: str
    formulary_status: str = Field(
        description="e.g. COVERED_PREFERRED, COVERED_NON_PREFERRED, NOT_COVERED"
    )
    estimated_copay: float | None = None
    requires_prior_auth: bool = False
    alternatives: list[RecommendationAlternative] = Field(default_factory=list)


class GeminiRecommendationOutput(BaseModel):
    recommendations: list[RecommendationItem] = Field(
        min_length=1,
        description="1-3 ranked prescription recommendations",
    )
    clinical_reasoning: str = Field(
        description="Brief summary of the clinical reasoning behind the recommendations"
    )


# ---------------------------------------------------------------------------
# 3.2  HandwritingExtractionOutput
# ---------------------------------------------------------------------------

class HandwritingExtractionOutput(BaseModel):
    raw_text: str = Field(description="Full transcription of the handwritten content")
    medications: list[str] = Field(default_factory=list)
    dosages: list[str] = Field(default_factory=list)
    diagnoses: list[str] = Field(default_factory=list)
    notes: str = Field(default="", description="Additional notes or context extracted")
    confidence: float = Field(
        ge=0.0, le=1.0,
        description="Overall confidence score for the extraction",
    )


# ---------------------------------------------------------------------------
# 3.3  InsuranceCardOutput
# ---------------------------------------------------------------------------

class InsuranceCardOutput(BaseModel):
    plan_name: str = Field(default="")
    member_id: str = Field(default="")
    group_number: str = Field(default="")
    payer_name: str = Field(default="")
    rx_bin: str = Field(default="")
    rx_pcn: str = Field(default="")
    rx_group: str = Field(default="")
    copay_primary: str = Field(default="", description="Primary care copay if visible")
    copay_specialist: str = Field(default="", description="Specialist copay if visible")
    copay_rx: str = Field(default="", description="Prescription copay if visible")
    effective_date: str = Field(default="")
    customer_service_phone: str = Field(default="")


# ---------------------------------------------------------------------------
# 3.4  FormularyExtractionOutput
# ---------------------------------------------------------------------------

class FormularyEntryExtracted(BaseModel):
    drug_name: str
    generic_name: str = Field(default="")
    tier: int = Field(ge=1, le=5, description="Formulary tier (1=preferred generic … 5=specialty)")
    copay_min: float | None = None
    copay_max: float | None = None
    requires_prior_auth: bool = False
    quantity_limit: str = Field(default="")
    step_therapy_required: bool = False
    notes: str = Field(default="")


class FormularyExtractionOutput(BaseModel):
    plan_name: str = Field(default="")
    effective_date: str = Field(default="")
    entries: list[FormularyEntryExtracted] = Field(
        min_length=1,
        description="Extracted formulary drug entries",
    )


# ---------------------------------------------------------------------------
# 3.5  StructuredExtractionOutput
# ---------------------------------------------------------------------------

class StructuredExtractionOutput(BaseModel):
    visit_reason: str = Field(default="")
    symptoms: list[str] = Field(default_factory=list)
    diagnoses: list[str] = Field(default_factory=list)
    medications_mentioned: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)
    vital_signs: dict[str, str] = Field(
        default_factory=dict,
        description="e.g. {'blood_pressure': '120/80', 'heart_rate': '72'}",
    )
    assessment: str = Field(default="")
    plan: str = Field(default="")


# ---------------------------------------------------------------------------
# 3.6  PatientInstructionsOutput
# ---------------------------------------------------------------------------

class PatientInstructionsOutput(BaseModel):
    medication_name: str
    purpose: str = Field(description="Plain-language explanation of what the medication treats")
    how_to_take: str = Field(description="Step-by-step dosing instructions in patient-friendly language")
    what_to_avoid: list[str] = Field(
        default_factory=list,
        description="Foods, activities, or other drugs to avoid",
    )
    side_effects: list[str] = Field(
        default_factory=list,
        description="Common side effects to be aware of",
    )
    when_to_seek_help: list[str] = Field(
        default_factory=list,
        description="Warning signs that require immediate medical attention",
    )
    storage_instructions: str = Field(default="")
    language: str = Field(default="en", description="ISO language code of the output")
