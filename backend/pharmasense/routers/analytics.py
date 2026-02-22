"""Analytics router — /api/analytics (Part 6 §3).

Endpoints serve dashboard data from Snowflake when available, falling
back to local PostgreSQL aggregation automatically (§2.9).
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from pharmasense.dependencies.auth import AuthenticatedUser, require_role
from pharmasense.dependencies.database import get_db
from pharmasense.schemas.analytics import (
    AnalyticsDashboardResponse,
    EventCountByType,
    SyncResult,
)
from pharmasense.schemas.common import ApiResponse
from pharmasense.services.analytics_service import AnalyticsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _get_analytics_service(db: AsyncSession = Depends(get_db)) -> AnalyticsService:
    return AnalyticsService(session=db)


# ---------------------------------------------------------------------------
# GET /api/analytics/summary — full dashboard payload
# ---------------------------------------------------------------------------

@router.get("/summary")
async def analytics_summary(
    user: AuthenticatedUser = Depends(require_role("clinician")),
    svc: AnalyticsService = Depends(_get_analytics_service),
) -> ApiResponse[AnalyticsDashboardResponse]:
    dashboard = await svc.get_dashboard()
    return ApiResponse(success=True, data=dashboard)


# ---------------------------------------------------------------------------
# GET /api/analytics/copay-savings
# ---------------------------------------------------------------------------

@router.get("/copay-savings")
async def copay_savings(
    user: AuthenticatedUser = Depends(require_role("clinician")),
    svc: AnalyticsService = Depends(_get_analytics_service),
) -> ApiResponse[dict]:
    dashboard = await svc.get_dashboard()
    return ApiResponse(
        success=True,
        data={
            "copay_savings": dashboard.copay_savings.model_dump(),
            "copay_by_status": [s.model_dump() for s in dashboard.copay_by_status],
            "data_source": dashboard.data_source,
        },
    )


# ---------------------------------------------------------------------------
# GET /api/analytics/safety-blocks
# ---------------------------------------------------------------------------

@router.get("/safety-blocks")
async def safety_blocks(
    user: AuthenticatedUser = Depends(require_role("clinician")),
    svc: AnalyticsService = Depends(_get_analytics_service),
) -> ApiResponse[dict]:
    dashboard = await svc.get_dashboard()
    return ApiResponse(
        success=True,
        data={
            "safety_blocks": [b.model_dump() for b in dashboard.safety_blocks],
            "data_source": dashboard.data_source,
        },
    )


# ---------------------------------------------------------------------------
# GET /api/analytics/time-saved
# ---------------------------------------------------------------------------

@router.get("/time-saved")
async def time_saved(
    user: AuthenticatedUser = Depends(require_role("clinician")),
    svc: AnalyticsService = Depends(_get_analytics_service),
) -> ApiResponse[dict]:
    dashboard = await svc.get_dashboard()
    return ApiResponse(
        success=True,
        data={
            "visit_efficiency": dashboard.visit_efficiency.model_dump(),
            "data_source": dashboard.data_source,
        },
    )


# ---------------------------------------------------------------------------
# GET /api/analytics/adherence-risk
# ---------------------------------------------------------------------------

@router.get("/adherence-risk")
async def adherence_risk(
    user: AuthenticatedUser = Depends(require_role("clinician")),
    svc: AnalyticsService = Depends(_get_analytics_service),
) -> ApiResponse[dict]:
    dashboard = await svc.get_dashboard()
    return ApiResponse(
        success=True,
        data={
            "adherence_risks": [r.model_dump() for r in dashboard.adherence_risks],
            "data_source": dashboard.data_source,
        },
    )


# ---------------------------------------------------------------------------
# GET /api/analytics/event-counts — event counts by type
# ---------------------------------------------------------------------------

@router.get("/event-counts")
async def event_counts(
    user: AuthenticatedUser = Depends(require_role("clinician")),
    svc: AnalyticsService = Depends(_get_analytics_service),
) -> ApiResponse[list[EventCountByType]]:
    counts = await svc.get_event_counts()
    return ApiResponse(success=True, data=counts)


# ---------------------------------------------------------------------------
# POST /api/analytics/sync — trigger Snowflake sync
# ---------------------------------------------------------------------------

@router.post("/sync")
async def sync_to_snowflake(
    user: AuthenticatedUser = Depends(require_role("clinician")),
    svc: AnalyticsService = Depends(_get_analytics_service),
) -> ApiResponse[SyncResult]:
    result = await svc.sync_all_to_snowflake()
    return ApiResponse(success=True, data=result)
