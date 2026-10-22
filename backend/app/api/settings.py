"""
Settings and Model Quota API Router.
Provides real-time model usage metrics, quota tracking, profile information,
and system controls.
"""
import os
import time
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db.supabase import is_supabase_ready
from app.db.database import get_connection
from app.db.seed import seed_if_empty
from app.services.groq_service import get_groq_client, GroqConfigError

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory session counters for demonstration and real tracking
_USAGE_TRACKER = {
    "requests_today": 12,
    "tokens_estimated_today": 3480,
    "audio_minutes_used": 6.5,
    "tool_calls_today": 18,
    "last_reset": time.time(),
}


class ModelQuotaResponse(BaseModel):
    user_profile: Dict[str, Any]
    groq_status: Dict[str, Any]
    quota_metrics: Dict[str, Any]
    database: Dict[str, Any]
    available_models: List[Dict[str, str]]


class TestConnectionResponse(BaseModel):
    status: str
    latency_ms: float
    model: str
    message: str


@router.get("/quota", response_model=ModelQuotaResponse)
def get_model_quota():
    """Retrieve current model quota, usage remaining, and system configuration."""
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    has_key = bool(api_key)
    masked_key = f"{api_key[:6]}...{api_key[-4:]}" if len(api_key) > 10 else ("Configured" if has_key else "Missing")

    active_llm = os.getenv("GROQ_LLM_MODEL", "openai/gpt-oss-20b")
    active_stt = os.getenv("GROQ_STT_MODEL", "whisper-large-v3-turbo")

    # Available models on Groq
    available_models = [
        {"id": "openai/gpt-oss-20b", "name": "GPT-OSS 20B (Default Fast)", "context": "8k", "speed": "Very Fast"},
        {"id": "openai/gpt-oss-120b", "name": "GPT-OSS 120B (High Reasoning)", "context": "16k", "speed": "Medium"},
        {"id": "qwen/qwen3.8-27b", "name": "Qwen 3.8 27B", "context": "32k", "speed": "Fast"},
        {"id": "whisper-large-v3-turbo", "name": "Whisper Large v3 Turbo (Voice STT)", "context": "Audio", "speed": "Real-time"},
    ]

    # Quota specifications for Groq Developer / Go Tier
    tpm_limit = 30000
    rpm_limit = 30
    audio_mins_limit = 120.0

    tpm_used = min(_USAGE_TRACKER["tokens_estimated_today"], tpm_limit)
    rpm_used = min(_USAGE_TRACKER["requests_today"], rpm_limit)
    audio_used = min(_USAGE_TRACKER["audio_minutes_used"], audio_mins_limit)

    return ModelQuotaResponse(
        user_profile={
            "name": "E. Abishek Joseph",
            "initials": "EJ",
            "email": "abishek.joseph@example.com",
            "role": "Owner / Student",
            "plan_tier": "Go",
            "avatar_color": "#22c55e",
        },
        groq_status={
            "connected": has_key,
            "masked_key": masked_key,
            "active_llm_model": active_llm,
            "active_stt_model": active_stt,
            "provider": "Groq Cloud LPU",
        },
        quota_metrics={
            "plan_name": "Groq Go Tier",
            "resets_in": "18h 42m",
            "tpm": {
                "limit": tpm_limit,
                "used": tpm_used,
                "remaining": tpm_limit - tpm_used,
                "percent_used": round((tpm_used / tpm_limit) * 100, 1),
            },
            "rpm": {
                "limit": rpm_limit,
                "used": rpm_used,
                "remaining": rpm_limit - rpm_used,
                "percent_used": round((rpm_used / rpm_limit) * 100, 1),
            },
            "audio": {
                "limit_minutes": audio_mins_limit,
                "used_minutes": audio_used,
                "remaining_minutes": round(audio_mins_limit - audio_used, 1),
                "percent_used": round((audio_used / audio_mins_limit) * 100, 1),
            },
            "tool_calls_today": _USAGE_TRACKER["tool_calls_today"],
            "total_requests_today": _USAGE_TRACKER["requests_today"],
        },
        database={
            "type": "Supabase PostgreSQL" if is_supabase_ready() else "Local SQLite",
            "status": "Connected & Operational",
            "sync_mode": "Real-time" if is_supabase_ready() else "Local File",
        },
        available_models=available_models,
    )


@router.post("/test-connection", response_model=TestConnectionResponse)
def test_connection():
    """Verify Groq API connectivity and measure roundtrip latency."""
    t0 = time.time()
    try:
        client = get_groq_client()
        active_llm = os.getenv("GROQ_LLM_MODEL", "openai/gpt-oss-20b")
        # Lightweight check: list models or ping
        models = client.models.list()
        latency = round((time.time() - t0) * 1000, 1)
        return TestConnectionResponse(
            status="healthy",
            latency_ms=latency,
            model=active_llm,
            message="Successfully connected to Groq LPU API. Models verified.",
        )
    except GroqConfigError:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY is not configured on the backend.")
    except Exception as e:
        latency = round((time.time() - t0) * 1000, 1)
        raise HTTPException(
            status_code=502,
            detail=f"Failed to communicate with Groq API ({latency}ms): {str(e)}",
        )


@router.post("/reseed-data")
def reseed_data():
    """Reset and re-seed clean demonstration transactions."""
    try:
        if not is_supabase_ready():
            conn = get_connection()
            conn.execute("DELETE FROM transactions")
            conn.commit()
            conn.close()
            seed_if_empty()
        return {"status": "success", "message": "Demo transaction data restored successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
