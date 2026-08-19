"""Clerk JWT verification for per-user API access."""

from typing import Optional

import jwt
from fastapi import Header, HTTPException
from jwt import PyJWKClient

from ..config import get_settings
from ..db.database import database_enabled
from ..utils.logger import get_logger

logger = get_logger(__name__)

_jwks_client: PyJWKClient | None = None


def clerk_enabled() -> bool:
    settings = get_settings()
    return bool(settings.clerk_secret_key and settings.clerk_jwks_url)


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(get_settings().clerk_jwks_url)
    return _jwks_client


def verify_clerk_token(token: str) -> str:
    """Verify Bearer token and return Clerk user id (sub)."""
    settings = get_settings()
    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        decode_kwargs: dict = {
            "algorithms": ["RS256"],
            "options": {"verify_aud": False},
        }
        if settings.clerk_issuer:
            decode_kwargs["issuer"] = settings.clerk_issuer
        payload = jwt.decode(token, signing_key.key, **decode_kwargs)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: missing user id")
        return str(user_id)
    except jwt.PyJWTError as exc:
        logger.warning("JWT verification failed: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token") from exc


async def get_current_user_id(
    authorization: Optional[str] = Header(None),
) -> str:
    """FastAPI dependency — returns authenticated Clerk user id."""
    if database_enabled() and clerk_enabled():
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Authentication required")
        return verify_clerk_token(authorization[7:])

    if authorization and authorization.startswith("Bearer ") and clerk_enabled():
        return verify_clerk_token(authorization[7:])

    return "local-dev"
