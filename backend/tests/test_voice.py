"""Tests for voice transcription and transaction extraction endpoints."""
import io
import json
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.db.database import init_db, get_connection

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    """Ensure database tables exist before testing."""
    init_db()


def get_db_transaction_count() -> int:
    """Helper to query the number of transactions currently in database."""
    conn = get_connection()
    count = conn.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
    conn.close()
    return count


# --- 1. Audio Upload & Validation Tests ---

def test_transcribe_missing_file():
    """Test that submitting without a file returns 422 or 400."""
    res = client.post("/api/voice/transcribe")
    assert res.status_code in (400, 422)


def test_transcribe_empty_audio_file():
    """Test that submitting an empty audio file returns 400 Bad Request."""
    empty_file = io.BytesIO(b"")
    res = client.post(
        "/api/voice/transcribe",
        files={"file": ("empty.webm", empty_file, "audio/webm")},
    )
    assert res.status_code == 400
    assert "empty" in res.json()["detail"].lower()


def test_transcribe_invalid_audio_format():
    """Test that submitting an unsupported format returns 400."""
    text_file = io.BytesIO(b"not an audio file")
    res = client.post(
        "/api/voice/transcribe",
        files={"file": ("notes.txt", text_file, "text/plain")},
    )
    assert res.status_code == 400
    assert "unsupported" in res.json()["detail"].lower()


def test_transcribe_file_too_large():
    """Test that audio exceeding 25MB returns 413."""
    with patch("app.api.voice.MAX_AUDIO_SIZE_BYTES", 100):
        oversized = io.BytesIO(b"x" * 200)
        res = client.post(
            "/api/voice/transcribe",
            files={"file": ("test.webm", oversized, "audio/webm")},
        )
        assert res.status_code == 413
        assert "maximum allowed" in res.json()["detail"].lower()


# --- 2. Transcription with Mocked Groq STT ---

@patch("app.services.groq_service.get_groq_client")
def test_transcribe_successful(mock_get_client):
    """Test successful audio transcription using mocked Groq Whisper."""
    mock_client = MagicMock()
    mock_transcription = MagicMock()
    mock_transcription.text = "I spent 250 rupees on dinner yesterday"
    mock_client.audio.transcriptions.create.return_value = mock_transcription
    mock_get_client.return_value = mock_client

    fake_audio = io.BytesIO(b"\x1a\x45\xdf\xa3fake_webm_header_and_data")
    res = client.post(
        "/api/voice/transcribe",
        files={"file": ("recording.webm", fake_audio, "audio/webm")},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["text"] == "I spent 250 rupees on dinner yesterday"
    assert data["filename"] == "recording.webm"


@patch("app.services.groq_service.os.getenv")
def test_transcribe_missing_api_key(mock_getenv):
    """Test transcription returns 503 when GROQ_API_KEY is missing."""
    mock_getenv.return_value = ""
    fake_audio = io.BytesIO(b"audio content")
    res = client.post(
        "/api/voice/transcribe",
        files={"file": ("recording.wav", fake_audio, "audio/wav")},
    )
    assert res.status_code == 503
    assert "GROQ_API_KEY" in res.json()["detail"]


@patch("app.services.groq_service.get_groq_client")
def test_transcribe_rate_limit(mock_get_client):
    """Test rate limit error returns 429."""
    mock_client = MagicMock()
    mock_client.audio.transcriptions.create.side_effect = Exception("Rate limit reached: 429 Too Many Requests")
    mock_get_client.return_value = mock_client

    fake_audio = io.BytesIO(b"audio content")
    res = client.post(
        "/api/voice/transcribe",
        files={"file": ("recording.wav", fake_audio, "audio/wav")},
    )
    assert res.status_code == 429


# --- 3. Transaction Information Extraction Tests ---

def test_extract_empty_text():
    """Test that empty or whitespace text returns 400."""
    res = client.post("/api/voice/extract", json={"text": "   "})
    assert res.status_code == 400


@patch("app.services.groq_service.get_groq_client")
def test_extract_valid_expense(mock_get_client):
    """Test extraction of complete expense transaction."""
    mock_client = MagicMock()
    mock_completion = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = json.dumps({
        "type": "expense",
        "amount": 250.0,
        "description": "Dinner",
        "category": "Food",
        "date": "2026-10-17",
        "confidence": "high",
        "missing_fields": [],
        "clarification_needed": None,
    })
    mock_completion.choices = [mock_choice]
    mock_client.chat.completions.create.return_value = mock_completion
    mock_get_client.return_value = mock_client

    res = client.post(
        "/api/voice/extract",
        json={"text": "I spent 250 rupees on dinner yesterday", "current_date": "2026-10-18"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_complete"] is True
    assert data["missing_fields"] == []
    assert data["draft"] is not None
    assert data["draft"]["amount"] == 250.0
    assert data["draft"]["type"] == "expense"
    assert data["draft"]["category"] == "Food"
    assert data["draft"]["description"] == "Dinner"
    assert data["draft"]["date"] == "2026-10-17"


@patch("app.services.groq_service.get_groq_client")
def test_extract_valid_income(mock_get_client):
    """Test extraction of income transaction."""
    mock_client = MagicMock()
    mock_completion = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = json.dumps({
        "type": "income",
        "amount": 5000.0,
        "description": "Freelance payment",
        "category": "Other Income",
        "date": "2026-10-18",
        "confidence": "high",
        "missing_fields": [],
        "clarification_needed": None,
    })
    mock_completion.choices = [mock_choice]
    mock_client.chat.completions.create.return_value = mock_completion
    mock_get_client.return_value = mock_client

    res = client.post(
        "/api/voice/extract",
        json={"text": "I received 5000 rupees as freelance payment", "current_date": "2026-10-18"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_complete"] is True
    assert data["draft"]["amount"] == 5000.0
    assert data["draft"]["type"] == "income"
    assert data["draft"]["category"] == "Other Income"


@patch("app.services.groq_service.get_groq_client")
def test_extract_missing_amount_does_not_hallucinate(mock_get_client):
    """Test that missing amount is flagged and not hallucinated."""
    mock_client = MagicMock()
    mock_completion = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = json.dumps({
        "type": "expense",
        "amount": None,
        "description": "Dinner with friends",
        "category": "Food",
        "date": "2026-10-18",
        "confidence": "low",
        "missing_fields": ["amount"],
        "clarification_needed": "Could not detect the amount spent.",
    })
    mock_completion.choices = [mock_choice]
    mock_client.chat.completions.create.return_value = mock_completion
    mock_get_client.return_value = mock_client

    res = client.post(
        "/api/voice/extract",
        json={"text": "I had dinner with friends yesterday", "current_date": "2026-10-18"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_complete"] is False
    assert "amount" in data["missing_fields"]
    assert data["draft"]["amount"] is None
    assert data["clarification_needed"] is not None


@patch("app.services.groq_service.get_groq_client")
def test_extract_invalid_category_fallback(mock_get_client):
    """Test that an invalid or unsupported LLM category falls back to valid taxonomy."""
    mock_client = MagicMock()
    mock_completion = MagicMock()
    mock_choice = MagicMock()
    # LLM hallucinates non-existent category 'Space Travel'
    mock_choice.message.content = json.dumps({
        "type": "expense",
        "amount": 120.0,
        "description": "swiggy burger lunch",
        "category": "Space Travel",
        "date": "2026-10-18",
        "confidence": "medium",
        "missing_fields": [],
        "clarification_needed": None,
    })
    mock_completion.choices = [mock_choice]
    mock_client.chat.completions.create.return_value = mock_completion
    mock_get_client.return_value = mock_client

    res = client.post(
        "/api/voice/extract",
        json={"text": "Spent 120 on swiggy burger lunch"},
    )
    assert res.status_code == 200
    data = res.json()
    # Categorizer should have mapped 'swiggy burger lunch' to Food
    assert data["draft"]["category"] == "Food"


@patch("app.services.groq_service.get_groq_client")
def test_extract_invalid_llm_json_fallback(mock_get_client):
    """Test that malformed model output falls back gracefully rather than 500 error."""
    mock_client = MagicMock()
    mock_client.chat.completions.create.side_effect = Exception("Model output parse error")
    mock_get_client.return_value = mock_client

    res = client.post(
        "/api/voice/extract",
        json={"text": "Paid 300 for grocery shopping", "current_date": "2026-10-18"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_complete"] is False
    assert data["draft"] is not None
    # Categorizer should have classified grocery as Shopping/Food
    assert data["draft"]["category"] in ("Food", "Shopping", "Other")


@patch("app.services.groq_service.os.getenv")
def test_extract_missing_api_key(mock_getenv):
    """Test extraction returns 503 when GROQ_API_KEY is not set."""
    mock_getenv.return_value = ""
    res = client.post("/api/voice/extract", json={"text": "Spent 50 on snacks"})
    assert res.status_code == 503
    assert "GROQ_API_KEY" in res.json()["detail"]


# --- 4. Database Immutability During Extraction / Transcription ---

@patch("app.services.groq_service.get_groq_client")
def test_no_transaction_saved_before_confirmation(mock_get_client):
    """
    CRITICAL REQUIREMENT:
    Ensure that neither voice transcription nor extraction saves any transaction
    to the database without explicit user confirmation.
    """
    initial_count = get_db_transaction_count()

    mock_client = MagicMock()
    # Mock STT
    mock_stt = MagicMock()
    mock_stt.text = "I spent 999 on textbooks today"
    mock_client.audio.transcriptions.create.return_value = mock_stt
    # Mock LLM
    mock_llm = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = json.dumps({
        "type": "expense",
        "amount": 999.0,
        "description": "Textbooks",
        "category": "Education",
        "date": "2026-10-18",
        "confidence": "high",
        "missing_fields": [],
        "clarification_needed": None,
    })
    mock_llm.choices = [mock_choice]
    mock_client.chat.completions.create.return_value = mock_llm
    mock_get_client.return_value = mock_client

    # 1. Transcribe
    fake_audio = io.BytesIO(b"dummy audio stream")
    res_t = client.post(
        "/api/voice/transcribe",
        files={"file": ("recording.webm", fake_audio, "audio/webm")},
    )
    assert res_t.status_code == 200
    count_after_transcribe = get_db_transaction_count()
    assert count_after_transcribe == initial_count, "Transcription must not save transactions"

    # 2. Extract
    res_e = client.post(
        "/api/voice/extract",
        json={"text": res_t.json()["text"], "current_date": "2026-10-18"},
    )
    assert res_e.status_code == 200
    count_after_extract = get_db_transaction_count()
    assert count_after_extract == initial_count, "Extraction must not save transactions"
