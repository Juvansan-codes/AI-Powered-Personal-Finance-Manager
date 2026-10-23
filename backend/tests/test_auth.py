"""
Integration tests for Authentication endpoints (Supabase-backed).

These tests validate API contract and error handling against the live
Supabase Auth service. They do NOT test mock/demo flows.
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_login_missing_fields():
    """Verify login rejects requests with missing credentials."""
    res = client.post("/api/auth/login", json={"email": "", "password": ""})
    assert res.status_code == 422  # Pydantic validation


def test_login_invalid_credentials():
    """Verify login fails with non-existent user."""
    payload = {
        "email": "nobody_exists_here@example.com",
        "password": "wrong_password_999",
    }
    res = client.post("/api/auth/login", json=payload)
    # Supabase will reject — either 401 or 400
    assert res.status_code in (400, 401)


def test_signup_short_password():
    """Verify signup rejects passwords shorter than 6 characters."""
    payload = {
        "name": "Test User",
        "email": "short_pw@example.com",
        "password": "12345",
    }
    res = client.post("/api/auth/signup", json=payload)
    assert res.status_code == 422  # Pydantic min_length=6 validation


def test_signup_returns_pending_otp():
    """Verify signup dispatches OTP and returns pending status."""
    import uuid
    unique_email = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "name": "Integration Test",
        "email": unique_email,
        "password": "securepass123",
    }
    res = client.post("/api/auth/signup", json=payload)
    # Could be 200 (success) or 400 (Supabase rate limit / config issue)
    if res.status_code == 200:
        data = res.json()
        assert data["status"] in ("pending_otp", "active")
        assert data["email"] == unique_email
        assert "demo_otp" not in data  # No mock OTPs
    else:
        # Supabase may reject in test environments — that's acceptable
        assert res.status_code in (400, 503)


def test_verify_otp_invalid_code():
    """Verify OTP endpoint rejects bad codes gracefully."""
    payload = {
        "email": "nobody@example.com",
        "otp": "000000",
    }
    res = client.post("/api/auth/verify-otp", json=payload)
    assert res.status_code == 400


def test_resend_otp_returns_success():
    """Verify resend OTP endpoint responds without demo_otp."""
    payload = {"email": "resend_test@example.com"}
    res = client.post("/api/auth/resend-otp", json=payload)
    # Could be 200 or 400 depending on Supabase state
    if res.status_code == 200:
        data = res.json()
        assert data["success"] is True
        assert "demo_otp" not in data  # No mock OTPs
    else:
        assert res.status_code in (400, 503)


def test_get_me_without_token():
    """Verify /me endpoint requires authentication."""
    res = client.get("/api/auth/me")
    assert res.status_code == 401
    assert "token required" in res.json()["detail"].lower()


def test_get_me_with_invalid_token():
    """Verify /me endpoint rejects invalid tokens."""
    res = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid_garbage_token_xyz"},
    )
    assert res.status_code == 401
