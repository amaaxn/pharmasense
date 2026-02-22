import logging
from uuid import UUID

import httpx
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from pharmasense.config import settings

logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer()


class AuthenticatedUser(BaseModel):
    user_id: UUID
    email: str
    role: str


async def _validate_token_with_supabase(token: str) -> dict:
    """
    Ask Supabase to validate the token by calling /auth/v1/user.
    This handles ES256, HS256, key rotation, and expiry automatically.
    """
    url = f"{settings.supabase_url}/auth/v1/user"
    async with httpx.AsyncClient(timeout=8.0) as client:
        resp = await client.get(
            url,
            headers={
                "apikey": settings.supabase_anon_key,
                "Authorization": f"Bearer {token}",
            },
        )
    if resp.status_code == 200:
        return resp.json()
    logger.warning(
        "Supabase token validation failed: %s %s",
        resp.status_code,
        resp.text[:200],
    )
    return {}


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> AuthenticatedUser:
    token = credentials.credentials

    if not token:
        raise HTTPException(status_code=401, detail="Missing token")

    user_data = await _validate_token_with_supabase(token)

    sub = user_data.get("id")
    if not sub:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    email = user_data.get("email", "")
    # Role lives in user_metadata (set at sign-up) or app_metadata
    meta = user_data.get("user_metadata") or {}
    app_meta = user_data.get("app_metadata") or {}
    role = meta.get("role") or app_meta.get("role") or "patient"

    return AuthenticatedUser(user_id=UUID(sub), email=email, role=role)


def require_role(*allowed_roles: str):
    async def _check(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
        if user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return _check
