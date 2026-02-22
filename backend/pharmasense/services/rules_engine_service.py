"""RulesEngineService — purely deterministic safety checks (Part 2B §1–2).

Runs AFTER Gemini returns recommendations and BEFORE results are shown to the
clinician.  No AI calls — operates entirely on structured data.
"""

from __future__ import annotations

import logging
import re

from pharmasense.schemas.rules_engine import (
    CheckStatus,
    CheckType,
    DoseRangeData,
    DrugInteractionData,
    InteractionSeverity,
    RulesEngineInput,
    RulesEngineOutput,
    SafetyCheckResult,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# §2.1 — Drug class allergy mapping (cross-reactivity)
# ---------------------------------------------------------------------------

DRUG_CLASS_MAP: dict[str, set[str]] = {
    "penicillin": {
        "penicillin", "penicillin v", "penicillin g",
        "amoxicillin", "ampicillin", "piperacillin",
        "nafcillin", "oxacillin", "dicloxacillin",
        "amoxicillin/clavulanate", "augmentin",
    },
    "cephalosporin": {
        "cephalexin", "cefazolin", "ceftriaxone", "cefdinir",
        "cefuroxime", "ceftazidime", "cefepime",
    },
    "sulfonamide": {
        "sulfamethoxazole", "sulfasalazine", "trimethoprim/sulfamethoxazole",
        "bactrim", "septra", "sulfa",
    },
    "statin": {
        "atorvastatin", "simvastatin", "rosuvastatin",
        "lovastatin", "pravastatin", "fluvastatin", "pitavastatin",
    },
    "ace_inhibitor": {
        "lisinopril", "enalapril", "ramipril", "captopril",
        "benazepril", "fosinopril", "quinapril", "perindopril",
    },
    "arb": {
        "losartan", "valsartan", "irbesartan", "candesartan",
        "telmisartan", "olmesartan",
    },
    "nsaid": {
        "ibuprofen", "naproxen", "aspirin", "diclofenac",
        "celecoxib", "meloxicam", "indomethacin", "ketorolac",
    },
    "ssri": {
        "sertraline", "fluoxetine", "paroxetine",
        "citalopram", "escitalopram", "fluvoxamine",
    },
    "maoi": {
        "phenelzine", "tranylcypromine", "isocarboxazid", "selegiline",
    },
    "benzodiazepine": {
        "diazepam", "lorazepam", "alprazolam", "clonazepam",
        "midazolam", "temazepam",
    },
    "opioid": {
        "morphine", "oxycodone", "hydrocodone", "fentanyl",
        "tramadol", "codeine", "methadone", "buprenorphine",
    },
    "fluoroquinolone": {
        "ciprofloxacin", "levofloxacin", "moxifloxacin", "ofloxacin",
    },
    "macrolide": {
        "azithromycin", "erythromycin", "clarithromycin",
    },
    "thiazide": {
        "hydrochlorothiazide", "chlorthalidone", "indapamide",
    },
    "beta_blocker": {
        "metoprolol", "atenolol", "propranolol", "carvedilol",
        "bisoprolol", "nebivolol",
    },
}

_DRUG_TO_CLASSES: dict[str, set[str]] = {}
for _cls, _members in DRUG_CLASS_MAP.items():
    for _drug in _members:
        _DRUG_TO_CLASSES.setdefault(_drug.lower(), set()).add(_cls)


def _get_drug_classes(drug_name: str) -> set[str]:
    return _DRUG_TO_CLASSES.get(drug_name.lower().strip(), set())


# ---------------------------------------------------------------------------
# §2.3 — Dose parsing helper
# ---------------------------------------------------------------------------

_DOSE_RE = re.compile(
    r"(\d+(?:\.\d+)?)\s*(mg|g|mcg|µg|ug)",
    re.IGNORECASE,
)

_UNIT_TO_MG: dict[str, float] = {
    "mg": 1.0,
    "g": 1000.0,
    "mcg": 0.001,
    "µg": 0.001,
    "ug": 0.001,
}


def _parse_dose_to_mg(dosage: str) -> float | None:
    """Extract numeric dose in mg from a dosage string like '500mg', '0.5g', '250 mcg'."""
    m = _DOSE_RE.search(dosage)
    if not m:
        return None
    value = float(m.group(1))
    unit = m.group(2).lower()
    return value * _UNIT_TO_MG.get(unit, 1.0)


# ---------------------------------------------------------------------------
# §2.1 — Allergy check
# ---------------------------------------------------------------------------

def _is_drug_class_allergy_match(medication: str, allergy: str) -> bool:
    """Return True if the medication belongs to the same drug class as the allergy."""
    med_lower = medication.lower().strip()
    allergy_lower = allergy.lower().strip()

    # Direct / substring match
    if allergy_lower in med_lower or med_lower in allergy_lower:
        return True

    allergy_classes = _get_drug_classes(allergy_lower)
    # If the allergy name IS a class name, check if the drug belongs to it
    if allergy_lower in DRUG_CLASS_MAP:
        if med_lower in DRUG_CLASS_MAP[allergy_lower]:
            return True

    # Cross-class match: allergy drug and proposed drug share a class
    med_classes = _get_drug_classes(med_lower)
    if allergy_classes & med_classes:
        return True

    return False


def _check_allergies(medication: str, allergies: list[str]) -> SafetyCheckResult:
    for allergy in allergies:
        if _is_drug_class_allergy_match(medication, allergy):
            return SafetyCheckResult(
                check_type=CheckType.ALLERGY,
                status=CheckStatus.FAIL,
                medication_name=medication,
                details=f"Patient is allergic to '{allergy}'; '{medication}' is contraindicated",
                blocking=True,
                related_drug=allergy,
            )
    return SafetyCheckResult(
        check_type=CheckType.ALLERGY,
        status=CheckStatus.PASS,
        medication_name=medication,
        details="No allergy conflict detected",
    )


# ---------------------------------------------------------------------------
# §2.2 — Drug interaction check
# ---------------------------------------------------------------------------

def _check_interactions(
    medication: str,
    current_medications: list[str],
    interactions: list[DrugInteractionData],
) -> list[SafetyCheckResult]:
    results: list[SafetyCheckResult] = []
    med_lower = medication.lower().strip()

    for current_med in current_medications:
        cur_lower = current_med.lower().strip()
        for ix in interactions:
            a, b = ix.drug_a.lower().strip(), ix.drug_b.lower().strip()
            matched = (
                (a == med_lower and b == cur_lower)
                or (a == cur_lower and b == med_lower)
            )
            if not matched:
                continue

            severity = ix.severity.upper()
            if severity == InteractionSeverity.SEVERE:
                results.append(SafetyCheckResult(
                    check_type=CheckType.DRUG_INTERACTION,
                    status=CheckStatus.FAIL,
                    medication_name=medication,
                    details=f"SEVERE interaction: {medication} + {current_med} — {ix.description}",
                    blocking=True,
                    related_drug=current_med,
                    severity=severity,
                ))
            elif severity == InteractionSeverity.MODERATE:
                results.append(SafetyCheckResult(
                    check_type=CheckType.DRUG_INTERACTION,
                    status=CheckStatus.WARNING,
                    medication_name=medication,
                    details=f"MODERATE interaction: {medication} + {current_med} — {ix.description}",
                    blocking=False,
                    related_drug=current_med,
                    severity=severity,
                ))
            else:  # MILD or unrecognized
                results.append(SafetyCheckResult(
                    check_type=CheckType.DRUG_INTERACTION,
                    status=CheckStatus.WARNING,
                    medication_name=medication,
                    details=f"MILD interaction: {medication} + {current_med} — {ix.description}",
                    blocking=False,
                    related_drug=current_med,
                    severity=severity,
                ))

    if not results:
        results.append(SafetyCheckResult(
            check_type=CheckType.DRUG_INTERACTION,
            status=CheckStatus.PASS,
            medication_name=medication,
            details="No drug interactions found",
        ))

    return results


# ---------------------------------------------------------------------------
# §2.3 — Dose range sanity check
# ---------------------------------------------------------------------------

def _check_dose_range(
    medication: str,
    dosage: str,
    dose_ranges: list[DoseRangeData],
) -> SafetyCheckResult:
    dose_mg = _parse_dose_to_mg(dosage)
    if dose_mg is None:
        return SafetyCheckResult(
            check_type=CheckType.DOSE_RANGE,
            status=CheckStatus.WARNING,
            medication_name=medication,
            details=f"Could not parse dosage '{dosage}' — manual review recommended",
            blocking=False,
        )

    med_lower = medication.lower().strip()
    matched_range: DoseRangeData | None = None
    for dr in dose_ranges:
        if dr.medication_name.lower().strip() == med_lower:
            matched_range = dr
            break

    if matched_range is None:
        return SafetyCheckResult(
            check_type=CheckType.DOSE_RANGE,
            status=CheckStatus.PASS,
            medication_name=medication,
            details=f"No dose range reference found for '{medication}' — skipping check",
        )

    if dose_mg > matched_range.max_dose_mg:
        return SafetyCheckResult(
            check_type=CheckType.DOSE_RANGE,
            status=CheckStatus.FAIL,
            medication_name=medication,
            details=(
                f"Dose {dose_mg}mg exceeds maximum {matched_range.max_dose_mg}mg "
                f"for {medication}"
            ),
            blocking=True,
        )

    if dose_mg < matched_range.min_dose_mg:
        return SafetyCheckResult(
            check_type=CheckType.DOSE_RANGE,
            status=CheckStatus.WARNING,
            medication_name=medication,
            details=(
                f"Dose {dose_mg}mg is below minimum {matched_range.min_dose_mg}mg "
                f"for {medication} — may be sub-therapeutic"
            ),
            blocking=False,
        )

    return SafetyCheckResult(
        check_type=CheckType.DOSE_RANGE,
        status=CheckStatus.PASS,
        medication_name=medication,
        details=(
            f"Dose {dose_mg}mg is within range "
            f"({matched_range.min_dose_mg}–{matched_range.max_dose_mg}mg)"
        ),
    )


# ---------------------------------------------------------------------------
# §2.4 — Duplicate therapy check
# ---------------------------------------------------------------------------

def _check_duplicate_therapy(
    medication: str,
    current_medications: list[str],
) -> SafetyCheckResult:
    med_lower = medication.lower().strip()
    med_classes = _get_drug_classes(med_lower)

    for current in current_medications:
        cur_lower = current.lower().strip()

        # Exact match
        if cur_lower == med_lower:
            return SafetyCheckResult(
                check_type=CheckType.DUPLICATE_THERAPY,
                status=CheckStatus.WARNING,
                medication_name=medication,
                details=f"Patient already taking {current} — duplicate prescription",
                blocking=False,
                related_drug=current,
            )

        # Same drug class
        cur_classes = _get_drug_classes(cur_lower)
        shared = med_classes & cur_classes
        if shared:
            class_name = next(iter(shared))
            return SafetyCheckResult(
                check_type=CheckType.DUPLICATE_THERAPY,
                status=CheckStatus.WARNING,
                medication_name=medication,
                details=(
                    f"Patient already taking {current} (same class: {class_name}) "
                    f"— possible duplicate therapy"
                ),
                blocking=False,
                related_drug=current,
            )

    return SafetyCheckResult(
        check_type=CheckType.DUPLICATE_THERAPY,
        status=CheckStatus.PASS,
        medication_name=medication,
        details="No duplicate therapy detected",
    )


# ===================================================================
# §1.4 — Public interface
# ===================================================================

class RulesEngineService:
    """Purely deterministic safety evaluation — no AI calls."""

    def evaluate(self, input_data: RulesEngineInput) -> RulesEngineOutput:
        checks: list[SafetyCheckResult] = []

        # 1. Allergy check
        allergy_result = _check_allergies(
            input_data.medication_name, input_data.patient_allergies
        )
        checks.append(allergy_result)

        # 2. Drug interaction checks
        interaction_results = _check_interactions(
            input_data.medication_name,
            input_data.current_medications,
            input_data.drug_interactions,
        )
        checks.extend(interaction_results)

        # 3. Dose range check
        dose_result = _check_dose_range(
            input_data.medication_name,
            input_data.dosage,
            input_data.dose_ranges,
        )
        checks.append(dose_result)

        # 4. Duplicate therapy check
        dup_result = _check_duplicate_therapy(
            input_data.medication_name,
            input_data.current_medications,
        )
        checks.append(dup_result)

        has_blocking = any(c.blocking for c in checks)
        has_warning = any(c.status == CheckStatus.WARNING for c in checks)

        if has_blocking:
            overall = "BLOCKED"
        elif has_warning:
            overall = "WARNING"
        else:
            overall = "PASS"

        logger.info(
            "Rules engine [%s]: %s (%d checks, blocking=%s)",
            input_data.medication_name, overall, len(checks), has_blocking,
        )

        return RulesEngineOutput(
            medication_name=input_data.medication_name,
            checks=checks,
            has_blocking_failure=has_blocking,
            overall_status=overall,
        )
