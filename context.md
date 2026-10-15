# Project Context — AI-Powered Personal Finance Manager

> **Purpose of this file:** A shared source of truth for AI coding assistants and team members working on this project. Read this file before proposing architecture changes or implementing features.
>
> **Project status:** Planning / early development. The stack below is the current recommended baseline from project planning; update this file when the team explicitly finalizes a decision. Do not claim that planned features are already implemented.

## 1. Project Overview

**Project name:** AI-Powered Personal Finance Manager  
**Course:** Artificial Intelligence — 25CS301  
**Academic year:** 2026–27  
**Semester:** III  
**Year / Batch:** II / B2  
**Institution:** Karunya Institute of Technology and Sciences  
**Project type:** AI micro-project

### Team

- Juvansan H
- Abishek Joseph E
- Karol Benjamin M D
- P Joel Sathiyan

**Course faculty:** Dr. Evangelin Sonia S V

### Problem being addressed

Traditional finance trackers often require users to enter transactions manually and categorize them themselves. This project aims to make personal finance tracking easier through voice-based transaction entry, automated information extraction and categorization, spending analytics, forecasting, personalized budgeting, and a conversational financial assistant.

The system is an educational personal-finance tool. It must not claim to provide professional financial, investment, tax, or legal advice.

## 2. Product Goals

Build a polished, responsive web application that lets a user:

1. Record income and expenses manually or through voice.
2. Convert speech to text and extract transaction details.
3. Review and confirm extracted details before saving.
4. Automatically suggest transaction categories.
5. View income, expenses, balances, and spending analytics.
6. Identify transactions that appear unusual.
7. Estimate future expenditure from historical data.
8. Understand financial indicators through a transparent financial-health score.
9. Set savings goals and monthly budgets.
10. Ask questions about their own financial data using a conversational AI assistant.
11. Generate budget proposals through a tool-using AI Budget Planner.
12. Run “what-if” simulations, such as reducing spending in a category or evaluating the impact of a planned purchase.
13. Optionally hear assistant responses through text-to-speech.

## 3. Recommended Technology Stack

This is the current **recommended baseline**, not a claim that every dependency or service has already been configured.

### Frontend

- **Next.js** with React and TypeScript
- **Tailwind CSS** for styling
- **shadcn/ui** for accessible UI components
- **Lucide React** for icons
- **Recharts** for charts
- React Hook Form + Zod where form validation is useful

Design direction: minimalist, clean, responsive interface; white/black foundation, subtle borders, and orange accents. Avoid generic purple-gradient AI styling. Prioritize readable data visualizations and clear financial summaries.

### Backend

- **Python**
- **FastAPI** for HTTP APIs
- **Pydantic** for request/response validation
- **SQLAlchemy** for database access
- A PostgreSQL driver compatible with the selected SQLAlchemy setup

Keep the backend modular. The frontend must call backend APIs for AI processing and protected financial operations. Do not place API secrets in client-side code.

### Database and authentication

- **Supabase PostgreSQL** for persistent relational storage
- **Supabase Auth** for user authentication
- SQLAlchemy in the FastAPI backend for database operations

Use database constraints and ownership checks. If Supabase Row Level Security is used, configure and test the policies carefully. Never expose the Supabase service-role key or database credentials in the browser.

### Voice and NLP

- Browser **MediaRecorder API** for capturing audio
- **Groq Speech-to-Text / Whisper-compatible API** for transcription, subject to current model availability and API limits
- **spaCy** plus deterministic Python rules for transaction extraction
- Groq LLM may assist with genuinely ambiguous language, but must not be the authority for arithmetic or silently invent missing transaction fields

### Machine learning and analytics

- **scikit-learn**
- **Pandas**
- **NumPy**

Initial candidate methods:
- Transaction categorization: TF-IDF + Logistic Regression
- Anomaly detection: Isolation Forest, evaluated against sensible baselines
- Expense forecasting: historical-average baseline first, then a regression-based model if it improves evaluation
- Financial-health score: transparent, documented Python scoring logic rather than an unnecessary ML model

These are candidate methods. Select final algorithms based on data availability and evaluation, not on the desire to label every feature as AI.

### Conversational and agentic AI

- **Groq API** for language-model responses and tool calling, subject to current model availability
- A small, explicit Python tool-calling agent implemented in the backend initially
- Deterministic backend functions for all financial calculations and constraints

Do not add LangChain or LangGraph unless the project has a concrete need for the extra framework.

### Text-to-speech

- Browser **SpeechSynthesis API** for the initial implementation
- Treat TTS as optional; the app must work when speech synthesis is unavailable.

### Development and deployment

- Git + GitHub
- VS Code or another compatible editor
- Frontend: Vercel is the preferred candidate
- Backend: Render or another Python-compatible host
- Keep local development functional without requiring production deployment.

## 4. High-Level Architecture

```text
User
 |
 v
Next.js Frontend
 |-- Dashboard and charts
 |-- Manual transaction forms
 |-- Voice recording and review
 |-- Budgets and savings goals
 |-- AI assistant chat
 |
 v
FastAPI Backend
 |-- Authentication / authorization checks
 |-- Transaction and budget APIs
 |-- Speech transcription service
 |-- NLP extraction and validation
 |-- Transaction categorization
 |-- Financial analytics
 |-- Anomaly detection and forecasting
 |-- Budget-planning agent and assistant tools
 |
 +--------------------------+
 |                          |
 v                          v
Supabase PostgreSQL      AI / ML services
                         |-- Groq transcription
                         |-- Groq LLM
                         |-- Local Python ML models
```

Keep business logic, data access, and AI integrations separated. The LLM must not receive unrestricted database access or execute arbitrary SQL.

## 5. Voice Transaction Flow

Example user utterance:

> “I spent 250 rupees on lunch today.”

Expected flow:

1. Browser records audio.
2. Frontend sends audio to FastAPI.
3. Backend sends audio to the transcription provider.
4. NLP extraction identifies amount, currency, transaction type, description, and date.
5. Category model suggests a category.
6. Backend returns a structured draft.
7. Frontend shows the draft for user review.
8. User confirms or edits it.
9. Backend validates and saves the transaction.

Illustrative structured draft:

```json
{
  "amount": "250.00",
  "currency": "INR",
  "transaction_type": "expense",
  "category": "Food",
  "description": "Lunch",
  "transaction_date": "2026-10-15",
  "source": "voice"
}
```

This is an example, not a fixed API contract. Use ISO-formatted dates and represent money with decimal-safe types. Do not save a voice-generated transaction without user confirmation in the initial version.

## 6. AI Feature Requirements

### 6.1 Transaction categorization

Candidate model: TF-IDF + Logistic Regression trained on labeled transaction descriptions.

- Define a manageable category taxonomy.
- Keep training and test data separate.
- Report meaningful metrics such as macro F1 and per-category precision/recall.
- Provide a fallback category or ask the user when confidence is low.
- Never invent model accuracy or training results.

### 6.2 Anomaly detection

Candidate: Isolation Forest over transaction features such as amount and category-relative spending.

- An anomaly means “unusual relative to the available data,” not fraud.
- Show a neutral explanation and let the user review the transaction.
- Use a baseline and test with representative examples.
- Avoid presenting a flag as a definitive conclusion.

### 6.3 Expense forecasting

Start with a transparent historical-average baseline. Add regression or other methods only if there is enough suitable historical data and the model improves evaluation.

- Explain the forecast horizon and assumptions.
- Distinguish actual values from estimates.
- Evaluate predictions against held-out data where possible.
- Never present a projection as guaranteed future spending.

### 6.4 Financial-health score

Use a documented, transparent score based on indicators the application can actually calculate, such as savings rate, budget adherence, and progress toward goals.

- Explain what the score means and how it is calculated.
- Do not imply that it is a professional credit score or comprehensive financial assessment.
- Avoid unfairly penalizing users solely because their income is low.

### 6.5 Agentic AI Budget Planner

Implement a bounded, tool-using workflow. The model may interpret goals and explain a proposal; Python functions must calculate amounts and enforce constraints.

Candidate tools:
- `get_transaction_history`
- `calculate_monthly_spending`
- `analyze_recurring_expenses`
- `calculate_savings_rate`
- `generate_budget_proposal`
- `validate_budget_constraints`

Required flow:
1. Retrieve authorized user data.
2. Calculate actual income and spending.
3. Consider essential commitments and the user's savings goals.
4. Generate a proposed allocation.
5. Validate totals and constraints deterministically.
6. Explain the proposal and assumptions.
7. Ask the user to approve before persisting a new budget.

The agent must not independently transfer money, make purchases, or perform other financial actions.

### 6.6 Conversational Financial Assistant

The assistant should answer questions using restricted backend tools and actual database results.

Candidate tools:
- `get_monthly_summary`
- `get_category_spending`
- `get_largest_transactions`
- `get_savings_progress`
- `simulate_purchase`
- `simulate_budget_change`

For numerical answers, retrieve and calculate the data in Python/SQL first; use the LLM to interpret the question and explain the result. Never rely on the LLM to guess totals. Restrict every tool to the authenticated user's data.

## 7. Initial Database Model

Proposed tables:

- `profiles` — user preferences and currency
- `categories` — supported transaction categories
- `transactions` — income and expense records
- `budgets` — monthly/category budget limits
- `financial_goals` — savings targets and progress
- `budget_recommendations` — generated proposals and approval status
- `anomaly_alerts` — flagged transactions and review status
- `user_settings` — user-specific preferences, if not stored in `profiles`

This schema is a starting point and should be reviewed before migrations are applied.

Database rules:
- Store monetary values in PostgreSQL `NUMERIC`, not floating-point columns.
- Use foreign keys and appropriate indexes.
- Associate user-owned records with the authenticated user.
- Validate transaction type, date, amount, and currency.
- Use migrations or a controlled schema-change process.
- Do not put real secrets or personal financial data in Git.
- Do not treat a user ID supplied by the browser as proof of authorization.

## 8. Suggested Backend Structure

```text
backend/
  app/
    main.py
    api/
      transactions.py
      budgets.py
      analytics.py
      assistant.py
      voice.py
    services/
      transaction_service.py
      budget_service.py
      financial_service.py
    ai/
      nlp_extractor.py
      categorizer.py
      anomaly_detector.py
      expense_forecaster.py
      health_scorer.py
      budget_agent.py
      financial_assistant.py
    db/
      database.py
      models.py
    schemas/
      transaction.py
      budget.py
  tests/
  requirements.txt
  .env.example
```

Suggested frontend structure:

```text
frontend/
  app/
  components/
  hooks/
  lib/
  types/
  public/
```

Adjust this structure to the actual repository. Do not overwrite existing work simply to match this example.

## 9. Proposed API Areas

The exact routes and payload schemas should be documented before frontend/backend integration. Candidate API areas:

- Authentication/session integration
- Transactions: create, list, update, delete
- Voice: transcribe and parse transaction draft
- Budgets: create, retrieve, update, approve proposal
- Analytics: monthly summary, category breakdown, trends
- AI assistant: conversational query and tool results
- Forecasting and anomaly review
- Savings goals and progress

All endpoints that access private data must enforce authentication and user-level authorization. Add request validation, sensible error responses, and tests.

## 10. Team Workstreams

Suggested division, subject to team agreement:

- **Juvansan H:** Voice capture, transcription integration, NLP extraction, and transaction-entry integration.
- **Abishek Joseph E:** ML categorization, anomaly detection, forecasting, and financial-health scoring.
- **Karol Benjamin M D:** Frontend dashboard, transaction UI, analytics views, and assistant interface.
- **P Joel Sathiyan:** Database/authentication foundation, API integration, budget-planning agent, and conversational assistant.

Workloads may change. Agree on shared schemas and API contracts before parallel implementation.

## 11. Delivery Plan

1. Foundation: repository, frontend/backend scaffolds, database schema, authentication.
2. Core finance tracker: manual transactions and dashboard connected to real data.
3. Voice flow: recording, transcription, extraction, review, and confirmation.
4. ML and analytics: categorization, anomaly detection, forecasting, health score.
5. AI assistance: budget proposal tools, conversational queries, and what-if analysis.
6. Integration and validation: security tests, ML evaluation, error handling, deployment, documentation, and demonstration.

Build an end-to-end vertical slice early. Do not build all frontend pages as disconnected mockups and postpone integration until the end.

## 12. Engineering Rules for AI Coding Assistants

1. Read this file and inspect the existing repository before editing code.
2. Preserve working code and current project conventions; do not rewrite unrelated modules.
3. Implement small, testable changes and explain which files changed.
4. Do not invent API keys, credentials, database IDs, dataset results, evaluation metrics, or completed features.
5. Keep secrets in environment variables. Commit only `.env.example` with placeholder names, never real values.
6. Validate input on the server, even when the frontend validates it too.
7. Use decimal-safe money handling and explicit date/currency conventions.
8. Keep financial calculations deterministic and testable; do not delegate arithmetic to an LLM.
9. Do not expose secrets or unrestricted database access to the client or an LLM.
10. Scope every data query and AI tool to the authenticated user's records.
11. Require confirmation for voice-created transactions and approval before saving AI-generated budgets.
12. Add tests for financial calculations, validation, authorization, and AI-tool boundaries.
13. Clearly label mock data and placeholders. Never present them as real user data.
14. Avoid adding a new library or agent framework without a concrete reason.
15. Update this file when a technology or architectural decision is explicitly changed.

## 13. Environment Variables

Use an `.env` file locally and configure secrets in the deployment platform. Names below are examples; match them to the actual implementation.

```dotenv
# Database
DATABASE_URL=

# Supabase (only include the values actually used by the chosen auth/data flow)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI provider
GROQ_API_KEY=

# Frontend
NEXT_PUBLIC_API_BASE_URL=
```

Never commit populated secrets. `SUPABASE_SERVICE_ROLE_KEY` must remain server-side only. Do not add an environment variable until the code actually uses it.

## 14. Scope and Open Decisions

The stack and feature design in this file represent the current planning baseline. Before implementation, the team should verify:

- Exact transcription and LLM model names currently available through the selected provider.
- Database connection and authentication strategy between Supabase and FastAPI.
- Initial transaction category taxonomy and training data source.
- Evaluation datasets, train/test split, and metrics for each ML feature.
- Whether TTS is needed for the first demonstrable version.
- Hosting limits, free-tier quotas, and privacy implications.

Prefer a smaller, complete, tested feature set over a large collection of unreliable demos. The first milestone should be a secure finance tracker with real persistence; voice and AI capabilities should then be added incrementally.
