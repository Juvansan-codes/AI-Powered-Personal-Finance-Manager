# FinanceFlow — AI-Powered Personal Finance Manager

> **Course:** Artificial Intelligence — 25CS301  
> **Academic Year:** 2026–27 | **Semester:** III | **Batch:** II / B2  
> **Institution:** Karunya Institute of Technology and Sciences  
> **Course Faculty:** Dr. Evangelin Sonia S V  
> **Team Members:** Juvansan H, Abishek Joseph E, Karol Benjamin M D, P Joel Sathiyan  
> **Milestone:** Milestone 1 — Core Finance Tracker, AI Categorizer & Live Dashboard  

---

## 1. Project Overview

FinanceFlow is an educational personal finance management platform designed to simplify tracking income and expenses through intelligent automation. 

Traditional finance trackers require tedious manual entry and manual category selection. FinanceFlow solves this by integrating:
- **Instant AI Categorization:** Context-aware keyword matching and ML-ready classification for transaction descriptions.
- **Dynamic Analytics Dashboard:** Live calculation of net balance, savings rate, categorical spending breakdown, and month-over-month trend comparison.
- **Budget Tracking & Visual Progress:** Category-specific budget limits with real-time percentage indicators.
- **Automated Financial Insights:** Rule-based heuristics alerting users about high-spending categories, savings health, and unusual amounts.
- **Voice-Ready & LLM Architecture:** Designed according to clean architectural boundaries to plug in Groq Speech-to-Text and a tool-calling AI assistant without compromising arithmetic integrity.

---

## 2. System Architecture

```text
                        ┌─────────────────────────────────────┐
                        │      Next.js 16 (App Router)        │
                        │    React 19 + TypeScript + Tailwind │
                        │   Recharts + Lucide + Glassmorphism │
                        └──────────────────┬──────────────────┘
                                           │ HTTP / JSON
                                           ▼
                        ┌─────────────────────────────────────┐
                        │       FastAPI Backend (Python)      │
                        │     Pydantic Validation + CORS      │
                        │   Deterministic Business Logic      │
                        └──────────┬────────────────┬─────────┘
                                   │                │
            ┌──────────────────────┴───────┐        └───────────────────────┐
            ▼                              ▼                                ▼
┌──────────────────────┐       ┌──────────────────────┐       ┌────────────────────────┐
│  SQLite Local DB     │       │   AI Categorizer     │       │   Future AI Modules    │
│  (Persisted WAL mode)│       │   Rule-based Base    │       │   - Groq Whisper Voice │
│  -> Supabase Postgres│       │   -> TF-IDF + LogReg │       │   - LLM Budget Agent   │
└──────────────────────┘       └──────────────────────┘       │   - Isolation Forest   │
                                                              └────────────────────────┘
```

### Architectural Principles:
1. **Deterministic Calculations:** All balances, totals, and percentages are computed in Python/SQL. Arithmetic is never delegated to generative LLMs.
2. **Layered Separation:** Frontend components consume typed API services (`@/lib/api.ts`). Backend isolates database models (`app/db/`), routers (`app/api/`), and AI processing (`app/ai/`).
3. **Graceful Fallbacks:** AI categorization provides confidence ratings (`high`, `medium`, `low`) and transparently falls back without blocking user workflows.
4. **Local-to-Cloud Migration Path:** Local prototype uses SQLite via WAL mode; schema aligns directly with planned Supabase PostgreSQL tables.

---

## 3. Quick Start & Setup Instructions

### Prerequisites
- **Node.js** v18+ (tested on Node v24)
- **Python** 3.10+ (tested on Python 3.11)

---

### Step 1: Start the Backend (FastAPI)

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

### Step 2: Start the Frontend (Next.js)

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the Next.js development server (runs on port 3000)
npm run dev
```

- **Web App:** `http://localhost:3000`

---

### Step 3: Running Automated Tests

Run the backend test suite:

```bash
cd backend
python -m pytest tests/test_api.py -v
```

Run the frontend type-check & production build:

```bash
cd frontend
npm run build
```

---

## 4. Live Demo Walkthrough (1-Hour Demo Guide)

Follow these steps for the evaluation demo:

1. **Open the Dashboard:**
   Navigate to `http://localhost:3000`. Point out the key metrics:
   - **Total Balance, Total Income, Total Expenses, Savings Rate** cards.
   - **Income vs Expenses Bar Chart** showing multi-month comparison.
   - **Spending by Category Donut Chart** displaying proportional allocation.
   - **Financial Insights** automatically generated from data.
   - **Budget Progress Bars** indicating utilization per category.

2. **Demonstrate AI Categorization:**
   - Click the orange **+ Add Transaction** button.
   - Type `Dinner at Barbeque Nation` in the Description field.
   - Observe the instant AI Categorizer suggestion tag appearing: `AI Suggestion: Food (high confidence)` and automatically selecting the **Food** category.
   - Change description to `Uber cab to railway station` → observe auto-suggestion to **Transportation**.
   - Change description to `Amazon order - mechanical keyboard` → observe auto-suggestion to **Shopping**.

3. **Demonstrate Data Persistence & Reactivity:**
   - Add an expense: Description: `Hostel Canteen Snacks`, Amount: `150`, Category: `Food`, Date: today.
   - Click **Add Transaction**.
   - Notice the dashboard immediately updates:
     - Total Balance and Total Expenses adjust.
     - Recent Transactions table displays the new entry with red negative badge.
     - Food budget utilization updates.
   - Refresh the browser (F5): The transaction remains persisted in SQLite (`backend/data/financeflow.db`).

4. **Demonstrate Transaction Deletion:**
   - Click the delete icon (trash can) on any transaction row.
   - Notice the table and summary metrics recalculate smoothly.

5. **Review API & Architecture:**
   - Open `http://localhost:8000/docs` to show Swagger interactive documentation.
   - Show unit tests passing (`pytest tests/test_api.py`).

---

## 5. Completed Milestone 1 Features

| Feature | Status | Details |
|---|---|---|
| **FastAPI REST API** | Completed | Full CRUD for transactions, analytics, budgets, categorizer |
| **SQLite Persistence** | Completed | WAL-mode SQLite database with automated startup seeding |
| **Next.js 16 Dashboard** | Completed | Polished UI with Tailwind CSS, Lucide icons, and Recharts |
| **AI Categorizer (Baseline)** | Completed | Rule-based keyword engine with confidence scoring |
| **Add Transaction Modal** | Completed | Reactive form with live auto-categorization and validation |
| **Budget Overview** | Completed | Category budget limits and visual progress meters |
| **Financial Health Insights** | Completed | Algorithmic detection of top spending and savings rate health |
| **Automated Test Suite** | Completed | 8 pytest tests covering API CRUD, validation, and AI categorizer |
| **Production Build Verified** | Completed | Next.js TypeScript type-checking and static export passing |

---

## 6. Next Steps (Milestone 2 Roadmap)

1. **Voice Input Flow (Speech-to-Text):** Connect the browser MediaRecorder API to the Groq Whisper API for voice capture (e.g., *"I spent 250 rupees on lunch"*).
2. **NLP Transaction Extraction:** Python regex/spaCy parser to extract amounts, dates, and entities from voice transcripts.
3. **Trained ML Categorizer:** Train a TF-IDF + Logistic Regression model on a labeled transaction dataset to replace the rule-based baseline.
4. **Supabase PostgreSQL & Auth:** Migrate SQLite schema to Supabase with user authentication and Row Level Security.
5. **AI Assistant & What-If Simulations:** Groq LLM tool-calling agent to answer natural language queries using authenticated database tools.
