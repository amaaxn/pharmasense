"""FormularyService tests — Part 2B §10.1 coverage cases + alternatives + ingestion."""

from __future__ import annotations

import pytest

from pharmasense.schemas.formulary_service import (
    AlternativeSuggestion,
    CoverageResult,
    CoverageStatus,
    FormularyEntryData,
)
from pharmasense.schemas.gemini import (
    FormularyEntryExtracted,
    FormularyExtractionOutput,
)
from pharmasense.services.formulary_service import FormularyService


# ---------------------------------------------------------------------------
# Fixtures — DEMO_PLAN seed data
# ---------------------------------------------------------------------------

@pytest.fixture
def demo_formulary() -> list[FormularyEntryData]:
    return [
        FormularyEntryData(
            drug_name="Metformin", generic_name="metformin",
            plan_name="DEMO_PLAN", tier=1, copay=5.0,
            is_covered=True, requires_prior_auth=False,
        ),
        FormularyEntryData(
            drug_name="Lisinopril", generic_name="lisinopril",
            plan_name="DEMO_PLAN", tier=1, copay=10.0,
            is_covered=True, requires_prior_auth=False,
        ),
        FormularyEntryData(
            drug_name="Eliquis", generic_name="apixaban",
            plan_name="DEMO_PLAN", tier=3, copay=75.0,
            is_covered=True, requires_prior_auth=True,
        ),
        FormularyEntryData(
            drug_name="Atorvastatin", generic_name="atorvastatin",
            plan_name="DEMO_PLAN", tier=1, copay=8.0,
            is_covered=True, requires_prior_auth=False,
        ),
        FormularyEntryData(
            drug_name="BrandOnlyDrug", generic_name="brandonly",
            plan_name="DEMO_PLAN", tier=4, copay=150.0,
            is_covered=False, requires_prior_auth=False,
        ),
    ]


@pytest.fixture
def svc() -> FormularyService:
    return FormularyService()


# ---------------------------------------------------------------------------
# §10.1 — Coverage found
# ---------------------------------------------------------------------------

class TestLookupCoverage:

    def test_coverage_found_metformin(
        self, svc: FormularyService, demo_formulary: list[FormularyEntryData],
    ) -> None:
        """Metformin in DEMO_PLAN → COVERED, Tier 1, copay=$5."""
        result = svc.lookup_coverage("Metformin", demo_formulary, plan_name="DEMO_PLAN")
        assert result.status == CoverageStatus.COVERED
        assert result.tier == 1
        assert result.copay == 5.0
        assert result.is_covered is True
        assert result.requires_prior_auth is False

    def test_coverage_not_found_unknown_drug(
        self, svc: FormularyService, demo_formulary: list[FormularyEntryData],
    ) -> None:
        """ExperimentalDrug not in any plan → UNKNOWN."""
        result = svc.lookup_coverage("ExperimentalDrug", demo_formulary, plan_name="DEMO_PLAN")
        assert result.status == CoverageStatus.UNKNOWN
        assert result.is_covered is False

    def test_coverage_prior_auth_required(
        self, svc: FormularyService, demo_formulary: list[FormularyEntryData],
    ) -> None:
        """Eliquis in DEMO_PLAN → PRIOR_AUTH_REQUIRED, Tier 3."""
        result = svc.lookup_coverage("Eliquis", demo_formulary, plan_name="DEMO_PLAN")
        assert result.status == CoverageStatus.PRIOR_AUTH_REQUIRED
        assert result.tier == 3
        assert result.requires_prior_auth is True
        assert result.copay == 75.0

    def test_coverage_not_covered(
        self, svc: FormularyService, demo_formulary: list[FormularyEntryData],
    ) -> None:
        """BrandOnlyDrug with is_covered=False → NOT_COVERED."""
        result = svc.lookup_coverage("BrandOnlyDrug", demo_formulary, plan_name="DEMO_PLAN")
        assert result.status == CoverageStatus.NOT_COVERED
        assert result.is_covered is False

    def test_coverage_generic_name_match(
        self, svc: FormularyService, demo_formulary: list[FormularyEntryData],
    ) -> None:
        """Lookup by generic name 'apixaban' → matches Eliquis."""
        result = svc.lookup_coverage(
            "SomeBrandApixaban", demo_formulary,
            generic_name="apixaban", plan_name="DEMO_PLAN",
        )
        assert result.status == CoverageStatus.PRIOR_AUTH_REQUIRED
        assert result.tier == 3

    def test_case_insensitive_match(
        self, svc: FormularyService, demo_formulary: list[FormularyEntryData],
    ) -> None:
        result = svc.lookup_coverage("metformin", demo_formulary, plan_name="DEMO_PLAN")
        assert result.status == CoverageStatus.COVERED


# ---------------------------------------------------------------------------
# §10.1 — Alternative suggestions
# ---------------------------------------------------------------------------

class TestFindAlternatives:

    def test_alternatives_sorted_by_copay(
        self, svc: FormularyService, demo_formulary: list[FormularyEntryData],
    ) -> None:
        """Alternatives for a missing drug return cheaper covered options sorted by copay."""
        alts = svc.find_alternatives("ExperimentalDrug", demo_formulary, max_results=5)
        assert len(alts) > 0
        copays = [a.copay for a in alts]
        assert copays == sorted(copays)
        assert all(isinstance(a, AlternativeSuggestion) for a in alts)

    def test_alternatives_exclude_self(
        self, svc: FormularyService, demo_formulary: list[FormularyEntryData],
    ) -> None:
        """The queried drug itself should not appear in alternatives."""
        alts = svc.find_alternatives("Metformin", demo_formulary, max_results=10)
        names = [a.drug_name.lower() for a in alts]
        assert "metformin" not in names

    def test_alternatives_only_covered(
        self, svc: FormularyService, demo_formulary: list[FormularyEntryData],
    ) -> None:
        """Non-covered drugs should not be suggested as alternatives."""
        alts = svc.find_alternatives("ExperimentalDrug", demo_formulary, max_results=10)
        names = [a.drug_name for a in alts]
        assert "BrandOnlyDrug" not in names

    def test_alternatives_max_results(
        self, svc: FormularyService, demo_formulary: list[FormularyEntryData],
    ) -> None:
        alts = svc.find_alternatives("ExperimentalDrug", demo_formulary, max_results=2)
        assert len(alts) <= 2


# ---------------------------------------------------------------------------
# §10.1 — Formulary ingestion
# ---------------------------------------------------------------------------

class TestImportExtractedFormulary:

    def test_import_from_gemini_extraction(self, svc: FormularyService) -> None:
        extraction = FormularyExtractionOutput(
            plan_name="EXTRACTED_PLAN",
            effective_date="2026-01-01",
            entries=[
                FormularyEntryExtracted(
                    drug_name="NewDrug A", generic_name="newdruga",
                    tier=2, copay_min=20.0,
                ),
                FormularyEntryExtracted(
                    drug_name="NewDrug B", generic_name="newdrugb",
                    tier=1, copay_min=5.0, requires_prior_auth=True,
                ),
            ],
        )
        entries = svc.import_extracted_formulary(extraction, plan_name="OVERRIDE_PLAN")
        assert len(entries) == 2
        assert entries[0].plan_name == "OVERRIDE_PLAN"
        assert entries[0].drug_name == "NewDrug A"
        assert entries[0].copay == 20.0
        assert entries[1].requires_prior_auth is True

    def test_import_uses_extraction_plan_when_no_override(self, svc: FormularyService) -> None:
        extraction = FormularyExtractionOutput(
            plan_name="PDF_PLAN",
            effective_date="2026-01-01",
            entries=[
                FormularyEntryExtracted(drug_name="DrugX", tier=1, copay_min=10.0),
            ],
        )
        entries = svc.import_extracted_formulary(extraction)
        assert entries[0].plan_name == "PDF_PLAN"
