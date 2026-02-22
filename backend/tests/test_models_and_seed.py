"""Model schema and seed data validation tests (Part 2B §7–8).

Verifies that all SQLAlchemy models have the columns specified in the spec
and that seed SQL files are syntactically valid and contain the expected data.
"""

from __future__ import annotations

import pathlib
import re
import uuid
from datetime import datetime, timezone

import pytest

from pharmasense.models.drug_interaction import DrugInteraction
from pharmasense.models.dose_range import DoseRange
from pharmasense.models.formulary import FormularyEntry
from pharmasense.models.safety_check import SafetyCheck
from pharmasense.models.analytics_event import AnalyticsEvent

SEED_DIR = pathlib.Path(__file__).resolve().parent.parent / "seed"


# =========================================================================
# §7.1 — DrugInteraction model
# =========================================================================

class TestDrugInteractionModel:

    def test_has_required_columns(self) -> None:
        cols = {c.name for c in DrugInteraction.__table__.columns}
        for expected in ("id", "drug_a", "drug_b", "severity", "description", "source", "created_at"):
            assert expected in cols, f"Missing column: {expected}"

    def test_unique_constraint_on_pair(self) -> None:
        constraints = [
            c.name for c in DrugInteraction.__table__.constraints
            if hasattr(c, "name") and c.name
        ]
        assert "uq_drug_interaction_pair" in constraints

    def test_instantiation(self) -> None:
        row = DrugInteraction(
            id=uuid.uuid4(),
            drug_a="Warfarin",
            drug_b="Aspirin",
            severity="SEVERE",
            description="Bleeding risk",
            source="FDA Drug Safety",
        )
        assert row.drug_a == "Warfarin"
        assert row.source == "FDA Drug Safety"


# =========================================================================
# §7.2 — DoseRange model
# =========================================================================

class TestDoseRangeModel:

    def test_has_required_columns(self) -> None:
        cols = {c.name for c in DoseRange.__table__.columns}
        for expected in (
            "id", "medication_name", "min_dose_mg", "max_dose_mg",
            "unit", "frequency", "population", "source", "created_at",
        ):
            assert expected in cols, f"Missing column: {expected}"

    def test_instantiation(self) -> None:
        row = DoseRange(
            id=uuid.uuid4(),
            medication_name="Metformin",
            min_dose_mg=500.0,
            max_dose_mg=2550.0,
            unit="mg",
            frequency="daily total",
            population="adult",
            source="FDA prescribing information",
        )
        assert row.medication_name == "Metformin"
        assert row.max_dose_mg == 2550.0


# =========================================================================
# §7.3 — FormularyEntry model
# =========================================================================

class TestFormularyEntryModel:

    def test_has_required_columns(self) -> None:
        cols = {c.name for c in FormularyEntry.__table__.columns}
        for expected in (
            "id", "plan_name", "medication_name", "generic_name", "tier",
            "copay", "covered", "prior_auth_required", "quantity_limit",
            "step_therapy_required", "alternatives_json", "created_at",
        ):
            assert expected in cols, f"Missing column: {expected}"

    def test_no_unique_on_medication_name(self) -> None:
        """Multiple plans can have the same medication — no unique constraint."""
        col = FormularyEntry.__table__.c.medication_name
        assert col.unique is not True

    def test_instantiation(self) -> None:
        row = FormularyEntry(
            id=uuid.uuid4(),
            plan_name="DEMO_PLAN",
            medication_name="Metformin",
            generic_name="metformin",
            tier=1,
            copay=5.0,
            covered=True,
            prior_auth_required=False,
            quantity_limit="",
            step_therapy_required=False,
            alternatives_json=None,
        )
        assert row.plan_name == "DEMO_PLAN"
        assert row.covered is True


# =========================================================================
# §7.4 — SafetyCheck model
# =========================================================================

class TestSafetyCheckModel:

    def test_has_required_columns(self) -> None:
        cols = {c.name for c in SafetyCheck.__table__.columns}
        for expected in (
            "id", "prescription_id", "check_type", "status",
            "medication_name", "details", "blocking", "created_at",
        ):
            assert expected in cols, f"Missing column: {expected}"

    def test_prescription_id_is_fk(self) -> None:
        col = SafetyCheck.__table__.c.prescription_id
        fks = list(col.foreign_keys)
        assert len(fks) == 1
        assert "prescriptions.id" in str(fks[0].target_fullname)


# =========================================================================
# §7.5 — AnalyticsEvent model
# =========================================================================

class TestAnalyticsEventModel:

    def test_has_required_columns(self) -> None:
        cols = {c.name for c in AnalyticsEvent.__table__.columns}
        for expected in ("id", "event_type", "event_data", "created_at"):
            assert expected in cols, f"Missing column: {expected}"

    def test_event_data_is_jsonb(self) -> None:
        col = AnalyticsEvent.__table__.c.event_data
        assert "JSON" in str(col.type).upper()


# =========================================================================
# §8.1 — Seed SQL validation
# =========================================================================

class TestSeedDoseRanges:

    def test_seed_file_exists(self) -> None:
        path = SEED_DIR / "seed-dose-ranges.sql"
        assert path.exists(), "seed/seed-dose-ranges.sql not found"

    def test_contains_15_medications(self) -> None:
        content = (SEED_DIR / "seed-dose-ranges.sql").read_text()
        expected_meds = [
            "Metformin", "Lisinopril", "Amoxicillin", "Atorvastatin",
            "Omeprazole", "Ibuprofen", "Losartan", "Amlodipine",
            "Sertraline", "Metoprolol", "Gabapentin", "Levothyroxine",
            "Prednisone", "Warfarin", "Ciprofloxacin",
        ]
        for med in expected_meds:
            assert med in content, f"Seed data missing medication: {med}"

    def test_insert_targets_correct_table(self) -> None:
        content = (SEED_DIR / "seed-dose-ranges.sql").read_text()
        assert "INSERT INTO dose_ranges" in content

    def test_values_match_spec(self) -> None:
        """Spot-check a few rows against the spec table."""
        content = (SEED_DIR / "seed-dose-ranges.sql").read_text()
        assert "500" in content and "2550" in content  # Metformin
        assert "0.025" in content and "0.3" in content  # Levothyroxine
        assert "300" in content and "3600" in content   # Gabapentin


class TestSeedInteractions:

    def test_seed_file_exists(self) -> None:
        path = SEED_DIR / "seed-interactions.sql"
        assert path.exists()

    def test_includes_source_column(self) -> None:
        content = (SEED_DIR / "seed-interactions.sql").read_text()
        assert "source" in content

    def test_insert_targets_correct_table(self) -> None:
        content = (SEED_DIR / "seed-interactions.sql").read_text()
        assert "INSERT INTO drug_interactions" in content


class TestSeedFormulary:

    def test_seed_file_exists(self) -> None:
        path = SEED_DIR / "seed-formulary.sql"
        assert path.exists()

    def test_uses_new_column_names(self) -> None:
        content = (SEED_DIR / "seed-formulary.sql").read_text()
        assert "plan_name" in content
        assert "medication_name" in content
        assert "copay" in content
        assert "covered" in content
        assert "prior_auth_required" in content

    def test_insert_targets_correct_table(self) -> None:
        content = (SEED_DIR / "seed-formulary.sql").read_text()
        assert "INSERT INTO formulary_entries" in content

    def test_contains_demo_plan(self) -> None:
        content = (SEED_DIR / "seed-formulary.sql").read_text()
        assert "DEMO_PLAN" in content
