"""AnalyticsService tests (Part 2B §6).

Verifies event emission, buffering, flushing, and model creation.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from pharmasense.models.analytics_event import AnalyticsEvent
from pharmasense.schemas.prescription_ops import AnalyticsEventType
from pharmasense.services.analytics_service import AnalyticsService


# ---------------------------------------------------------------------------
# §6.3 — emit() without DB session (in-memory buffer)
# ---------------------------------------------------------------------------

class TestBufferMode:

    def test_emit_buffers_event(self) -> None:
        svc = AnalyticsService()
        svc.emit(AnalyticsEventType.RECOMMENDATION_GENERATED, {"visitId": "abc"})
        assert len(svc.pending_events) == 1
        assert svc.pending_events[0]["event_type"] == "RECOMMENDATION_GENERATED"

    def test_emit_returns_analytics_event_model(self) -> None:
        svc = AnalyticsService()
        result = svc.emit(
            AnalyticsEventType.OPTION_APPROVED,
            {"prescriptionId": "p1", "medication": "Metformin"},
        )
        assert isinstance(result, AnalyticsEvent)
        assert result.event_type == "OPTION_APPROVED"
        assert result.event_data["medication"] == "Metformin"

    def test_flush_returns_and_clears(self) -> None:
        svc = AnalyticsService()
        svc.emit(AnalyticsEventType.OPTION_BLOCKED, {"medication": "Aspirin"})
        svc.emit(AnalyticsEventType.OPTION_REJECTED, {"reason": "declined"})
        flushed = svc.flush()
        assert len(flushed) == 2
        assert len(svc.pending_events) == 0

    def test_pending_events_is_snapshot(self) -> None:
        svc = AnalyticsService()
        svc.emit(AnalyticsEventType.RECOMMENDATION_GENERATED, {})
        snap = svc.pending_events
        svc.emit(AnalyticsEventType.OPTION_APPROVED, {})
        assert len(snap) == 1
        assert len(svc.pending_events) == 2

    def test_emit_with_user_and_session(self) -> None:
        svc = AnalyticsService()
        result = svc.emit(
            AnalyticsEventType.PATIENT_PACK_VIEWED,
            {"prescriptionId": "p1"},
            user_id="550e8400-e29b-41d4-a716-446655440000",
            session_id="sess-123",
        )
        assert result.session_id == "sess-123"
        buf = svc.pending_events[0]
        assert buf["user_id"] == "550e8400-e29b-41d4-a716-446655440000"
        assert buf["session_id"] == "sess-123"


# ---------------------------------------------------------------------------
# §6.3 — emit() with DB session (mock)
# ---------------------------------------------------------------------------

class TestSessionMode:

    def test_emit_adds_to_session(self) -> None:
        mock_session = MagicMock()
        svc = AnalyticsService(session=mock_session)
        svc.emit(AnalyticsEventType.OPTION_APPROVED, {"med": "X"})
        mock_session.add.assert_called_once()
        arg = mock_session.add.call_args[0][0]
        assert isinstance(arg, AnalyticsEvent)
        assert arg.event_type == "OPTION_APPROVED"

    def test_session_mode_does_not_buffer(self) -> None:
        mock_session = MagicMock()
        svc = AnalyticsService(session=mock_session)
        svc.emit(AnalyticsEventType.RECOMMENDATION_GENERATED, {})
        assert len(svc.pending_events) == 0


# ---------------------------------------------------------------------------
# §6.4 — All event types are valid
# ---------------------------------------------------------------------------

class TestEventTypes:

    @pytest.mark.parametrize("event_type", list(AnalyticsEventType))
    def test_all_event_types_emit(self, event_type: AnalyticsEventType) -> None:
        svc = AnalyticsService()
        result = svc.emit(event_type, {"test": True})
        assert result.event_type == event_type.value
