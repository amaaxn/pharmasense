"""
Thin async wrapper around the Supabase PostgREST API.

Replaces the asyncpg / SQLAlchemy direct connection when the Supabase project
is IPv6-only (free-tier) and the local network only has IPv4 routing.

Usage:
    client = get_supabase()
    rows   = await client.select("patients", filters={"user_id": "eq.UUID"})
    row    = await client.insert("patients", data={...})
    rows   = await client.update("patients", filters={"id": "eq.UUID"}, data={...})
    await  client.delete("patients", filters={"id": "eq.UUID"})
"""

from __future__ import annotations

import json
import logging
from functools import lru_cache
from typing import Any

import httpx

from pharmasense.config import settings

logger = logging.getLogger(__name__)

_BASE_HEADERS = {
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


class SupabaseClient:
    def __init__(self, url: str, service_key: str) -> None:
        self._base = url.rstrip("/") + "/rest/v1"
        self._headers = {
            **_BASE_HEADERS,
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
        }

    # ------------------------------------------------------------------ #
    # Internals
    # ------------------------------------------------------------------ #

    def _url(self, table: str) -> str:
        return f"{self._base}/{table}"

    async def _request(
        self,
        method: str,
        table: str,
        *,
        params: dict[str, str] | None = None,
        json_body: Any = None,
        extra_headers: dict[str, str] | None = None,
    ) -> list[dict] | dict | None:
        headers = {**self._headers, **(extra_headers or {})}
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.request(
                method,
                self._url(table),
                params=params,
                headers=headers,
                content=json.dumps(json_body) if json_body is not None else None,
            )
        if resp.status_code in (200, 201, 204):
            if resp.content:
                return resp.json()
            return []
        logger.error("Supabase %s %s → %s %s", method, table, resp.status_code, resp.text[:200])
        resp.raise_for_status()
        return []

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #

    async def select(
        self,
        table: str,
        *,
        columns: str = "*",
        filters: dict[str, str] | None = None,
        order: str | None = None,
        limit: int | None = None,
    ) -> list[dict]:
        params: dict[str, str] = {"select": columns}
        if filters:
            params.update(filters)
        if order:
            params["order"] = order
        if limit is not None:
            params["limit"] = str(limit)
        result = await self._request("GET", table, params=params)
        return result if isinstance(result, list) else ([result] if result else [])

    async def select_one(
        self,
        table: str,
        *,
        columns: str = "*",
        filters: dict[str, str] | None = None,
    ) -> dict | None:
        rows = await self.select(table, columns=columns, filters=filters, limit=1)
        return rows[0] if rows else None

    async def insert(self, table: str, data: dict) -> dict:
        result = await self._request(
            "POST",
            table,
            json_body=data,
            extra_headers={"Prefer": "return=representation"},
        )
        if isinstance(result, list):
            return result[0] if result else {}
        return result or {}

    async def update(
        self,
        table: str,
        *,
        filters: dict[str, str],
        data: dict,
    ) -> dict:
        result = await self._request(
            "PATCH",
            table,
            params=filters,
            json_body=data,
            extra_headers={"Prefer": "return=representation"},
        )
        if isinstance(result, list):
            return result[0] if result else {}
        return result or {}

    async def delete(self, table: str, *, filters: dict[str, str]) -> None:
        await self._request("DELETE", table, params=filters)

    async def upsert(self, table: str, data: dict, *, on_conflict: str) -> dict:
        result = await self._request(
            "POST",
            table,
            json_body=data,
            extra_headers={
                "Prefer": f"resolution=merge-duplicates,return=representation",
                "on_conflict": on_conflict,
            },
        )
        if isinstance(result, list):
            return result[0] if result else {}
        return result or {}


@lru_cache(maxsize=1)
def get_supabase() -> SupabaseClient:
    return SupabaseClient(
        url=settings.supabase_url,
        service_key=settings.supabase_service_role_key,
    )
