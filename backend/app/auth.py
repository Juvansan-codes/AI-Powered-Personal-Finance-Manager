import logging
from fastapi import Header, HTTPException, status

from app.db.supabase import get_supabase_client

logger = logging.getLogger(__name__)


def require_user(authorization: str | None = Header(default=None)) -> str:
    """Return the authenticated Supabase user id from a Bearer token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    client = get_supabase_client()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase authentication is not configured",
        )

    try:
        user_response = client.auth.get_user(token)
        user = user_response.user
        if not user or not user.id:
            raise ValueError("No user returned from Supabase auth")
        return str(user.id)
    except Exception as e:
        logger.warning(f"Auth verification failed: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
            headers={"WWW-Authenticate": "Bearer"},
        )
