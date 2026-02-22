"""Rules engine DTOs (Part 2B §1.3).

Pure data containers for the deterministic safety layer.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class CheckType(str, Enum):
    ALLERGY = "ALLERGY"
    DRUG_INTERACTION = "DRUG_INTERACTION"
    DOSE_RANGE = "DOSE_RANGE"
    DUPLICATE_THERAPY = "DUPLICATE_THERAPY"


class CheckStatus(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    WARNING = "WARNING"


class InteractionSeverity(str, Enum):
    SEVERE = "SEVERE"
    MODERATE = "MODERATE"
    MILD = "MILD"


# ---------------------------------------------------------------------------
# Input
# ---------------------------------------------------------------------------

class DrugInteractionData(BaseModel):
    drug_a: str
    drug_b: str
    severity: str
    description: str = ""


class DoseRangeData(BaseModel):
    medication_name: str
    min_dose_mg: float
    max_dose_mg: float
    unit: str = "mg"
    frequency: str = "once daily"


class RulesEngineInput(BaseModel):
    medication_name: str
    dosage: str = ""
    patient_allergies: list[str] = Field(default_factory=list)
    current_medications: list[str] = Field(default_factory=list)
    drug_interactions: list[DrugInteractionData] = Field(default_factory=list)
    dose_ranges: list[DoseRangeData] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

class SafetyCheckResult(BaseModel):
    check_type: CheckType
    status: CheckStatus
    medication_name: str
    details: str = ""
    blocking: bool = False
    related_drug: str | None = None
    severity: str | None = None


class RulesEngineOutput(BaseModel):
    medication_name: str
    checks: list[SafetyCheckResult] = Field(default_factory=list)
    has_blocking_failure: bool = False
    overall_status: str = "PASS"
