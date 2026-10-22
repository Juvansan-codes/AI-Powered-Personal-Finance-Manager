"""Tests for settings and model quota endpoints."""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_get_quota_endpoint():
    res = client.get("/api/settings/quota")
    assert res.status_code == 200
    data = res.json()
    assert "user_profile" in data
    assert data["user_profile"]["name"] == "E. Abishek Joseph"
    assert data["user_profile"]["initials"] == "EJ"
    assert data["user_profile"]["plan_tier"] == "Go"
    assert "quota_metrics" in data
    assert "tpm" in data["quota_metrics"]
    assert "rpm" in data["quota_metrics"]
    assert "audio" in data["quota_metrics"]
    assert "database" in data


def test_test_connection_endpoint():
    res = client.post("/api/settings/test-connection")
    assert res.status_code in (200, 502, 503)
    if res.status_code == 200:
        data = res.json()
        assert data["status"] == "healthy"
        assert "latency_ms" in data
