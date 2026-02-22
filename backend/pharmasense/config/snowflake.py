"""Snowflake connection configuration (Part 6 §2.5).

Provides a thread-safe connection factory that is **separate** from the
primary asyncpg/SQLAlchemy PostgreSQL connection.  The Snowflake Python
connector is synchronous, so all Snowflake I/O runs in a thread-pool
executor via ``asyncio.to_thread``.
"""

from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import TYPE_CHECKING, Generator

if TYPE_CHECKING:
    import snowflake.connector

from pharmasense.config import settings

logger = logging.getLogger(__name__)

_CONNECT_TIMEOUT_SECONDS = 10


def _build_connect_params() -> dict:
    return {
        "account": settings.snowflake_account,
        "user": settings.snowflake_user,
        "password": settings.snowflake_password,
        "database": settings.snowflake_database,
        "schema": settings.snowflake_schema,
        "warehouse": settings.snowflake_warehouse,
        "role": settings.snowflake_role,
        "login_timeout": _CONNECT_TIMEOUT_SECONDS,
        "network_timeout": _CONNECT_TIMEOUT_SECONDS,
    }


@contextmanager
def get_snowflake_connection() -> Generator["snowflake.connector.SnowflakeConnection", None, None]:
    """Yield a Snowflake connection, closing it on exit.

    Raises ``RuntimeError`` if Snowflake is not configured (missing
    credentials).  Callers should catch this and fall back to local
    PostgreSQL queries.
    """
    if not settings.snowflake_configured:
        raise RuntimeError("Snowflake credentials not configured")

    import snowflake.connector

    conn = snowflake.connector.connect(**_build_connect_params())
    try:
        yield conn
    finally:
        conn.close()


def test_snowflake_connection() -> bool:
    """Return True if we can reach Snowflake with the current credentials."""
    try:
        with get_snowflake_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT 1")
            cur.close()
        return True
    except Exception:
        logger.warning("Snowflake connection test failed", exc_info=True)
        return False
