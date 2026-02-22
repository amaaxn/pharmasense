"""SnowflakeService — analytics sync and query layer (Part 6 §2.6).

All Snowflake I/O is synchronous (the Python connector does not support
asyncio) so every call is wrapped with ``asyncio.to_thread`` to keep the
FastAPI event-loop unblocked.

Graceful degradation (§2.9): every public method catches exceptions,
logs the failure, and either returns ``None`` or an empty result so the
caller can fall back to local PostgreSQL data.
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any, Sequence

from pharmasense.config import settings
from pharmasense.config.snowflake import get_snowflake_connection
from pharmasense.models.analytics_event import AnalyticsEvent
from pharmasense.schemas.analytics import (
    AdherenceRisk,
    AnalyticsDashboardResponse,
    CopayByStatus,
    CopaySavingsSummary,
    SafetyBlockReason,
    SyncResult,
    VisitEfficiency,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# SQL constants — match the schema in snowflake/schema.sql
# ---------------------------------------------------------------------------

_INSERT_EVENT = """\
INSERT INTO EVENTS (ID, EVENT_TYPE, EVENT_DATA, USER_ID, SESSION_ID, CREATED_AT)
VALUES (%s, %s, %s, %s, %s, %s)
"""

_COPAY_SAVINGS_QUERY = """\
SELECT
    COALESCE(SUM(EVENT_DATA:copayDelta::FLOAT), 0)  AS total_copay_saved,
    COALESCE(AVG(EVENT_DATA:copay::FLOAT), 0)       AS average_copay,
    COUNT(*)                                        AS total_prescriptions
FROM EVENTS
WHERE EVENT_TYPE = 'OPTION_APPROVED'
"""

_COPAY_BY_STATUS_QUERY = """\
SELECT
    COALESCE(EVENT_DATA:coverageStatus::STRING, 'UNKNOWN') AS coverage_status,
    COUNT(*)                                                AS cnt,
    COALESCE(SUM(EVENT_DATA:copay::FLOAT), 0)              AS total_copay
FROM EVENTS
WHERE EVENT_TYPE = 'OPTION_APPROVED'
GROUP BY coverage_status
ORDER BY cnt DESC
"""

_SAFETY_BLOCKS_QUERY = """\
SELECT
    COALESCE(EVENT_DATA:blockType::STRING, 'OTHER') AS block_type,
    COUNT(*)                                        AS cnt
FROM EVENTS
WHERE EVENT_TYPE = 'OPTION_BLOCKED'
GROUP BY block_type
ORDER BY cnt DESC
"""

_VISIT_EFFICIENCY_QUERY = """\
SELECT
    (SELECT COUNT(*) FROM EVENTS WHERE EVENT_TYPE = 'VISIT_CREATED')    AS total_visits,
    COALESCE(AVG(EVENT_DATA:durationMinutes::FLOAT), 0)                AS avg_duration,
    COALESCE(SUM(EVENT_DATA:prescriptionsCount::INT), 0)               AS total_prescriptions
FROM EVENTS
WHERE EVENT_TYPE = 'VISIT_COMPLETED'
"""

_ADHERENCE_RISK_QUERY = """\
SELECT
    EVENT_DATA:medication::STRING           AS medication,
    EVENT_DATA:copay::FLOAT                 AS copay,
    EVENT_DATA:tier::INT                    AS tier,
    COALESCE(EVENT_DATA:coverageStatus::STRING, 'UNKNOWN') AS coverage_status,
    CASE
        WHEN EVENT_DATA:copay::FLOAT > 50  THEN 'HIGH_RISK'
        WHEN EVENT_DATA:copay::FLOAT > 25  THEN 'MODERATE_RISK'
        ELSE 'LOW_RISK'
    END                                     AS risk_level
FROM EVENTS
WHERE EVENT_TYPE = 'OPTION_APPROVED'
  AND EVENT_DATA:copay IS NOT NULL
ORDER BY copay DESC
"""

_COUNT_EVENTS = "SELECT COUNT(*) FROM EVENTS"


class SnowflakeService:
    """Sync events to Snowflake and run analytics queries."""

    # ------------------------------------------------------------------
    # §2.6 / §2.8 — Event sync
    # ------------------------------------------------------------------

    async def sync_event(self, event: AnalyticsEvent) -> bool:
        """Write a single event to Snowflake.  Returns True on success."""
        if not settings.snowflake_configured:
            logger.debug("Snowflake not configured — skipping sync")
            return False
        try:
            return await asyncio.to_thread(self._sync_event_blocking, event)
        except Exception:
            logger.exception("Snowflake sync failed for event %s", event.id)
            return False

    async def sync_events_batch(self, events: Sequence[AnalyticsEvent]) -> SyncResult:
        """Write multiple events to Snowflake in a single connection."""
        if not settings.snowflake_configured:
            return SyncResult(message="Snowflake not configured")
        try:
            return await asyncio.to_thread(self._sync_batch_blocking, events)
        except Exception:
            logger.exception("Snowflake batch sync failed")
            return SyncResult(
                failed_count=len(events),
                message="Snowflake batch sync failed — see logs",
            )

    # ------------------------------------------------------------------
    # §2.6 — Dashboard queries
    # ------------------------------------------------------------------

    async def get_dashboard(self) -> AnalyticsDashboardResponse | None:
        """Query Snowflake for the full dashboard payload.

        Returns ``None`` if Snowflake is unreachable so the caller can
        fall back to local PostgreSQL aggregation (§2.9).
        """
        if not settings.snowflake_configured:
            return None
        try:
            return await asyncio.to_thread(self._get_dashboard_blocking)
        except Exception:
            logger.exception("Snowflake dashboard query failed — falling back to local")
            return None

    async def get_event_count(self) -> int | None:
        if not settings.snowflake_configured:
            return None
        try:
            return await asyncio.to_thread(self._get_count_blocking)
        except Exception:
            logger.exception("Snowflake count query failed")
            return None

    # ------------------------------------------------------------------
    # Blocking helpers (run in thread via asyncio.to_thread)
    # ------------------------------------------------------------------

    @staticmethod
    def _sync_event_blocking(event: AnalyticsEvent) -> bool:
        with get_snowflake_connection() as conn:
            cur = conn.cursor()
            try:
                cur.execute(
                    _INSERT_EVENT,
                    (
                        str(event.id),
                        event.event_type,
                        json.dumps(event.event_data) if event.event_data else "{}",
                        str(event.user_id) if event.user_id else None,
                        event.session_id,
                        (event.created_at or datetime.now(timezone.utc)).isoformat(),
                    ),
                )
            finally:
                cur.close()
        return True

    @staticmethod
    def _sync_batch_blocking(events: Sequence[AnalyticsEvent]) -> SyncResult:
        synced = 0
        failed = 0
        with get_snowflake_connection() as conn:
            cur = conn.cursor()
            try:
                for event in events:
                    try:
                        cur.execute(
                            _INSERT_EVENT,
                            (
                                str(event.id),
                                event.event_type,
                                json.dumps(event.event_data) if event.event_data else "{}",
                                str(event.user_id) if event.user_id else None,
                                event.session_id,
                                (event.created_at or datetime.now(timezone.utc)).isoformat(),
                            ),
                        )
                        synced += 1
                    except Exception:
                        logger.warning("Failed to sync event %s", event.id, exc_info=True)
                        failed += 1
            finally:
                cur.close()
        return SyncResult(
            synced_count=synced,
            failed_count=failed,
            message=f"Synced {synced}/{synced + failed} events to Snowflake",
        )

    @staticmethod
    def _get_dashboard_blocking() -> AnalyticsDashboardResponse:
        with get_snowflake_connection() as conn:
            cur = conn.cursor()
            try:
                # Copay savings
                cur.execute(_COPAY_SAVINGS_QUERY)
                row = cur.fetchone()
                copay_savings = CopaySavingsSummary(
                    total_copay_saved=float(row[0]) if row else 0.0,
                    average_copay=float(row[1]) if row else 0.0,
                    total_prescriptions=int(row[2]) if row else 0,
                )

                # Copay by status
                cur.execute(_COPAY_BY_STATUS_QUERY)
                copay_by_status = [
                    CopayByStatus(
                        coverage_status=r[0],
                        count=int(r[1]),
                        total_copay=float(r[2]),
                    )
                    for r in cur.fetchall()
                ]

                # Safety blocks
                cur.execute(_SAFETY_BLOCKS_QUERY)
                block_rows = cur.fetchall()
                total_blocks = sum(int(r[1]) for r in block_rows)
                safety_blocks = [
                    SafetyBlockReason(
                        block_type=r[0],
                        count=int(r[1]),
                        percentage=round(int(r[1]) / total_blocks * 100, 1) if total_blocks else 0.0,
                    )
                    for r in block_rows
                ]

                # Visit efficiency
                cur.execute(_VISIT_EFFICIENCY_QUERY)
                vrow = cur.fetchone()
                visit_efficiency = VisitEfficiency(
                    total_visits=int(vrow[0]) if vrow else 0,
                    avg_duration_minutes=round(float(vrow[1]), 1) if vrow else 0.0,
                    total_prescriptions=int(vrow[2]) if vrow else 0,
                )

                # Adherence risk
                cur.execute(_ADHERENCE_RISK_QUERY)
                adherence_risks = [
                    AdherenceRisk(
                        medication=r[0] or "",
                        copay=float(r[1]) if r[1] else 0.0,
                        tier=int(r[2]) if r[2] is not None else None,
                        coverage_status=r[3] or "UNKNOWN",
                        risk_level=r[4] or "LOW_RISK",
                    )
                    for r in cur.fetchall()
                ]
            finally:
                cur.close()

        return AnalyticsDashboardResponse(
            copay_savings=copay_savings,
            copay_by_status=copay_by_status,
            safety_blocks=safety_blocks,
            visit_efficiency=visit_efficiency,
            adherence_risks=adherence_risks,
            data_source="snowflake",
            last_synced_at=datetime.now(timezone.utc),
        )

    @staticmethod
    def _get_count_blocking() -> int:
        with get_snowflake_connection() as conn:
            cur = conn.cursor()
            try:
                cur.execute(_COUNT_EVENTS)
                row = cur.fetchone()
                return int(row[0]) if row else 0
            finally:
                cur.close()
