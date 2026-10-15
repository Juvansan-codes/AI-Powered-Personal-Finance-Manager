"""
Transaction Categorizer — Rule-based baseline with structure for ML upgrade.

This module provides a transparent, rule-based categorization system.
It is NOT a trained ML model. It uses keyword matching to suggest categories.
The architecture allows a trained scikit-learn model (TF-IDF + Logistic Regression)
to replace the baseline when labeled training data is available.
"""
from typing import Optional

# Category taxonomy
CATEGORIES = [
    "Food",
    "Transportation",
    "Shopping",
    "Education",
    "Healthcare",
    "Utilities",
    "Entertainment",
    "Rent",
    "Salary",
    "Other Income",
    "Other",
]

EXPENSE_CATEGORIES = [c for c in CATEGORIES if c not in ("Salary", "Other Income")]
INCOME_CATEGORIES = ["Salary", "Other Income"]

# Keyword rules — transparent and explainable
_KEYWORD_MAP: dict[str, list[str]] = {
    "Food": [
        "food", "lunch", "dinner", "breakfast", "snack", "restaurant", "cafe",
        "coffee", "tea", "meal", "pizza", "burger", "biryani", "dosa", "idli",
        "swiggy", "zomato", "grocery", "groceries", "vegetables", "fruits",
        "milk", "bread", "rice", "chicken", "fish", "mutton", "egg",
        "canteen", "mess", "tiffin", "juice", "ice cream", "bakery",
    ],
    "Transportation": [
        "uber", "ola", "cab", "taxi", "auto", "rickshaw", "bus", "train",
        "metro", "fuel", "petrol", "diesel", "parking", "toll", "flight",
        "travel", "commute", "rapido", "bike", "fare",
    ],
    "Shopping": [
        "amazon", "flipkart", "myntra", "shopping", "clothes", "shoes",
        "electronics", "gadget", "phone", "laptop", "headphones", "watch",
        "bag", "accessories", "gift", "purchase", "order", "delivery",
    ],
    "Education": [
        "book", "books", "course", "tuition", "fees", "college", "school",
        "university", "exam", "study", "stationery", "notebook", "pen",
        "library", "udemy", "coursera", "subscription", "class",
    ],
    "Healthcare": [
        "doctor", "hospital", "medicine", "medical", "pharmacy", "health",
        "clinic", "dental", "eye", "checkup", "insurance", "apollo",
        "lab", "test", "scan", "therapy",
    ],
    "Utilities": [
        "electricity", "water", "gas", "internet", "wifi", "broadband",
        "phone bill", "mobile recharge", "recharge", "bill", "maintenance",
        "society", "laundry", "dry clean",
    ],
    "Entertainment": [
        "movie", "movies", "netflix", "spotify", "prime", "hotstar",
        "concert", "game", "gaming", "play", "park", "outing", "trip",
        "vacation", "holiday", "party", "pub", "bar",
    ],
    "Rent": [
        "rent", "housing", "apartment", "flat", "room", "hostel",
        "pg", "accommodation", "lease",
    ],
    "Salary": [
        "salary", "paycheck", "pay", "wages", "stipend", "internship pay",
    ],
    "Other Income": [
        "freelance", "side income", "interest", "dividend", "refund",
        "cashback", "bonus", "reward", "gift received", "pocket money",
        "allowance",
    ],
}


def categorize_transaction(
    description: str,
    transaction_type: str = "expense",
) -> dict:
    """
    Suggest a category for a transaction description.

    Returns a dict with:
        - category: the suggested category string
        - confidence: a rough confidence indicator ("high", "medium", "low")
        - method: "rule_based" (transparent about the approach)
        - is_suggestion: True (user can override)

    This is a rule-based baseline, NOT a trained ML model.
    """
    desc_lower = description.lower().strip()

    # For income transactions, check income categories first
    if transaction_type == "income":
        search_order = INCOME_CATEGORIES + EXPENSE_CATEGORIES
    else:
        search_order = EXPENSE_CATEGORIES + INCOME_CATEGORIES

    best_category: Optional[str] = None
    best_match_count = 0

    for category in search_order:
        keywords = _KEYWORD_MAP.get(category, [])
        match_count = sum(1 for kw in keywords if kw in desc_lower)
        if match_count > best_match_count:
            best_match_count = match_count
            best_category = category

    if best_category and best_match_count >= 2:
        confidence = "high"
    elif best_category and best_match_count == 1:
        confidence = "medium"
    else:
        best_category = "Other Income" if transaction_type == "income" else "Other"
        confidence = "low"

    return {
        "category": best_category,
        "confidence": confidence,
        "method": "rule_based",
        "is_suggestion": True,
    }
