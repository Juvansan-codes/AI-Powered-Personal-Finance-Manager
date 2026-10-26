"""Supabase access-token verification for protected API routes."""
from fastapi import Header, HTTPException, status

from app.db.supabase import get_supabase_client


def require_user(authorization: str | None = Header(default=None)) -> str:
    """Return the authenticated Supabase user id from a Bearer token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    client = get_supabase_client()
    if client is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase authentication is not configured")

    try:
        user_response = client.auth.get_user(authorization.removeprefix("Bearer ").strip())
        user = user_response.user
        if not user or not user.id:
            raise ValueError("No user in token")
        return str(user.id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")
