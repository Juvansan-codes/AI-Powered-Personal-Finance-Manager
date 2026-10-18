# FinanceFlow — AI-Powered Personal Finance Manager

> **Course:** Artificial Intelligence — 25CS301  
> **Academic Year:** 2026–27 | **Semester:** III | **Batch:** II / B2  
> **Institution:** Karunya Institute of Technology and Sciences  
> **Course Faculty:** Dr. Evangelin Sonia S V  
> **Team Members:** Juvansan H, Abishek Joseph E, Karol Benjamin M D, P Joel Sathiyan  
> **Current Milestone:** Milestone 2 — Voice-Powered Transactions & Groq AI Extraction  

---

## 1. Project Overview

FinanceFlow is an educational personal finance management platform designed to simplify tracking income and expenses through intelligent automation. 

Traditional finance trackers require tedious manual entry and manual category selection. FinanceFlow solves this by integrating:
- **Voice-Powered Transaction Entry (Milestone 2):** Real-time audio recording via browser `MediaRecorder`, cloud speech-to-text using **Groq Whisper**, and structured entity extraction using **Groq LLM**.
- **Transparent AI Categorization:** Context-aware keyword matching and ML-ready classification for transaction descriptions.
- **Human-in-the-Loop Confirmation:** Extracted transaction drafts are presented in an editable review dialog; transactions are never saved without explicit user confirmation.
- **Dynamic Analytics Dashboard:** Live calculation of net balance, savings rate, categorical spending breakdown, and month-over-month trend comparison.
- **Budget Tracking & Visual Progress:** Category-specific budget limits with real-time percentage indicators.
- **Automated Financial Insights:** Algorithmic heuristics alerting users about high-spending categories, savings health, and unusual amounts.

---

## 2. System Architecture

```text
                        ┌───────────────────────────────────────────────┐
                        │            Next.js 16 (App Router)            │
                        │       React 19 + TypeScript + Tailwind        │
                        │       MediaRecorder + Recharts + Lucide       │
                        └───────────────────────┬───────────────────────┘
                                                │ HTTP / Multipart Form / JSON
                                                ▼
                        ┌───────────────────────────────────────────────┐
                        │            FastAPI Backend (Python)           │
                        │          Pydantic Validation + CORS           │
                        │         Deterministic Business Logic          │
                        └──────────┬────────────────┬───────────────────┘
                                   │                │
            ┌──────────────────────┴───────┐        └───────────────────────────────┐
            ▼                              ▼                                        ▼
┌──────────────────────┐       ┌──────────────────────┐                 ┌────────────────────────┐
│  SQLite Local DB     │       │   AI Categorizer     │                 │   Groq AI Services     │
│  (Persisted WAL mode)│       │   Rule-based Base    │                 │   - Whisper STT        │
│  -> Supabase Postgres│       │   -> TF-IDF + LogReg │                 │   - LLM Extraction     │
└──────────────────────┘       └──────────────────────┘                 └────────────────────────┘
```

### Architectural Principles:
1. **Deterministic Financial Rules:** All balances, totals, and percentages are computed strictly in Python/SQL. Arithmetic is never delegated to generative LLMs.
2. **Explicit User Review:** Voice extraction produces structured draft entities. No record is written to the database until the user explicitly confirms and saves.
3. **Server-Side AI Secrets:** The `GROQ_API_KEY` remains strictly on the FastAPI server and is never sent to the browser or returned in API responses.
4. **Layered Separation:** Frontend components consume typed API services (`@/lib/api.ts`). Backend isolates database models (`app/db/`), routers (`app/api/`), schemas (`app/schemas/`), and AI processing (`app/services/` & `app/ai/`).
5. **Graceful Fallbacks:** Voice processing and AI categorization handle ambiguities, unstated amounts, and invalid categories by prompting the user for clarification rather than hallucinating.

---

## 3. Quick Start & Setup Instructions

### Prerequisites
- **Node.js** v18+ (tested on Node v20/v24)
- **Python** 3.10+ (tested on Python 3.11)
- **Groq API Key** (for Whisper STT and LLM extraction)

---

### Step 1: Configure Groq API Key

1. Sign up for a free Groq account at [console.groq.com](https://console.groq.com).
2. Go to **API Keys** and click **Create API Key**.
3. Create or update `backend/.env` with your API key:

```dotenv
# backend/.env
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_STT_MODEL=whisper-large-v3-turbo
GROQ_LLM_MODEL=openai/gpt-oss-20b
CORS_ORIGINS=http://localhost:3000
```

> **Note:** Never commit `backend/.env` containing real keys to version control. The repository includes `.env.example` with placeholder names.

---

### Step 2: Start the Backend (FastAPI)

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment (optional but recommended)
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server (runs on port 8000)
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- **API Base:** `http://localhost:8000`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`
- **Health Check:** `http://localhost:8000/health`

---

### Step 3: Start the Frontend (Next.js)

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start Next.js development server (runs on port 3000)
npm run dev
```

- **Web App:** `http://localhost:3000`

---

### Step 4: Running Automated Tests

Run the complete backend test suite (23 unit & integration tests):

```bash
cd backend
python -m pytest tests/ -v
```

Tests cover:
- Transaction CRUD, validation, and analytics calculations.
- Rule-based categorization confidence and taxonomy fallbacks.
- Audio file validation (empty files, unsupported formats, size limits).
- Groq Whisper transcription and LLaMA entity extraction.
- Incomplete statements (missing amount or date) without hallucination.
- API rate limit (429) and missing API key (503) error handling.
- Immutability check: verifying no database record is created during transcription or extraction.

Run the frontend type-check & production build:

```bash
cd frontend
npm run build
```

---

## 4. Voice-Powered Transaction Guide

### How to Use Voice Entry

1. On the dashboard (`http://localhost:3000`), click the orange **Voice Entry** button in the top navigation bar (or click **+ Add Transaction** and find the Voice Assistant panel).
2. Click **Tap to Speak**.
3. When prompted by your browser, click **Allow** for microphone access.
4. Speak your transaction naturally. Examples:
   - *"I spent 250 rupees on dinner yesterday"*
   - *"Paid 1200 rupees for university semester books today"*
   - *"Received 5000 rupees as freelance payment"*
   - *"Uber cab to station 350 rupees"*
5. Click **Stop (0:03)** when finished speaking.
6. **Review the Extracted Draft:**
   - Groq Whisper transcribes your spoken audio into text.
   - Groq LLM parses the text into structured fields: **Amount**, **Type** (Income/Expense), **Category**, **Date**, and **Description**.
   - Relative dates (like "yesterday", "today") are automatically resolved to exact ISO calendar dates.
7. **Edit or Adjust:** You can freely modify any field or re-record if needed.
8. **Explicit Confirmation:** Click **Confirm & Save Transaction** to save it to your database. The dashboard metrics, charts, and transaction history update immediately.

---

## 5. Troubleshooting & FAQ

### Microphone Permission Denied
- **Chrome / Edge:** Click the lock/settings icon in the address bar (left of `localhost:3000`), locate **Microphone**, and set it to **Allow**. Reload the page.
- **Firefox:** Click the microphone icon next to the address bar and clear the blocked permission.
- **Safari:** Open Safari Preferences > Websites > Microphone, and select **Allow** for `localhost`.

### "GROQ_API_KEY is not configured" (HTTP 503)
- Verify that `GROQ_API_KEY` is present in `backend/.env`.
- Ensure there are no surrounding quotes or trailing spaces around the key.
- Restart the FastAPI server so the updated `.env` is loaded.

### "Rate limit exceeded" (HTTP 429)
- Free-tier Groq API keys have per-minute request limits. If hit, wait 10–20 seconds and click **Speak Again**.

### Empty Audio or No Speech Detected
- Make sure your microphone is not muted and is selected as the default input device in system settings.
- Speak clearly into the microphone for at least 1–2 seconds.

---

## 6. Completed Milestones

| Feature | Milestone | Status | Details |
|---|---|---|---|
| **FastAPI REST API** | M1 | Completed | Full CRUD for transactions, analytics, budgets, categorizer |
| **SQLite Persistence** | M1 | Completed | WAL-mode SQLite database with automated startup seeding |
| **Next.js 16 Dashboard** | M1 | Completed | Minimalist UI with Tailwind CSS, Lucide icons, and Recharts |
| **AI Categorizer (Baseline)** | M1 | Completed | Rule-based keyword engine with confidence scoring |
| **Add Transaction Modal** | M1 | Completed | Form with live auto-categorization and client validation |
| **Budget Overview** | M1 | Completed | Category budget limits and visual progress meters |
| **Financial Health Insights** | M1 | Completed | Algorithmic detection of top spending and savings rate health |
| **Groq Whisper STT API** | M2 | Completed | Server-side audio transcription (`POST /api/voice/transcribe`) |
| **Groq LLM Entity Extraction**| M2 | Completed | Structured NLP extraction (`POST /api/voice/extract`) with relative dates |
| **Voice Entry UI & Audio Recorder** | M2 | Completed | In-browser MediaRecorder with audio waveform and timer |
| **Human-in-the-Loop Review** | M2 | Completed | Draft preview with clarification banners and explicit user confirmation |
| **Comprehensive Test Suite** | M2 | Completed | 23 passing tests (unit, integration, mocking, immutability) |
| **Production Build Verified** | M2 | Completed | Next.js 16 TypeScript compile and production build passing |

---

## 7. Next Steps (Milestone 3 Roadmap)

1. **Trained ML Categorizer:** Train a TF-IDF + Logistic Regression model on a labeled transaction dataset to replace the rule-based baseline.
2. **Supabase PostgreSQL & Auth:** Migrate SQLite schema to Supabase with user authentication and Row Level Security.
3. **Conversational Financial Assistant:** Implement a tool-calling AI agent using Groq LLM to query financial summaries and run what-if simulations.
