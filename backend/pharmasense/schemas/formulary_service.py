"""Formulary service DTOs (Part 2B §3)."""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class CoverageStatus(str, Enum):
    COVERED = "COVERED"
    NOT_COVERED = "NOT_COVERED"
    PRIOR_AUTH_REQUIRED = "PRIOR_AUTH_REQUIRED"
    UNKNOWN = "UNKNOWN"


class FormularyEntryData(BaseModel):
    """In-memory representation of a formulary row — used by FormularyService."""

    drug_name: str
    generic_name: str = ""
    plan_name: str = ""
    tier: int = 1
    copay: float = 0.0
    is_covered: bool = True
    requires_prior_auth: bool = False
    quantity_limit: str = ""
    step_therapy_required: bool = False
    notes: str = ""


class CoverageResult(BaseModel):
    medication_name: str
    status: CoverageStatus
    tier: int | None = None
    tier_label: str | None = None
    copay: float | None = None
    is_covered: bool = False
    requires_prior_auth: bool = False
    plan_name: str = ""
    notes: str = ""


class AlternativeSuggestion(BaseModel):
    model_config = {"from_attributes": True}

    drug_name: str
    generic_name: str = ""
    tier: int = 1
    copay: float = 0.0
    reason: str = ""
