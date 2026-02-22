from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from pharmasense.config import settings
from pharmasense.dependencies.database import get_db
from pharmasense.schemas.common import ApiResponse
from pharmasense.schemas.recommendation import (
    AlternativeDrug,
    RecommendationItem,
    RecommendationResponse,
    RecommendedDrug,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])

SEED_DIR = Path(__file__).resolve().parent.parent.parent / "seed"

SEED_ORDER = [
    "seed-formulary.sql",
    "seed-interactions.sql",
    "seed-dose-ranges.sql",
    "seed-demo-clinician.sql",
    "seed-demo-patients.sql",
    "seed-demo-visits.sql",
    "seed-analytics-events.sql",
]

DEMO_TABLES_CLEANUP = [
    "prescription_items",
    "prescriptions",
    "visits",
    "analytics_events",
    "patients",
    "clinicians",
    "formulary_entries",
    "drug_interactions",
    "dose_ranges",
]


@router.post("/reset-demo")
async def reset_demo_data(
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[dict]:
    if settings.is_production:
        return ApiResponse.fail(
            "Demo reset is disabled in production",
            error_code="FORBIDDEN",
        )

    for table in DEMO_TABLES_CLEANUP:
        await db.execute(text(f"DELETE FROM {table}"))  # noqa: S608

    seeded_files: list[str] = []
    for filename in SEED_ORDER:
        sql_path = SEED_DIR / filename
        if not sql_path.exists():
            continue
        sql = sql_path.read_text(encoding="utf-8")
        for statement in _split_sql(sql):
            stmt = statement.strip()
            if stmt:
                await db.execute(text(stmt))
        seeded_files.append(filename)

    return ApiResponse.ok({
        "message": "Demo data reset successfully",
        "seeded_files": seeded_files,
    })


def _split_sql(sql: str) -> list[str]:
    """Split a SQL file into individual statements, respecting multi-value INSERTs."""
    statements: list[str] = []
    current: list[str] = []

    for line in sql.splitlines():
        stripped = line.strip()
        if stripped.startswith("--") or not stripped:
            continue
        current.append(line)
        if stripped.endswith(";"):
            statements.append("\n".join(current))
            current = []

    if current:
        statements.append("\n".join(current))

    return statements


# ---------------------------------------------------------------------------
# Demo fallback: pre-built recommendations for Maria Lopez (§7.2 / §7.3)
# Used when Gemini API is slow or unavailable during a live demo.
# ---------------------------------------------------------------------------

DEMO_VISIT_ID = UUID("00000000-0000-0000-0000-000000000000")

_DEMO_RECOMMENDATIONS = RecommendationResponse(
    visit_id=DEMO_VISIT_ID,
    gemini_model="demo-fallback",
    reasoning_summary=(
        "Azithromycin is recommended as first-line for strep pharyngitis in "
        "patients with penicillin allergy. Ciprofloxacin is a cheaper alternative. "
        "Amoxicillin is BLOCKED due to penicillin-class allergy cross-reactivity."
    ),
    recommendations=[
        RecommendationItem(
            primary=RecommendedDrug(
                drug_name="Azithromycin",
                generic_name="azithromycin",
                dosage="250mg",
                frequency="once daily",
                duration="5 days",
                route="oral",
                rationale="First-line macrolide for strep pharyngitis with penicillin allergy. No cross-reactivity.",
                tier=1,
                estimated_copay=10.0,
                is_covered=True,
                requires_prior_auth=False,
            ),
            alternatives=[
                AlternativeDrug(
                    drug_name="Clarithromycin",
                    generic_name="clarithromycin",
                    dosage="500mg",
                    reason="Alternative macrolide; higher cost but similar efficacy",
                    tier=2,
                    estimated_copay=25.0,
                ),
            ],
            warnings=[],
        ),
        RecommendationItem(
            primary=RecommendedDrug(
                drug_name="Ciprofloxacin",
                generic_name="ciprofloxacin",
                dosage="500mg",
                frequency="twice daily",
                duration="7 days",
                route="oral",
                rationale="Fluoroquinolone alternative. No cross-reactivity with penicillin. Safe with current medications.",
                tier=2,
                estimated_copay=15.0,
                is_covered=True,
                requires_prior_auth=False,
            ),
            alternatives=[],
            warnings=[],
        ),
        RecommendationItem(
            primary=RecommendedDrug(
                drug_name="Amoxicillin",
                generic_name="amoxicillin",
                dosage="500mg",
                frequency="three times daily",
                duration="10 days",
                route="oral",
                rationale="Standard first-line for strep but BLOCKED for this patient.",
                tier=1,
                estimated_copay=5.0,
                is_covered=True,
                requires_prior_auth=False,
            ),
            alternatives=[],
            warnings=["ALLERGY: Penicillin class — patient has documented Penicillin allergy"],
        ),
    ],
)


@router.get("/demo-recommendations")
async def get_demo_recommendations(
    visit_id: str | None = None,
) -> ApiResponse[RecommendationResponse]:
    """Return pre-built demo recommendations for the Maria Lopez scenario.

    Used as a fallback when Gemini API is unavailable during a live demo.
    """
    result = _DEMO_RECOMMENDATIONS.model_copy()
    if visit_id:
        try:
            result.visit_id = UUID(visit_id)
        except ValueError:
            pass
    return ApiResponse.ok(result)
