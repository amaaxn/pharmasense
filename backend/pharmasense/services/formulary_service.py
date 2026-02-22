"""FormularyService — formulary lookups, coverage, alternatives, ingestion (Part 2B §3).

Operates on ``FormularyEntryData`` objects.  When the DB layer is wired the
caller fetches rows via repository and passes them in; the service logic
itself is pure and fully testable without a database.
"""

from __future__ import annotations

import logging

from pharmasense.schemas.formulary_service import (
    AlternativeSuggestion,
    CoverageResult,
    CoverageStatus,
    FormularyEntryData,
)
from pharmasense.schemas.gemini import FormularyExtractionOutput

logger = logging.getLogger(__name__)

TIER_LABELS: dict[int, str] = {
    1: "Preferred Generic",
    2: "Non-Preferred Generic",
    3: "Preferred Brand",
    4: "Non-Preferred Brand",
    5: "Specialty",
}


class FormularyService:
    """Stateless formulary operations — inject formulary data via method args."""

    # ------------------------------------------------------------------
    # §3.4 — Coverage lookup
    # ------------------------------------------------------------------

    def lookup_coverage(
        self,
        medication_name: str,
        formulary: list[FormularyEntryData],
        *,
        generic_name: str = "",
        plan_name: str = "",
    ) -> CoverageResult:
        med_lower = medication_name.lower().strip()
        gen_lower = generic_name.lower().strip()

        match: FormularyEntryData | None = None
        for entry in formulary:
            if entry.drug_name.lower().strip() == med_lower:
                match = entry
                break
            if gen_lower and entry.generic_name.lower().strip() == gen_lower:
                match = entry
                break

        if match is None:
            return CoverageResult(
                medication_name=medication_name,
                status=CoverageStatus.UNKNOWN,
                plan_name=plan_name,
                notes="Medication not found in formulary",
            )

        if not match.is_covered:
            return CoverageResult(
                medication_name=medication_name,
                status=CoverageStatus.NOT_COVERED,
                tier=match.tier,
                tier_label=TIER_LABELS.get(match.tier),
                copay=None,
                is_covered=False,
                requires_prior_auth=match.requires_prior_auth,
                plan_name=match.plan_name or plan_name,
                notes=match.notes,
            )

        if match.requires_prior_auth:
            return CoverageResult(
                medication_name=medication_name,
                status=CoverageStatus.PRIOR_AUTH_REQUIRED,
                tier=match.tier,
                tier_label=TIER_LABELS.get(match.tier),
                copay=match.copay,
                is_covered=True,
                requires_prior_auth=True,
                plan_name=match.plan_name or plan_name,
                notes=match.notes,
            )

        return CoverageResult(
            medication_name=medication_name,
            status=CoverageStatus.COVERED,
            tier=match.tier,
            tier_label=TIER_LABELS.get(match.tier),
            copay=match.copay,
            is_covered=True,
            requires_prior_auth=False,
            plan_name=match.plan_name or plan_name,
            notes=match.notes,
        )

    # ------------------------------------------------------------------
    # §3.5 — Alternative suggestions
    # ------------------------------------------------------------------

    def find_alternatives(
        self,
        medication_name: str,
        formulary: list[FormularyEntryData],
        *,
        plan_name: str = "",
        max_results: int = 5,
    ) -> list[AlternativeSuggestion]:
        med_lower = medication_name.lower().strip()

        covered = [
            e for e in formulary
            if e.is_covered
            and e.drug_name.lower().strip() != med_lower
            and e.generic_name.lower().strip() != med_lower
        ]

        covered.sort(key=lambda e: (e.tier, e.copay))

        alternatives: list[AlternativeSuggestion] = []
        for entry in covered[:max_results]:
            tier_label = TIER_LABELS.get(entry.tier, f"Tier {entry.tier}")
            alternatives.append(AlternativeSuggestion(
                drug_name=entry.drug_name,
                generic_name=entry.generic_name,
                tier=entry.tier,
                copay=entry.copay,
                reason=f"{tier_label}, estimated copay ${entry.copay:.2f}",
            ))

        return alternatives

    # ------------------------------------------------------------------
    # §3.6 — Formulary ingestion from PDF extraction
    # ------------------------------------------------------------------

    def import_extracted_formulary(
        self,
        extraction: FormularyExtractionOutput,
        plan_name: str = "",
    ) -> list[FormularyEntryData]:
        """Convert Gemini PDF extraction output to formulary entries.

        Returns the list of ``FormularyEntryData`` objects ready for DB persistence.
        The actual DB write is the caller's responsibility (repository layer).
        """
        effective_plan = plan_name or extraction.plan_name
        entries: list[FormularyEntryData] = []

        for item in extraction.entries:
            copay = item.copay_min if item.copay_min is not None else 0.0
            entries.append(FormularyEntryData(
                drug_name=item.drug_name,
                generic_name=item.generic_name,
                plan_name=effective_plan,
                tier=item.tier,
                copay=copay,
                is_covered=True,
                requires_prior_auth=item.requires_prior_auth,
                quantity_limit=item.quantity_limit,
                step_therapy_required=item.step_therapy_required,
                notes=item.notes,
            ))

        logger.info(
            "Imported %d formulary entries for plan '%s'",
            len(entries), effective_plan,
        )
        return entries
