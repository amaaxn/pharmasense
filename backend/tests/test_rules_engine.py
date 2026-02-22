"""Part 2B §10.1 — RulesEngineService unit tests.

All 14 test cases from the spec, plus the dose-parsing helper tests.
No database or Gemini API required.
"""

from __future__ import annotations

import pytest

from pharmasense.schemas.rules_engine import (
    CheckStatus,
    CheckType,
    DoseRangeData,
    DrugInteractionData,
    RulesEngineInput,
)
from pharmasense.services.rules_engine_service import (
    RulesEngineService,
    _parse_dose_to_mg,
)

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

INTERACTIONS: list[DrugInteractionData] = [
    DrugInteractionData(drug_a="Warfarin", drug_b="Aspirin", severity="SEVERE", description="Increased bleeding risk"),
    DrugInteractionData(drug_a="Lisinopril", drug_b="Ibuprofen", severity="MODERATE", description="Reduced antihypertensive effect"),
    DrugInteractionData(drug_a="SSRIs", drug_b="MAOIs", severity="SEVERE", description="Serotonin syndrome risk"),
    DrugInteractionData(drug_a="ACE inhibitors", drug_b="NSAIDs", severity="MODERATE", description="Reduced antihypertensive effect"),
]

DOSE_RANGES: list[DoseRangeData] = [
    DoseRangeData(medication_name="Metformin", min_dose_mg=500, max_dose_mg=2550),
    DoseRangeData(medication_name="Lisinopril", min_dose_mg=5, max_dose_mg=40),
    DoseRangeData(medication_name="Atorvastatin", min_dose_mg=10, max_dose_mg=80),
    DoseRangeData(medication_name="Amoxicillin", min_dose_mg=250, max_dose_mg=3000),
]


@pytest.fixture
def engine() -> RulesEngineService:
    return RulesEngineService()


# ===================================================================
# §10.1 Test 1: Allergy exact match
# ===================================================================

def test_allergy_exact_match(engine: RulesEngineService):
    inp = RulesEngineInput(
        medication_name="Penicillin V",
        patient_allergies=["Penicillin"],
    )
    out = engine.evaluate(inp)
    allergy_checks = [c for c in out.checks if c.check_type == CheckType.ALLERGY]
    assert len(allergy_checks) == 1
    assert allergy_checks[0].status == CheckStatus.FAIL
    assert allergy_checks[0].blocking is True


# ===================================================================
# §10.1 Test 2: Allergy class match (cross-reactivity)
# ===================================================================

def test_allergy_class_match(engine: RulesEngineService):
    inp = RulesEngineInput(
        medication_name="Amoxicillin",
        patient_allergies=["penicillin"],
    )
    out = engine.evaluate(inp)
    allergy_checks = [c for c in out.checks if c.check_type == CheckType.ALLERGY]
    assert allergy_checks[0].status == CheckStatus.FAIL
    assert allergy_checks[0].blocking is True
    assert out.has_blocking_failure is True


# ===================================================================
# §10.1 Test 3: Allergy no match
# ===================================================================

def test_allergy_no_match(engine: RulesEngineService):
    inp = RulesEngineInput(
        medication_name="Ciprofloxacin",
        patient_allergies=["Penicillin"],
    )
    out = engine.evaluate(inp)
    allergy_checks = [c for c in out.checks if c.check_type == CheckType.ALLERGY]
    assert allergy_checks[0].status == CheckStatus.PASS


# ===================================================================
# §10.1 Test 4: No allergies
# ===================================================================

def test_no_allergies(engine: RulesEngineService):
    inp = RulesEngineInput(
        medication_name="Amoxicillin",
        patient_allergies=[],
    )
    out = engine.evaluate(inp)
    allergy_checks = [c for c in out.checks if c.check_type == CheckType.ALLERGY]
    assert allergy_checks[0].status == CheckStatus.PASS


# ===================================================================
# §10.1 Test 5: Severe interaction (blocking)
# ===================================================================

def test_severe_interaction(engine: RulesEngineService):
    inp = RulesEngineInput(
        medication_name="Aspirin",
        current_medications=["Warfarin"],
        drug_interactions=INTERACTIONS,
    )
    out = engine.evaluate(inp)
    ix_checks = [c for c in out.checks if c.check_type == CheckType.DRUG_INTERACTION]
    assert any(c.status == CheckStatus.FAIL and c.blocking for c in ix_checks)
    assert out.has_blocking_failure is True


# ===================================================================
# §10.1 Test 6: Moderate interaction (warning, non-blocking)
# ===================================================================

def test_moderate_interaction(engine: RulesEngineService):
    inp = RulesEngineInput(
        medication_name="Ibuprofen",
        current_medications=["Lisinopril"],
        drug_interactions=INTERACTIONS,
    )
    out = engine.evaluate(inp)
    ix_checks = [c for c in out.checks if c.check_type == CheckType.DRUG_INTERACTION]
    assert any(c.status == CheckStatus.WARNING for c in ix_checks)
    assert not any(c.blocking for c in ix_checks)


# ===================================================================
# §10.1 Test 7: No interaction
# ===================================================================

def test_no_interaction(engine: RulesEngineService):
    inp = RulesEngineInput(
        medication_name="Amoxicillin",
        current_medications=["Metformin"],
        drug_interactions=INTERACTIONS,
    )
    out = engine.evaluate(inp)
    ix_checks = [c for c in out.checks if c.check_type == CheckType.DRUG_INTERACTION]
    assert all(c.status == CheckStatus.PASS for c in ix_checks)


# ===================================================================
# §10.1 Test 8: Dose too high (blocking)
# ===================================================================

def test_dose_too_high(engine: RulesEngineService):
    inp = RulesEngineInput(
        medication_name="Atorvastatin",
        dosage="120mg",
        dose_ranges=DOSE_RANGES,
    )
    out = engine.evaluate(inp)
    dose_checks = [c for c in out.checks if c.check_type == CheckType.DOSE_RANGE]
    assert dose_checks[0].status == CheckStatus.FAIL
    assert dose_checks[0].blocking is True


# ===================================================================
# §10.1 Test 9: Dose too low (warning)
# ===================================================================

def test_dose_too_low(engine: RulesEngineService):
    inp = RulesEngineInput(
        medication_name="Metformin",
        dosage="100mg",
        dose_ranges=DOSE_RANGES,
    )
    out = engine.evaluate(inp)
    dose_checks = [c for c in out.checks if c.check_type == CheckType.DOSE_RANGE]
    assert dose_checks[0].status == CheckStatus.WARNING
    assert dose_checks[0].blocking is False


# ===================================================================
# §10.1 Test 10: Dose in range (pass)
# ===================================================================

def test_dose_in_range(engine: RulesEngineService):
    inp = RulesEngineInput(
        medication_name="Lisinopril",
        dosage="20mg",
        dose_ranges=DOSE_RANGES,
    )
    out = engine.evaluate(inp)
    dose_checks = [c for c in out.checks if c.check_type == CheckType.DOSE_RANGE]
    assert dose_checks[0].status == CheckStatus.PASS


# ===================================================================
# §10.1 Test 11: Dose unparseable (warning)
# ===================================================================

def test_dose_unparseable(engine: RulesEngineService):
    inp = RulesEngineInput(
        medication_name="Lisinopril",
        dosage="two tablets",
        dose_ranges=DOSE_RANGES,
    )
    out = engine.evaluate(inp)
    dose_checks = [c for c in out.checks if c.check_type == CheckType.DOSE_RANGE]
    assert dose_checks[0].status == CheckStatus.WARNING
    assert "Could not parse" in dose_checks[0].details


# ===================================================================
# §10.1 Test 12: Duplicate exact
# ===================================================================

def test_duplicate_exact(engine: RulesEngineService):
    inp = RulesEngineInput(
        medication_name="Lisinopril",
        current_medications=["Lisinopril"],
    )
    out = engine.evaluate(inp)
    dup_checks = [c for c in out.checks if c.check_type == CheckType.DUPLICATE_THERAPY]
    assert dup_checks[0].status == CheckStatus.WARNING
    assert "duplicate" in dup_checks[0].details.lower()


# ===================================================================
# §10.1 Test 13: Duplicate class (both statins)
# ===================================================================

def test_duplicate_class(engine: RulesEngineService):
    inp = RulesEngineInput(
        medication_name="Simvastatin",
        current_medications=["Atorvastatin"],
    )
    out = engine.evaluate(inp)
    dup_checks = [c for c in out.checks if c.check_type == CheckType.DUPLICATE_THERAPY]
    assert dup_checks[0].status == CheckStatus.WARNING
    assert "statin" in dup_checks[0].details.lower()


# ===================================================================
# §10.1 Test 14: No duplicate
# ===================================================================

def test_no_duplicate(engine: RulesEngineService):
    inp = RulesEngineInput(
        medication_name="Lisinopril",
        current_medications=["Metformin"],
    )
    out = engine.evaluate(inp)
    dup_checks = [c for c in out.checks if c.check_type == CheckType.DUPLICATE_THERAPY]
    assert dup_checks[0].status == CheckStatus.PASS


# ===================================================================
# Bonus: _parse_dose_to_mg (§11 criterion 6)
# ===================================================================

class TestParseDoseToMg:
    def test_mg(self):
        assert _parse_dose_to_mg("500mg") == 500.0

    def test_mg_with_space(self):
        assert _parse_dose_to_mg("500 mg") == 500.0

    def test_grams(self):
        assert _parse_dose_to_mg("0.5g") == 500.0

    def test_mcg(self):
        assert _parse_dose_to_mg("250 mcg") == 0.25

    def test_mcg_unicode(self):
        assert _parse_dose_to_mg("250µg") == 0.25

    def test_unparseable(self):
        assert _parse_dose_to_mg("two tablets") is None

    def test_embedded_in_string(self):
        assert _parse_dose_to_mg("Take 500mg daily") == 500.0

    def test_decimal_mg(self):
        assert _parse_dose_to_mg("2.5mg") == 2.5

    def test_large_g(self):
        assert _parse_dose_to_mg("1g") == 1000.0


# ===================================================================
# Bonus: overall_status aggregation
# ===================================================================

def test_overall_status_blocked(engine: RulesEngineService):
    inp = RulesEngineInput(
        medication_name="Amoxicillin",
        dosage="500mg",
        patient_allergies=["penicillin"],
        dose_ranges=DOSE_RANGES,
    )
    out = engine.evaluate(inp)
    assert out.overall_status == "BLOCKED"
    assert out.has_blocking_failure is True


def test_overall_status_warning(engine: RulesEngineService):
    inp = RulesEngineInput(
        medication_name="Lisinopril",
        dosage="20mg",
        current_medications=["Lisinopril"],
        dose_ranges=DOSE_RANGES,
    )
    out = engine.evaluate(inp)
    assert out.overall_status == "WARNING"
    assert out.has_blocking_failure is False


def test_overall_status_pass(engine: RulesEngineService):
    inp = RulesEngineInput(
        medication_name="Amoxicillin",
        dosage="500mg",
        dose_ranges=DOSE_RANGES,
    )
    out = engine.evaluate(inp)
    assert out.overall_status == "PASS"
    assert out.has_blocking_failure is False
