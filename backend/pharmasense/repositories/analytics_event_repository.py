"""AnalyticsEventRepository — query layer for analytics_events (Part 6 §1.3)."""

from __future__ import annotations

from datetime import datetime
from typing import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from pharmasense.models.analytics_event import AnalyticsEvent


class AnalyticsEventRepository:
    """Async repository for the ``analytics_events`` table."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def save(self, event: AnalyticsEvent) -> AnalyticsEvent:
        self._session.add(event)
        await self._session.flush()
        return event

    async def find_by_event_type(
        self,
        event_type: str,
        *,
        limit: int = 100,
        offset: int = 0,
    ) -> Sequence[AnalyticsEvent]:
        stmt = (
            select(AnalyticsEvent)
            .where(AnalyticsEvent.event_type == event_type)
            .order_by(AnalyticsEvent.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def find_by_created_at_after(
        self,
        after: datetime,
        *,
        limit: int = 500,
    ) -> Sequence[AnalyticsEvent]:
        stmt = (
            select(AnalyticsEvent)
            .where(AnalyticsEvent.created_at >= after)
            .order_by(AnalyticsEvent.created_at.asc())
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def count_by_event_type(self) -> list[tuple[str, int]]:
        """Return ``[(event_type, count), ...]`` for all event types."""
        stmt = (
            select(
                AnalyticsEvent.event_type,
                func.count(AnalyticsEvent.id).label("cnt"),
            )
            .group_by(AnalyticsEvent.event_type)
            .order_by(func.count(AnalyticsEvent.id).desc())
        )
        result = await self._session.execute(stmt)
        return [(row[0], row[1]) for row in result.all()]

    async def count_total(self) -> int:
        stmt = select(func.count(AnalyticsEvent.id))
        result = await self._session.execute(stmt)
        return result.scalar() or 0

    async def find_all(
        self,
        *,
        limit: int = 500,
        offset: int = 0,
    ) -> Sequence[AnalyticsEvent]:
        stmt = (
            select(AnalyticsEvent)
            .order_by(AnalyticsEvent.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def find_not_synced(self, *, limit: int = 100) -> Sequence[AnalyticsEvent]:
        """Return events that haven't been synced to Snowflake yet.

        Uses a simple heuristic: events without a ``synced_at`` flag in
        ``event_data``.  A dedicated ``synced_at`` column would be cleaner but
        this avoids a migration for now.
        """
        stmt = (
            select(AnalyticsEvent)
            .where(
                AnalyticsEvent.event_data["synced_at"].is_(None)
                | ~AnalyticsEvent.event_data.has_key("synced_at")  # noqa: W601
            )
            .order_by(AnalyticsEvent.created_at.asc())
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return result.scalars().all()
