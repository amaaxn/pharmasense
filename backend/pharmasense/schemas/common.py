"""Standard API response envelope and shared DTOs.

Every API response uses ``ApiResponse`` as the outer wrapper (Part 1 §6.1).
"""

from __future__ import annotations

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ErrorDetail(BaseModel):
    error: str
    error_code: str
    details: dict[str, Any] | None = None


class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T | None = None
    error: str | None = None
    error_code: str | None = None
    meta: dict[str, Any] | None = None
