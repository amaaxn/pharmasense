"""DTOs for POST /api/prescriptions/validate — deterministic rules engine."""

from uuid import UUID

from pydantic import BaseModel


class ProposedDrug(BaseModel):
    drug_name: str
    generic_name: str = ""
    dosage: str
    frequency: str
    duration: str = ""
    route: str = "oral"


class ValidationRequest(BaseModel):
    visit_id: UUID
    patient_id: UUID
    proposed_drugs: list[ProposedDrug]


class ValidationFlag(BaseModel):
    rule: str
    severity: str
    drug: str
    message: str
    related_drug: str | None = None
    related_allergy: str | None = None


class DrugValidationResult(BaseModel):
    drug_name: str
    passed: bool
    tier: int | None = None
    copay: float | None = None
    is_covered: bool | None = None
    requires_prior_auth: bool = False
    flags: list[ValidationFlag] = []


class ValidationResponse(BaseModel):
    visit_id: UUID
    patient_id: UUID
    all_passed: bool
    results: list[DrugValidationResult]
    blocked: bool
    block_reasons: list[str] = []
