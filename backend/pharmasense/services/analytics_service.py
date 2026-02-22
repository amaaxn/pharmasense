"""AnalyticsService — de-identified event capture (Part 2B §6).

Creates ``AnalyticsEvent`` model instances for every prescription action.
When a SQLAlchemy ``AsyncSession`` is provided events are persisted to the
``analytics_events`` table; otherwise they are buffered in-memory so the
service is fully usable (and testable) without a live database.

Snowflake sync is deferred to Part 6.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from pharmasense.models.analytics_event import AnalyticsEvent
from pharmasense.schemas.prescription_ops import AnalyticsEventType

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Event emitter that captures de-identified prescription-pipeline events.

    Parameters
    ----------
    session:
        An optional SQLAlchemy ``AsyncSession``.  When provided, ``emit``
        will add an ``AnalyticsEvent`` row to the session (caller must
        commit).  When ``None`` the event is held in an in-memory buffer
        accessible via ``flush()`` / ``pending_events``.
    """

    def __init__(self, session: Any | None = None) -> None:
        self._session = session
        self._buffer: list[dict[str, Any]] = []

    # ------------------------------------------------------------------
    # §6.3 — Core emit method
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

        Returns the model instance regardless of persistence mode.
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
