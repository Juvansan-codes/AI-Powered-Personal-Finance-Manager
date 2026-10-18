"""Voice API routes for transcription and transaction entity extraction."""
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, status

from app.schemas.voice import (
    TranscriptionResponse,
    VoiceExtractRequest,
    VoiceExtractResponse,
)
from app.services.groq_service import (
    transcribe_audio,
    extract_transaction_from_text,
    GroqServiceError,
    GroqConfigError,
    GroqRateLimitError,
    MAX_AUDIO_SIZE_BYTES,
)

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_MIME_PREFIXES = ("audio/", "video/webm")
ALLOWED_EXTENSIONS = (".webm", ".wav", ".mp3", ".m4a", ".ogg", ".flac", ".mp4", ".mpeg")


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe(file: UploadFile = File(...)):
    """
    Transcribe uploaded audio file into text using Groq Whisper.
    Accepts multipart/form-data audio file.
    Does NOT save any transaction.
    """
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No audio file provided in request.",
        )

    filename_lower = file.filename.lower()
    content_type = (file.content_type or "").lower()

    # Validate file extension or MIME type
    is_valid_ext = any(filename_lower.endswith(ext) for ext in ALLOWED_EXTENSIONS)
    is_valid_mime = any(content_type.startswith(p) for p in ALLOWED_MIME_PREFIXES) or content_type == "application/octet-stream"

    if not (is_valid_ext or is_valid_mime):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio format '{content_type}'. Supported formats: webm, wav, mp3, m4a, ogg.",
        )

    # Read audio bytes
    try:
        audio_bytes = await file.read()
    except Exception as e:
        logger.error(f"Error reading audio upload: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to read uploaded audio stream.",
        )

    if len(audio_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded audio file is empty. Please record audio and try again.",
        )

    if len(audio_bytes) > MAX_AUDIO_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Audio file exceeds the maximum allowed upload size (25MB).",
        )

    try:
        text = transcribe_audio(
            file_bytes=audio_bytes,
            filename=file.filename,
            content_type=file.content_type,
        )
        return TranscriptionResponse(text=text, filename=file.filename)
    except GroqConfigError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except GroqRateLimitError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except GroqServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Unexpected error in voice transcription: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during audio transcription.",
        )


@router.post("/extract", response_model=VoiceExtractResponse)
def extract_transaction(req: VoiceExtractRequest):
    """
    Extract structured transaction draft from transcribed text.
    Does NOT save a transaction automatically to the database.
    The client must present the draft to the user for confirmation.
    """
    clean_text = req.text.strip()
    if not clean_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transcription text cannot be empty.",
        )

    try:
        result = extract_transaction_from_text(
            text=clean_text,
            reference_date=req.current_date,
        )
        return VoiceExtractResponse(**result)
    except GroqConfigError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except GroqRateLimitError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except GroqServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Unexpected error in voice extraction: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while parsing transaction details.",
        )
