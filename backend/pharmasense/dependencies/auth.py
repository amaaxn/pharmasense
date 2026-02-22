from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from pharmasense.config import settings

bearer_scheme = HTTPBearer()


class AuthenticatedUser(BaseModel):
    user_id: UUID
    email: str
    role: str


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> AuthenticatedUser:
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    sub = payload.get("sub")
    email = payload.get("email", "")
    role = payload.get("role", payload.get("user_metadata", {}).get("role", "patient"))

    if not sub:
        raise HTTPException(status_code=401, detail="Token missing subject claim")

    return AuthenticatedUser(user_id=UUID(sub), email=email, role=role)


def require_role(*allowed_roles: str):
    async def _check(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
        if user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return _check
