"""Coverage-Aware Safety Receipt — the signature DTO.

Every approved prescription produces one of these shareable objects.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ReceiptDrugItem(BaseModel):
    drug_name: str
    generic_name: str
    dosage: str
    frequency: str
    duration: str
    route: str = "oral"
    tier: int | None = None
    tier_label: str | None = None
    copay: float | None = None
    is_covered: bool = True
    requires_prior_auth: bool = False


class SafetyCheck(BaseModel):
    check_type: str
    passed: bool
    severity: str | None = None
    message: str


class ReceiptSafetySummary(BaseModel):
    all_passed: bool
    checks: list[SafetyCheck]
    allergy_flags: list[str]
    interaction_flags: list[str]
    dose_range_flags: list[str]


class ReceiptCoverageSummary(BaseModel):
    plan_name: str
    member_id: str
    total_copay: float
    items_covered: int
    items_not_covered: int
    prior_auth_required: list[str]


class PrescriptionReceipt(BaseModel):
    receipt_id: UUID
    prescription_id: UUID
    visit_id: UUID
    patient_id: UUID
    clinician_id: UUID
    patient_name: str
    clinician_name: str
    issued_at: datetime
    status: str

    drugs: list[ReceiptDrugItem]
    safety: ReceiptSafetySummary
    coverage: ReceiptCoverageSummary

    notes: str | None = None
    signature_hash: str | None = None
