"""AnalyticsService — de-identified event capture (Part 2B §6, Part 6 §1–2).

Creates ``AnalyticsEvent`` model instances for every prescription action.
When a SQLAlchemy ``AsyncSession`` is provided events are persisted to the
``analytics_events`` table; otherwise they are buffered in-memory so the
service is fully usable (and testable) without a live database.

Dual-write pattern (§2.1): every event is saved to local PostgreSQL
**and** synced to Snowflake via a non-blocking background task.  If the
Snowflake write fails the local event is the source of truth.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from pharmasense.models.analytics_event import AnalyticsEvent
from pharmasense.repositories.analytics_event_repository import AnalyticsEventRepository
from pharmasense.schemas.analytics import (
    AdherenceRisk,
    AnalyticsDashboardResponse,
    CopayByStatus,
    CopaySavingsSummary,
    EventCountByType,
    SafetyBlockReason,
    SyncResult,
    VisitEfficiency,
)
from pharmasense.schemas.prescription_ops import AnalyticsEventType
from pharmasense.services.snowflake_service import SnowflakeService

logger = logging.getLogger(__name__)

_snowflake_service = SnowflakeService()


class AnalyticsService:
    """Event emitter and local-query layer for the analytics pipeline.

    Parameters
    ----------
    session:
        An optional SQLAlchemy ``AsyncSession``.  When provided, ``emit``
        will add an ``AnalyticsEvent`` row to the session (caller must
        commit).  When ``None`` the event is held in an in-memory buffer
        accessible via ``flush()`` / ``pending_events``.
    snowflake:
        Override the default ``SnowflakeService`` singleton (useful for
        testing).
    """

    def __init__(
        self,
        session: AsyncSession | Any | None = None,
        *,
        snowflake: SnowflakeService | None = None,
    ) -> None:
        self._session = session
        self._repo = AnalyticsEventRepository(session) if session is not None else None
        self._snowflake = snowflake or _snowflake_service
        self._buffer: list[dict[str, Any]] = []

    # ------------------------------------------------------------------
    # §1.2 — Core emit method
    # ------------------------------------------------------------------

    def emit(
        self,
        event_type: AnalyticsEventType,
        data: dict[str, Any],
        *,
        user_id: str | None = None,
        session_id: str | None = None,
    ) -> AnalyticsEvent:
        """Create an ``AnalyticsEvent`` and persist or buffer it.

        When a DB session is available the event is added to the session
        (flushed on the next commit by the ``get_db`` dependency).  A
        non-blocking Snowflake sync task is also scheduled.
        """
        import uuid as _uuid

        event_model = AnalyticsEvent(
            id=_uuid.uuid4(),
            event_type=event_type.value,
            event_data=data,
        )
        if user_id is not None:
            event_model.user_id = _uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        if session_id is not None:
            event_model.session_id = session_id

        if self._session is not None:
            self._session.add(event_model)
            logger.info("Analytics event persisted: %s", event_type.value)
            self._schedule_snowflake_sync(event_model)
        else:
            self._buffer.append({
                "event_type": event_type.value,
                "event_data": data,
                "user_id": user_id,
                "session_id": session_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            logger.info("Analytics event buffered: %s — %s", event_type.value, data)

        return event_model

    # ------------------------------------------------------------------
    # §1.3 — Query methods (delegating to repository)
    # ------------------------------------------------------------------

    async def get_events_by_type(
        self,
        event_type: str,
        *,
        limit: int = 100,
        offset: int = 0,
    ) -> list[AnalyticsEvent]:
        if self._repo is None:
            return []
        events = await self._repo.find_by_event_type(event_type, limit=limit, offset=offset)
        return list(events)

    async def get_events_since(self, after: datetime) -> list[AnalyticsEvent]:
        if self._repo is None:
            return []
        events = await self._repo.find_by_created_at_after(after)
        return list(events)

    async def get_event_counts(self) -> list[EventCountByType]:
        if self._repo is None:
            return []
        rows = await self._repo.count_by_event_type()
        return [EventCountByType(event_type=et, count=c) for et, c in rows]

    async def get_total_count(self) -> int:
        if self._repo is None:
            return 0
        return await self._repo.count_total()

    # ------------------------------------------------------------------
    # §2.9 fallback — Build dashboard from local analytics_events
    # ------------------------------------------------------------------

    async def build_dashboard_from_local_events(self) -> AnalyticsDashboardResponse:
        """Compute the same aggregations that Snowflake would provide,
        using the local ``analytics_events`` table as source of truth.
        """
        if self._repo is None:
            return AnalyticsDashboardResponse(
                copay_savings=CopaySavingsSummary(),
                visit_efficiency=VisitEfficiency(),
            )

        all_events = await self._repo.find_all(limit=5000)

        total_copay_saved = 0.0
        copay_values: list[float] = []
        total_prescriptions = 0
        coverage_buckets: dict[str, CopayByStatus] = {}

        block_buckets: dict[str, int] = {}
        total_blocks = 0

        visit_count = 0
        visit_durations: list[float] = []
        total_rx_in_visits = 0

        adherence_map: dict[str, dict[str, Any]] = {}

        for ev in all_events:
            data = ev.event_data or {}
            etype = ev.event_type

            if etype == AnalyticsEventType.OPTION_APPROVED.value:
                total_prescriptions += 1
                copay = data.get("copay")
                if copay is not None:
                    copay_values.append(float(copay))
                    copay_delta = data.get("copayDelta")
                    if copay_delta is not None:
                        total_copay_saved += float(copay_delta)

                status = data.get("coverageStatus", "UNKNOWN")
                bucket = coverage_buckets.setdefault(
                    status, CopayByStatus(coverage_status=status)
                )
                bucket.count += 1
                bucket.total_copay += float(copay) if copay else 0.0

                med = data.get("medication", "")
                if med and copay is not None:
                    adherence_map[med] = {
                        "copay": float(copay),
                        "tier": data.get("tier"),
                        "coverage_status": status,
                    }

            elif etype == AnalyticsEventType.OPTION_BLOCKED.value:
                total_blocks += 1
                block_type = data.get("blockType") or _classify_block_reason(data.get("reason", "UNKNOWN"))
                block_buckets[block_type] = block_buckets.get(block_type, 0) + 1

            elif etype == AnalyticsEventType.VISIT_CREATED.value:
                visit_count += 1

            elif etype == AnalyticsEventType.VISIT_COMPLETED.value:
                duration = data.get("durationMinutes")
                if duration is not None:
                    visit_durations.append(float(duration))
                rx_count = data.get("prescriptionsCount", 0)
                total_rx_in_visits += int(rx_count)

        avg_copay = sum(copay_values) / len(copay_values) if copay_values else 0.0
        avg_duration = sum(visit_durations) / len(visit_durations) if visit_durations else 0.0

        safety_blocks: list[SafetyBlockReason] = []
        for bt, cnt in sorted(block_buckets.items(), key=lambda x: -x[1]):
            pct = (cnt / total_blocks * 100) if total_blocks else 0.0
            safety_blocks.append(SafetyBlockReason(block_type=bt, count=cnt, percentage=round(pct, 1)))

        adherence_risks: list[AdherenceRisk] = []
        for med, info in adherence_map.items():
            copay_val = info["copay"]
            if copay_val > 50:
                risk = "HIGH_RISK"
            elif copay_val > 25:
                risk = "MODERATE_RISK"
            else:
                risk = "LOW_RISK"
            adherence_risks.append(AdherenceRisk(
                medication=med,
                copay=copay_val,
                tier=info.get("tier"),
                coverage_status=info.get("coverage_status", "UNKNOWN"),
                risk_level=risk,
            ))
        adherence_risks.sort(key=lambda r: -r.copay)

        return AnalyticsDashboardResponse(
            copay_savings=CopaySavingsSummary(
                total_copay_saved=round(total_copay_saved, 2),
                average_copay=round(avg_copay, 2),
                total_prescriptions=total_prescriptions,
            ),
            copay_by_status=list(coverage_buckets.values()),
            safety_blocks=safety_blocks,
            visit_efficiency=VisitEfficiency(
                total_visits=visit_count,
                avg_duration_minutes=round(avg_duration, 1),
                total_prescriptions=total_rx_in_visits,
            ),
            adherence_risks=adherence_risks,
            data_source="local",
        )

    # ------------------------------------------------------------------
    # §2.6 / §2.8 — Snowflake dashboard (try Snowflake, fall back local)
    # ------------------------------------------------------------------

    async def get_dashboard(self) -> AnalyticsDashboardResponse:
        """Return dashboard data from Snowflake when available, otherwise
        fall back to local PostgreSQL aggregation (§2.9).
        """
        sf_result = await self._snowflake.get_dashboard()
        if sf_result is not None:
            return sf_result
        return await self.build_dashboard_from_local_events()

    async def sync_all_to_snowflake(self) -> SyncResult:
        """Batch-sync all local events to Snowflake."""
        if self._repo is None:
            return SyncResult(message="No database session")
        all_events = await self._repo.find_all(limit=10_000)
        return await self._snowflake.sync_events_batch(all_events)

    # ------------------------------------------------------------------
    # §2.8 — Non-blocking Snowflake sync (fire-and-forget per event)
    # ------------------------------------------------------------------

    def _schedule_snowflake_sync(self, event: AnalyticsEvent) -> None:
        """Fire-and-forget Snowflake sync.  Failures are logged, never propagated."""
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self._sync_event_to_snowflake(event))
        except RuntimeError:
            pass

    async def _sync_event_to_snowflake(self, event: AnalyticsEvent) -> None:
        """Delegate to SnowflakeService; catch all errors (§2.9)."""
        try:
            await self._snowflake.sync_event(event)
        except Exception:
            logger.exception("Snowflake sync failed for event %s", event.id)

    # ------------------------------------------------------------------
    # Buffer helpers (used when no DB session is available)
    # ------------------------------------------------------------------

    def flush(self) -> list[dict[str, Any]]:
        """Return and clear the in-memory event buffer."""
        events = self._buffer.copy()
        self._buffer.clear()
        return events

    @property
    def pending_events(self) -> list[dict[str, Any]]:
        """Snapshot of buffered events (non-destructive)."""
        return list(self._buffer)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _classify_block_reason(reason: str) -> str:
    """Map a free-text block reason to one of the standard block type buckets."""
    lower = reason.lower()
    if "allerg" in lower:
        return "ALLERGY"
    if "interaction" in lower:
        return "INTERACTION"
    if "dose" in lower:
        return "DOSE_RANGE"
    if "duplicate" in lower:
        return "DUPLICATE_THERAPY"
    return "OTHER"
