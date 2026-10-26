"""
Conversational Financial Assistant Engine.

Integrates with Groq LLM using bounded, deterministic Python tools to inspect
financial summaries, category spending, recent transactions, budget adherence,
and simulate planned purchases.
"""
import os
import json
import logging
from typing import Any, List, Optional
from datetime import datetime

from app.services.groq_service import get_groq_client, GroqServiceError, GroqConfigError, GroqRateLimitError
from app.db.database import get_connection
from app.db.supabase import (
    is_supabase_ready,
    supabase_get_summary,
    supabase_get_category_spending,
    supabase_list_transactions,
    supabase_get_budgets,
)

logger = logging.getLogger(__name__)

DEFAULT_LLM_MODEL = os.getenv("GROQ_LLM_MODEL", "openai/gpt-oss-20b")

# System prompt defining persona, boundaries, and formatting rules
ASSISTANT_SYSTEM_PROMPT = """You are Oria AI — an intelligent, empathetic, and prudent personal finance assistant.
Your goal is to help the user understand their income, spending patterns, budgets, and evaluate financial decisions.

STRICT ENGINEERING AND BEHAVIORAL RULES:
1. Always base financial figures ONLY on the outputs of the tools provided. NEVER guess, assume, or invent account balances, transaction amounts, or totals.
2. If you need financial data to answer the user's question, call the relevant tool (e.g. get_financial_summary, get_category_spending, get_recent_transactions, get_budget_status, or simulate_purchase).
3. If the user asks about purchasing an item or whether they can afford something, ALWAYS call `simulate_purchase`.
4. Clearly state figures in Indian Rupees (₹) by default, or specify the currency found in data.
5. Provide concise, clear, and actionable insights. Use markdown bullet points and bold numbers for readability.
6. If the user's query is conversational (e.g., "Hello", "Who are you?", "What can you do?"), reply politely and introduce your capabilities without needing to call financial tools.
7. Emphasize that you provide educational guidance, not certified investment, legal, or tax advice.
8. An empty list from a financial-data tool means there are no matching records, not that the data is inaccessible. State that clearly and suggest recording an entry when appropriate.
"""

# Tool schemas adhering to OpenAI / Groq tool specification
TOOLS_SPEC = [
    {
        "type": "function",
        "function": {
            "name": "get_financial_summary",
            "description": "Fetch overall financial summary including total income, total expenses, net balance, and current savings rate.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_category_spending",
            "description": "Fetch category-by-category breakdown of expenses (e.g. Food, Housing, Utilities, Transportation, Shopping).",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_recent_transactions",
            "description": "Retrieve recent transactions with description, amount, category, date, and type (income or expense).",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of transactions to return (1 to 20). Defaults to 6.",
                        "default": 6,
                    },
                    "type_filter": {
                        "type": "string",
                        "enum": ["income", "expense"],
                        "description": "Filter transactions by type: 'income' or 'expense'.",
                    },
                    "category": {
                        "type": "string",
                        "description": "Filter transactions by specific category.",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_budget_status",
            "description": "Fetch monthly category budget limits compared with actual spending, showing percent used and over-budget alerts.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "simulate_purchase",
            "description": "Simulate how a proposed purchase or expense will impact the user's net balance and relevant category budget. Evaluates whether the purchase is safe, requires caution, or exceeds limits.",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_name": {
                        "type": "string",
                        "description": "Name or brief description of the item/expense (e.g., 'New Shoes', 'Smartphone').",
                    },
                    "amount": {
                        "type": "number",
                        "description": "Estimated cost or price of the item.",
                    },
                    "category": {
                        "type": "string",
                        "description": "Expected category (e.g. Shopping, Food, Entertainment, Electronics).",
                    },
                },
                "required": ["item_name", "amount"],
            },
        },
    },
]


# =====================================================================
# Deterministic Tool Implementations
# =====================================================================

def tool_get_financial_summary(user_id: str) -> dict[str, Any]:
    """Retrieve financial summary from Supabase or fallback to SQLite."""
    if is_supabase_ready():
        data = supabase_get_summary(user_id)
        rate = data.get("savings_rate", 0.0)
        data["savings_rate_percent"] = rate
        data["savings_rate"] = rate
        return data

    conn = get_connection()
    row = conn.execute("""
        SELECT
            COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as total_income,
            COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as total_expenses
        FROM transactions
    """).fetchone()
    conn.close()

    total_income = float(row["total_income"] or 0)
    total_expenses = float(row["total_expenses"] or 0)
    balance = total_income - total_expenses
    savings_rate = ((total_income - total_expenses) / total_income * 100) if total_income > 0 else 0

    return {
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "balance": round(balance, 2),
        "savings_rate": round(savings_rate, 1),
        "savings_rate_percent": round(savings_rate, 1),
    }


def tool_get_category_spending(user_id: str) -> list[dict[str, Any]]:
    """Retrieve category expense breakdown."""
    if is_supabase_ready():
        return supabase_get_category_spending(user_id)

    conn = get_connection()
    rows = conn.execute("""
        SELECT category, SUM(amount) as total
        FROM transactions
        WHERE type = 'expense'
        GROUP BY category
        ORDER BY total DESC
    """).fetchall()
    conn.close()
    return [{"category": r["category"], "amount": round(float(r["total"]), 2)} for r in rows]


def tool_get_recent_transactions(
    user_id: str,
    limit: int = 6,
    type_filter: Optional[str] = None,
    category: Optional[str] = None,
) -> list[dict[str, Any]]:
    """Retrieve transactions with optional filtering."""
    clean_limit = max(1, min(limit or 6, 20))

    if is_supabase_ready():
        raw = supabase_list_transactions(
            user_id=user_id, limit=clean_limit,
            type_filter=type_filter,
            category_filter=category,
        )
        return [
            {
                "id": t["id"],
                "description": t["description"],
                "amount": round(float(t["amount"]), 2),
                "type": t["type"],
                "category": t["category"],
                "date": t["date"],
            }
            for t in raw
        ]

    conn = get_connection()
    query = "SELECT id, description, amount, type, category, date FROM transactions WHERE 1=1"
    params: list[Any] = []

    if type_filter:
        query += " AND type = ?"
        params.append(type_filter)
    if category:
        query += " AND LOWER(category) = LOWER(?)"
        params.append(category)

    query += " ORDER BY date DESC, created_at DESC LIMIT ?"
    params.append(clean_limit)

    rows = conn.execute(query, params).fetchall()
    conn.close()

    return [
        {
            "id": r["id"],
            "description": r["description"],
            "amount": round(float(r["amount"]), 2),
            "type": r["type"],
            "category": r["category"],
            "date": r["date"],
        }
        for r in rows
    ]


def tool_get_budget_status(user_id: str) -> list[dict[str, Any]]:
    """Compare category budgets against actual spending."""
    if is_supabase_ready():
        budgets_raw = supabase_get_budgets(user_id)
        spending_raw = supabase_get_category_spending(user_id)
    else:
        conn = get_connection()
        b_rows = conn.execute("SELECT category, budget_limit FROM budgets").fetchall()
        budgets_raw = [{"category": r["category"], "budget_limit": float(r["budget_limit"])} for r in b_rows]
        s_rows = conn.execute("""
            SELECT category, SUM(amount) as total
            FROM transactions WHERE type = 'expense'
            GROUP BY category
        """).fetchall()
        spending_raw = [{"category": r["category"], "amount": float(r["total"])} for r in s_rows]
        conn.close()

    spending_map = {item["category"].lower(): item["amount"] for item in spending_raw}

    results = []
    for b in budgets_raw:
        cat = b["category"]
        limit_val = float(b.get("budget_limit", 0))
        spent_val = float(spending_map.get(cat.lower(), 0))
        remaining = limit_val - spent_val
        percent_used = round((spent_val / limit_val * 100), 1) if limit_val > 0 else 0

        results.append({
            "category": cat,
            "budget_limit": round(limit_val, 2),
            "spent": round(spent_val, 2),
            "remaining": round(remaining, 2),
            "percent_used": percent_used,
            "status": "over_budget" if remaining < 0 else ("near_limit" if percent_used >= 85 else "healthy"),
        })

    return results


def tool_simulate_purchase(
    user_id: str,
    item_name: str,
    amount: float,
    category: Optional[str] = "Shopping",
) -> dict[str, Any]:
    """
    Deterministic purchase simulation.
    Checks remaining net balance, relevant category budget impact, and generates a verdict.
    """
    purchase_amt = abs(float(amount))
    summary = tool_get_financial_summary(user_id)
    current_balance = float(summary.get("balance", 0))
    new_balance = round(current_balance - purchase_amt, 2)

    cat_name = category or "Shopping"
    budget_statuses = tool_get_budget_status(user_id)
    matched_budget = next(
        (b for b in budget_statuses if b["category"].lower() == cat_name.lower()),
        None
    )

    budget_impact = None
    if matched_budget:
        prev_spent = matched_budget["spent"]
        limit_val = matched_budget["budget_limit"]
        new_spent = round(prev_spent + purchase_amt, 2)
        new_remaining = round(limit_val - new_spent, 2)
        budget_impact = {
            "category": matched_budget["category"],
            "budget_limit": limit_val,
            "current_spent": prev_spent,
            "projected_spent": new_spent,
            "projected_remaining": new_remaining,
            "projected_percent_used": round((new_spent / limit_val * 100), 1) if limit_val > 0 else 0,
            "exceeds_budget": new_remaining < 0,
        }

    # Affordability assessment
    if new_balance < 0:
        verdict = "not_recommended"
        verdict_reason = f"This purchase of ₹{purchase_amt:,.2f} would cause your total account balance to go negative (₹{new_balance:,.2f})."
    elif budget_impact and budget_impact["exceeds_budget"]:
        verdict = "caution"
        verdict_reason = f"You have enough total balance, but this purchase exceeds your monthly {matched_budget['category']} budget by ₹{abs(budget_impact['projected_remaining']):,.2f}."
    elif new_balance < (current_balance * 0.15):
        verdict = "caution"
        verdict_reason = f"Purchase is possible, but it will consume more than 85% of your available cash reserves."
    else:
        verdict = "safe"
        verdict_reason = f"Comfortably affordable! Leaves you with ₹{new_balance:,.2f} remaining balance."

    return {
        "item_name": item_name,
        "purchase_amount": round(purchase_amt, 2),
        "category": cat_name,
        "current_balance": round(current_balance, 2),
        "projected_balance": new_balance,
        "budget_impact": budget_impact,
        "verdict": verdict,
        "verdict_reason": verdict_reason,
    }


def execute_tool(tool_name: str, arguments: dict[str, Any], user_id: str) -> Any:
    """Dispatch tool execution to deterministic Python functions."""
    if tool_name == "get_financial_summary":
        return tool_get_financial_summary(user_id)
    elif tool_name == "get_category_spending":
        return tool_get_category_spending(user_id)
    elif tool_name == "get_recent_transactions":
        return tool_get_recent_transactions(
            user_id=user_id, limit=arguments.get("limit", 6),
            type_filter=arguments.get("type_filter"),
            category=arguments.get("category"),
        )
    elif tool_name == "get_budget_status":
        return tool_get_budget_status(user_id)
    elif tool_name == "simulate_purchase":
        return tool_simulate_purchase(
            user_id=user_id, item_name=arguments.get("item_name", "Item"),
            amount=arguments.get("amount", 0.0),
            category=arguments.get("category", "Shopping"),
        )
    else:
        return {"error": f"Tool '{tool_name}' is not recognized."}


# =====================================================================
# Conversational Assistant Orchestrator
# =====================================================================

def run_financial_assistant(
    user_message: str,
    conversation_history: Optional[List[dict]] = None,
    user_id: str = "",
) -> dict[str, Any]:
    """
    Execute tool-calling agent loop with Groq LLM.

    Args:
        user_message: The prompt or question from the user.
        conversation_history: List of previous messages with 'role' and 'content'.

    Returns:
        dict with keys:
            - reply: string text response
            - tools_used: list of tool execution records
            - suggestions: contextual next prompt ideas
    """
    clean_prompt = user_message.strip()
    if not clean_prompt:
        return {
            "reply": "Please ask a financial question, like 'What is my current balance?' or 'How much did I spend on food?'",
            "tools_used": [],
            "suggestions": get_default_suggestions(),
        }

    client = get_groq_client()
    llm_model = os.getenv("GROQ_LLM_MODEL", DEFAULT_LLM_MODEL)

    # Prepare message payload
    api_messages: list[dict[str, Any]] = [{"role": "system", "content": ASSISTANT_SYSTEM_PROMPT}]

    # Append recent conversation history (capped to last 8 turns)
    if conversation_history:
        for msg in conversation_history[-8:]:
            role = msg.get("role")
            content = msg.get("content", "")
            if role in ("user", "assistant") and content:
                api_messages.append({"role": role, "content": content})

    api_messages.append({"role": "user", "content": clean_prompt})

    tools_used_records: list[dict[str, Any]] = []
    # Keep the real deterministic results separate from the public metadata.
    # ToolExecution intentionally exposes only metadata to the browser, while
    # recovery still needs the actual data in order to form a useful answer.
    tool_results: list[dict[str, Any]] = []
    final_reply: str = ""
    max_turns = 5

    try:
        for turn in range(max_turns):
            response = client.chat.completions.create(
                model=llm_model,
                messages=api_messages,
                tools=TOOLS_SPEC,
                tool_choice="auto",
                temperature=0.2,
            )

            response_message = response.choices[0].message
            tool_calls = getattr(response_message, "tool_calls", None)

            if not tool_calls:
                final_reply = response_message.content or "Here is what I found for your request."
                break

            # Append assistant message with requested tool calls
            api_messages.append(response_message)

            for tc in tool_calls:
                t_name = tc.function.name
                try:
                    t_args = json.loads(tc.function.arguments or "{}")
                except json.JSONDecodeError:
                    t_args = {}

                logger.info(f"AI Assistant turn {turn + 1} executing tool: {t_name} with args: {t_args}")
                try:
                    tool_output = execute_tool(t_name, t_args, user_id)
                except Exception as tool_error:
                    logger.exception("Assistant tool %s failed", t_name)
                    tool_output = {
                        "error": "The financial data query could not be completed.",
                        "details": str(tool_error),
                    }

                tools_used_records.append({
                    "tool_name": t_name,
                    "arguments": t_args,
                    "summary": f"Executed {t_name}",
                })
                tool_results.append({"tool_name": t_name, "data": tool_output})

                api_messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "name": t_name,
                    "content": json.dumps(tool_output),
                })

        else:
            # Guarantee a final natural-language answer instead of allowing one
            # more tool call and returning an empty message.
            final_response = client.chat.completions.create(
                model=llm_model,
                messages=api_messages,
                temperature=0.2,
            )
            final_reply = final_response.choices[0].message.content or "Here is what I found for your request based on your financial records."

    except (GroqConfigError, GroqRateLimitError) as e:
        logger.error(f"Groq service error: {e}")
        raise e
    except Exception as e:
        err_msg = str(e).lower()
        if "rate limit" in err_msg or "429" in err_msg:
            raise GroqRateLimitError()
        elif "authentication" in err_msg or "unauthorized" in err_msg or "401" in err_msg:
            raise GroqConfigError()
        elif "tool choice is none" in err_msg or "tool_use_failed" in err_msg:
            logger.warning(f"Groq tool use error: {e}. Executing fallback synthesis.")
            if tools_used_records:
                try:
                    recovery_prompt = [
                        {"role": "system", "content": ASSISTANT_SYSTEM_PROMPT},
                        {
                            "role": "user",
                            "content": f"The user asked: '{clean_prompt}'. Here are the actual results returned by the financial tools: {json.dumps(tool_results)}. Please answer the user's question clearly with actionable advice and markdown formatting without calling any tools. An empty list means there are no matching records; do not describe it as an access failure.",
                        },
                    ]
                    recov_resp = client.chat.completions.create(
                        model=llm_model,
                        messages=recovery_prompt,
                        temperature=0.3,
                    )
                    final_reply = recov_resp.choices[0].message.content or "Here is the summary of your finances."
                except Exception as inner_e:
                    logger.error(f"Recovery failed: {inner_e}")
                    raise GroqServiceError(f"Assistant encountered an error: {str(e)}")
            else:
                raise GroqServiceError(f"Assistant encountered an error: {str(e)}")
        else:
            logger.exception("Unexpected error in financial assistant:")
            raise GroqServiceError(f"Assistant encountered an error: {str(e)}")

    # Generate dynamic prompt suggestions based on tools used
    suggestions = generate_contextual_suggestions(tools_used_records)

    return {
        "reply": final_reply.strip(),
        "tools_used": tools_used_records,
        "suggestions": suggestions,
    }


def get_default_suggestions() -> list[str]:
    """Default quick question suggestions."""
    return [
        "What is my current balance?",
        "How much did I spend this month?",
        "Which category do I spend the most on?",
        "Can I afford to buy a ₹3,500 gadget?",
    ]


def generate_contextual_suggestions(tools_used: list[dict[str, Any]]) -> list[str]:
    """Produce relevant followup questions depending on what tools were invoked."""
    used_names = {t["tool_name"] for t in tools_used}

    if "simulate_purchase" in used_names:
        return [
            "What is my current monthly budget status?",
            "Show my top spending categories",
            "What were my largest expenses recently?",
        ]
    elif "get_financial_summary" in used_names:
        return [
            "Show my spending breakdown by category",
            "Am I currently on track with my budgets?",
            "What are my latest transactions?",
        ]
    elif "get_category_spending" in used_names:
        return [
            "How do my expenses compare to my category budgets?",
            "Can I afford to spend ₹2,000 this weekend?",
            "What were my recent food expenses?",
        ]
    elif "get_budget_status" in used_names:
        return [
            "What is my total savings rate?",
            "Show my recent transactions",
            "Can I afford a ₹5,000 purchase?",
        ]
    return get_default_suggestions()
