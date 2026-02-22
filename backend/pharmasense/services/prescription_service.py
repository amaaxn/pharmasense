"""PrescriptionService — the central orchestrator (Part 2B §4).

Ties the AI layer (GeminiService) to the safety layer (RulesEngineService)
and the coverage layer (FormularyService).  Manages the full lifecycle of a
prescription: recommendation → validation → approval/rejection → receipt.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from pharmasense.exceptions import (
    ResourceNotFoundError,
    SafetyBlockError,
    ValidationError,
)
from pharmasense.schemas.formulary_service import (
    AlternativeSuggestion,
    CoverageResult,
    CoverageStatus,
    FormularyEntryData,
)
from pharmasense.schemas.gemini import (
    GeminiRecommendationOutput,
    PatientInstructionsOutput,
    RecommendationItem as GeminiRecItem,
)
from pharmasense.schemas.prescription_ops import (
    AnalyticsEventType,
    PrescriptionApprovalRequest,
    PrescriptionRejectionRequest,
)
from pharmasense.schemas.receipt import (
    PrescriptionReceipt,
    ReceiptAlternative,
    ReceiptCoverageSummary,
    ReceiptDrugItem,
    ReceiptReasoning,
    ReceiptSafetySummary,
    SafetyCheck as ReceiptSafetyCheck,
)
from pharmasense.schemas.recommendation import (
    AlternativeDrug,
    RecommendationItem,
    RecommendationRequest,
    RecommendationResponse,
    RecommendedDrug,
)
from pharmasense.schemas.rules_engine import (
    CheckStatus,
    CheckType,
    DoseRangeData,
    DrugInteractionData,
    RulesEngineInput,
    RulesEngineOutput,
    SafetyCheckResult,
)
from pharmasense.schemas.validation import (
    DrugValidationResult,
    ProposedDrug,
    ValidationFlag,
    ValidationRequest,
    ValidationResponse,
)
from pharmasense.services.analytics_service import AnalyticsService
from pharmasense.services.formulary_service import FormularyService
from pharmasense.services.gemini_service import GeminiService
from pharmasense.services.rules_engine_service import RulesEngineService

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# In-memory prescription store — replaced by a real repo when DB is wired
# ---------------------------------------------------------------------------

class _InMemoryPrescriptionStore:
    """Minimal stand-in so the orchestrator logic is self-contained and testable."""

    def __init__(self) -> None:
        self._prescriptions: dict[UUID, dict[str, Any]] = {}
        self._receipts: dict[UUID, PrescriptionReceipt] = {}

    def save_prescription(self, rx: dict[str, Any]) -> UUID:
        rx_id = rx.get("id") or uuid.uuid4()
        rx["id"] = rx_id
        self._prescriptions[rx_id] = rx
        return rx_id

    def get_prescription(self, rx_id: UUID) -> dict[str, Any] | None:
        return self._prescriptions.get(rx_id)

    def save_receipt(self, rx_id: UUID, receipt: PrescriptionReceipt) -> None:
        self._receipts[rx_id] = receipt

    def get_receipt(self, rx_id: UUID) -> PrescriptionReceipt | None:
        return self._receipts.get(rx_id)

    def list_by_visit(self, visit_id: UUID) -> list[dict[str, Any]]:
        return [rx for rx in self._prescriptions.values() if str(rx.get("visit_id")) == str(visit_id)]


class PrescriptionService:
    """Central orchestrator for the prescription lifecycle."""

    def __init__(
        self,
        gemini_service: GeminiService,
        rules_engine: RulesEngineService,
        formulary_service: FormularyService,
        analytics_service: AnalyticsService,
        *,
        store: _InMemoryPrescriptionStore | None = None,
    ) -> None:
        self._gemini = gemini_service
        self._rules = rules_engine
        self._formulary = formulary_service
        self._analytics = analytics_service
        self._store = store or _InMemoryPrescriptionStore()

    # ==================================================================
    # §4.5 — Full recommendation pipeline (the most important method)
    # ==================================================================

    async def generate_recommendations(
        self,
        request: RecommendationRequest,
        *,
        formulary: list[FormularyEntryData] | None = None,
        drug_interactions: list[DrugInteractionData] | None = None,
        dose_ranges: list[DoseRangeData] | None = None,
        medical_history: str = "",
        insurance_plan_name: str = "",
    ) -> RecommendationResponse:
        formulary = formulary or []
        drug_interactions = drug_interactions or []
        dose_ranges = dose_ranges or []

        # Step 1: Ask Gemini for recommendations
        gemini_out: GeminiRecommendationOutput = (
            await self._gemini.generate_recommendations(
                visit_reason=request.chief_complaint,
                visit_notes=request.notes or "",
                symptoms=[],
                allergies=request.allergies,
                current_medications=request.current_medications,
                medical_history=medical_history,
                insurance_plan_name=insurance_plan_name,
                formulary_data=[e.model_dump() for e in formulary],
            )
        )

        # Step 2–5: For each Gemini option, run rules engine + coverage
        annotated: list[RecommendationItem] = []
        blocking_flags: list[bool] = []
        blocked_count = 0
        warning_count = 0

        for gem_item in gemini_out.recommendations:
            # 2. Rules engine evaluation
            engine_input = RulesEngineInput(
                medication_name=gem_item.medication,
                dosage=gem_item.dosage,
                patient_allergies=request.allergies,
                current_medications=request.current_medications,
                drug_interactions=drug_interactions,
                dose_ranges=dose_ranges,
            )
            rules_out: RulesEngineOutput = self._rules.evaluate(engine_input)

            # 3. Coverage lookup
            coverage: CoverageResult = self._formulary.lookup_coverage(
                gem_item.medication,
                formulary,
                plan_name=insurance_plan_name,
            )

            # 4. Find alternatives if not covered or too expensive
            alts: list[AlternativeSuggestion] = []
            if coverage.status != CoverageStatus.COVERED:
                alts = self._formulary.find_alternatives(
                    gem_item.medication,
                    formulary,
                    plan_name=insurance_plan_name,
                    max_results=3,
                )

            # 5. Build annotated item
            warnings: list[str] = []
            for check in rules_out.checks:
                if check.status in (CheckStatus.FAIL, CheckStatus.WARNING):
                    warnings.append(check.details)

            if rules_out.has_blocking_failure:
                blocked_count += 1
                for check in rules_out.checks:
                    if check.blocking:
                        self._analytics.emit(
                            AnalyticsEventType.OPTION_BLOCKED,
                            {
                                "visitId": str(request.visit_id),
                                "medication": gem_item.medication,
                                "reason": check.details,
                            },
                        )
            if warnings:
                warning_count += len(warnings)

            primary = RecommendedDrug(
                drug_name=gem_item.medication,
                generic_name=gem_item.medication,
                dosage=gem_item.dosage,
                frequency=gem_item.frequency,
                duration=gem_item.duration,
                rationale=gem_item.rationale,
                tier=coverage.tier,
                estimated_copay=coverage.copay,
                is_covered=coverage.is_covered,
                requires_prior_auth=coverage.requires_prior_auth,
            )

            alt_drugs = [
                AlternativeDrug(
                    drug_name=a.drug_name,
                    generic_name=a.generic_name,
                    dosage="",
                    reason=a.reason,
                    tier=a.tier,
                    estimated_copay=a.copay,
                )
                for a in alts
            ]

            is_blocked = rules_out.has_blocking_failure

            annotated.append(RecommendationItem(
                primary=primary,
                alternatives=alt_drugs,
                warnings=warnings,
            ))
            blocking_flags.append(is_blocked)

        # Step 6: Persist prescription in the store
        rx_id = self._store.save_prescription({
            "visit_id": request.visit_id,
            "patient_id": request.patient_id,
            "status": "recommended",
            "items": [item.model_dump() for item in annotated],
            "rules_results": [
                {"medication": item.primary.drug_name, "blocked": bf}
                for item, bf in zip(annotated, blocking_flags)
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

        # Step 7: Emit analytics
        self._analytics.emit(
            AnalyticsEventType.RECOMMENDATION_GENERATED,
            {
                "visitId": str(request.visit_id),
                "totalOptions": len(annotated),
                "blockedCount": blocked_count,
                "warningCount": warning_count,
            },
        )

        return RecommendationResponse(
            visit_id=request.visit_id,
            prescription_id=rx_id,
            recommendations=annotated,
            gemini_model=self._gemini._model,
            reasoning_summary=gemini_out.clinical_reasoning,
        )

    # ==================================================================
    # §4.4 — Standalone validation (rules engine only)
    # ==================================================================

    async def validate_prescriptions(
        self,
        request: ValidationRequest,
        *,
        patient_allergies: list[str] | None = None,
        current_medications: list[str] | None = None,
        drug_interactions: list[DrugInteractionData] | None = None,
        dose_ranges: list[DoseRangeData] | None = None,
        formulary: list[FormularyEntryData] | None = None,
    ) -> ValidationResponse:
        patient_allergies = patient_allergies or []
        current_medications = current_medications or []
        drug_interactions = drug_interactions or []
        dose_ranges = dose_ranges or []
        formulary = formulary or []

        results: list[DrugValidationResult] = []
        all_passed = True
        blocked = False
        block_reasons: list[str] = []

        for drug in request.proposed_drugs:
            engine_input = RulesEngineInput(
                medication_name=drug.drug_name,
                dosage=drug.dosage,
                patient_allergies=patient_allergies,
                current_medications=current_medications,
                drug_interactions=drug_interactions,
                dose_ranges=dose_ranges,
            )
            rules_out = self._rules.evaluate(engine_input)

            coverage = self._formulary.lookup_coverage(
                drug.drug_name,
                formulary,
            )

            flags: list[ValidationFlag] = []
            for check in rules_out.checks:
                if check.status != CheckStatus.PASS:
                    flags.append(ValidationFlag(
                        rule=check.check_type.value,
                        severity="BLOCKING" if check.blocking else check.status.value,
                        drug=check.medication_name,
                        message=check.details,
                        related_drug=check.related_drug,
                    ))

            passed = not rules_out.has_blocking_failure
            if not passed:
                all_passed = False
                blocked = True
                for check in rules_out.checks:
                    if check.blocking:
                        block_reasons.append(check.details)

            results.append(DrugValidationResult(
                drug_name=drug.drug_name,
                passed=passed,
                tier=coverage.tier,
                copay=coverage.copay,
                is_covered=coverage.is_covered,
                requires_prior_auth=coverage.requires_prior_auth,
                flags=flags,
            ))

        return ValidationResponse(
            visit_id=request.visit_id,
            patient_id=request.patient_id,
            all_passed=all_passed,
            results=results,
            blocked=blocked,
            block_reasons=block_reasons,
        )

    # ==================================================================
    # §4.6 — Prescription approval
    # ==================================================================

    async def approve_prescription(
        self,
        request: PrescriptionApprovalRequest,
        *,
        patient_name: str = "Patient",
        clinician_name: str = "Clinician",
        patient_id: UUID | None = None,
        clinician_id: UUID | None = None,
        visit_id: UUID | None = None,
        plan_name: str = "",
        member_id: str = "",
    ) -> PrescriptionReceipt:
        if not request.confirmed_safety_review:
            raise ValidationError(
                field="confirmed_safety_review",
                message="Safety review must be confirmed before approval",
                operation="approve_prescription",
            )

        rx = self._store.get_prescription(request.prescription_id)
        if rx is None:
            raise ResourceNotFoundError("Prescription", str(request.prescription_id))

        # Block approval of blocked prescriptions
        rules_results = rx.get("rules_results", [])
        for rr in rules_results:
            if rr.get("blocked"):
                items = rx.get("items", [])
                for item in items:
                    if isinstance(item, dict):
                        warnings = item.get("warnings", [])
                        if warnings:
                            raise SafetyBlockError(
                                f"Cannot approve blocked prescription: {warnings[0]}"
                            )
                raise SafetyBlockError(
                    "Cannot approve prescription with blocking safety failures"
                )

        # Build receipt
        rx["status"] = "approved"
        rx["approved_at"] = datetime.now(timezone.utc).isoformat()
        self._store.save_prescription(rx)

        receipt = self._build_receipt(
            prescription_id=request.prescription_id,
            rx=rx,
            patient_name=patient_name,
            clinician_name=clinician_name,
            patient_id=patient_id or rx.get("patient_id", uuid.uuid4()),
            clinician_id=clinician_id or uuid.uuid4(),
            visit_id=visit_id or rx.get("visit_id", uuid.uuid4()),
            plan_name=plan_name,
            member_id=member_id,
        )
        self._store.save_receipt(request.prescription_id, receipt)

        self._analytics.emit(
            AnalyticsEventType.OPTION_APPROVED,
            {
                "prescriptionId": str(request.prescription_id),
                "medication": receipt.drugs[0].drug_name if receipt.drugs else "",
                "copay": receipt.coverage.total_copay,
                "visitId": str(receipt.visit_id),
            },
        )

        return receipt

    # ==================================================================
    # §4.7 — Prescription rejection
    # ==================================================================

    async def reject_prescription(
        self,
        request: PrescriptionRejectionRequest,
    ) -> None:
        rx = self._store.get_prescription(request.prescription_id)
        if rx is None:
            raise ResourceNotFoundError("Prescription", str(request.prescription_id))

        rx["status"] = "rejected"
        rx["rejection_reason"] = request.reason
        self._store.save_prescription(rx)

        self._analytics.emit(
            AnalyticsEventType.OPTION_REJECTED,
            {
                "prescriptionId": str(request.prescription_id),
                "medication": "",
                "reason": request.reason,
            },
        )

    # ==================================================================
    # §4.4 — Get receipt
    # ==================================================================

    async def get_receipt(self, prescription_id: UUID) -> PrescriptionReceipt:
        receipt = self._store.get_receipt(prescription_id)
        if receipt is None:
            raise ResourceNotFoundError("Receipt", str(prescription_id))
        return receipt

    # ==================================================================
    # §4.4 — Generate patient pack
    # ==================================================================

    async def generate_patient_pack(
        self,
        prescription_id: UUID,
        *,
        patient_allergies: list[str] | None = None,
        current_medications: list[str] | None = None,
        language: str = "en",
    ) -> PatientInstructionsOutput:
        rx = self._store.get_prescription(prescription_id)
        if rx is None:
            raise ResourceNotFoundError("Prescription", str(prescription_id))

        if rx.get("status") != "approved":
            raise ValidationError(
                field="status",
                message="Patient pack can only be generated for approved prescriptions",
                operation="generate_patient_pack",
            )

        items = rx.get("items", [])
        if not items:
            raise ValidationError(
                field="items",
                message="Prescription has no items",
                operation="generate_patient_pack",
            )

        first_item = items[0]
        if isinstance(first_item, dict):
            primary = first_item.get("primary", first_item)
            med_name = primary.get("drug_name", "")
            dosage = primary.get("dosage", "")
            frequency = primary.get("frequency", "")
            duration = primary.get("duration", "")
        else:
            med_name = getattr(first_item, "drug_name", "")
            dosage = getattr(first_item, "dosage", "")
            frequency = getattr(first_item, "frequency", "")
            duration = getattr(first_item, "duration", "")

        return await self._gemini.generate_patient_instructions(
            medication=med_name,
            dosage=dosage,
            frequency=frequency,
            duration=duration,
            patient_allergies=patient_allergies or [],
            current_medications=current_medications or [],
            language=language,
        )

    # ==================================================================
    # §4.8 — Receipt builder (private)
    # ==================================================================

    def _build_receipt(
        self,
        *,
        prescription_id: UUID,
        rx: dict[str, Any],
        patient_name: str,
        clinician_name: str,
        patient_id: UUID,
        clinician_id: UUID,
        visit_id: UUID,
        plan_name: str = "",
        member_id: str = "",
    ) -> PrescriptionReceipt:
        drugs: list[ReceiptDrugItem] = []
        safety_checks: list[ReceiptSafetyCheck] = []
        allergy_flags: list[str] = []
        interaction_flags: list[str] = []
        dose_flags: list[str] = []
        total_copay = 0.0
        items_covered = 0
        items_not_covered = 0
        prior_auth_drugs: list[str] = []

        for item in rx.get("items", []):
            if isinstance(item, dict):
                primary = item.get("primary", item)
                warnings = item.get("warnings", [])
            else:
                primary = item
                warnings = []

            drug_name = primary.get("drug_name", "") if isinstance(primary, dict) else ""
            generic = primary.get("generic_name", drug_name) if isinstance(primary, dict) else drug_name
            dosage = primary.get("dosage", "") if isinstance(primary, dict) else ""
            frequency = primary.get("frequency", "") if isinstance(primary, dict) else ""
            duration = primary.get("duration", "") if isinstance(primary, dict) else ""
            tier = primary.get("tier") if isinstance(primary, dict) else None
            copay = primary.get("estimated_copay") if isinstance(primary, dict) else None
            is_covered = primary.get("is_covered", True) if isinstance(primary, dict) else True
            pa = primary.get("requires_prior_auth", False) if isinstance(primary, dict) else False

            drugs.append(ReceiptDrugItem(
                drug_name=drug_name,
                generic_name=generic,
                dosage=dosage,
                frequency=frequency,
                duration=duration,
                tier=tier,
                copay=copay,
                is_covered=is_covered,
                requires_prior_auth=pa,
            ))

            if copay is not None:
                total_copay += copay
            if is_covered:
                items_covered += 1
            else:
                items_not_covered += 1
            if pa:
                prior_auth_drugs.append(drug_name)

            # Categorise warnings into safety buckets
            for w in warnings:
                w_lower = w.lower()
                has_issue = True
                if "allerg" in w_lower:
                    allergy_flags.append(w)
                elif "interaction" in w_lower:
                    interaction_flags.append(w)
                elif "dose" in w_lower:
                    dose_flags.append(w)
                else:
                    has_issue = False

                safety_checks.append(ReceiptSafetyCheck(
                    check_type="WARNING" if has_issue else "INFO",
                    passed=not has_issue,
                    severity="WARNING",
                    message=w,
                ))

        all_passed = not allergy_flags and not interaction_flags and not dose_flags

        # Build alternatives from recommendation items
        receipt_alternatives: list[ReceiptAlternative] = []
        for item in rx.get("items", []):
            alts = item.get("alternatives", []) if isinstance(item, dict) else []
            for alt in alts:
                if isinstance(alt, dict):
                    receipt_alternatives.append(ReceiptAlternative(
                        drug_name=alt.get("drug_name", ""),
                        copay=alt.get("estimated_copay"),
                        coverage_status=alt.get("coverage_status", "UNKNOWN"),
                        reason=alt.get("reason", ""),
                    ))

        # Build reasoning from the prescription's rationale
        reasoning = None
        first_item = rx.get("items", [None])[0] if rx.get("items") else None
        if first_item and isinstance(first_item, dict):
            rationale = first_item.get("rationale", "")
            if rationale:
                reasoning = ReceiptReasoning(
                    clinician_summary=rationale,
                    patient_explanation=rationale,
                )

        return PrescriptionReceipt(
            receipt_id=uuid.uuid4(),
            prescription_id=prescription_id,
            visit_id=visit_id,
            patient_id=patient_id,
            clinician_id=clinician_id,
            patient_name=patient_name,
            clinician_name=clinician_name,
            issued_at=datetime.now(timezone.utc),
            status="approved",
            drugs=drugs,
            safety=ReceiptSafetySummary(
                all_passed=all_passed,
                checks=safety_checks,
                allergy_flags=allergy_flags,
                interaction_flags=interaction_flags,
                dose_range_flags=dose_flags,
            ),
            coverage=ReceiptCoverageSummary(
                plan_name=plan_name,
                member_id=member_id,
                total_copay=total_copay,
                items_covered=items_covered,
                items_not_covered=items_not_covered,
                prior_auth_required=prior_auth_drugs,
            ),
            alternatives=receipt_alternatives,
            reasoning=reasoning,
        )
