"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { TransactionCreate } from "@/types";

const EXPENSE_CATEGORIES = [
  "Food",
  "Transportation",
  "Shopping",
  "Education",
  "Healthcare",
  "Utilities",
  "Entertainment",
  "Rent",
  "Other",
];

const INCOME_CATEGORIES = ["Salary", "Other Income"];

interface AddTransactionDialogProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export default function AddTransactionDialog({
  open,
  onClose,
  onAdded,
}: AddTransactionDialogProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<{
    category: string;
    confidence: string;
  } | null>(null);

  useEffect(() => {
    if (open && !date) {
      setDate(new Date().toISOString().split("T")[0]);
    }
  }, [open, date]);

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // Auto-suggest category when description changes
  useEffect(() => {
    if (description.length < 3) {
      setSuggestion(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSuggesting(true);
        const result = await api.categorize(description, type);
        setSuggestion({
          category: result.category,
          confidence: result.confidence,
        });
        // Auto-fill if confidence is high and no category selected
        if (result.confidence !== "low" && !category) {
          setCategory(result.category);
        }
      } catch {
        // Silently fail — AI suggestion is optional
      } finally {
        setSuggesting(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [description, type]);

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setType("expense");
    setCategory("");
    setDate(new Date().toISOString().split("T")[0]);
    setError("");
    setSuccess(false);
    setSuggestion(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validate
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be a positive number.");
      return;
    }
    if (!category) {
      setError("Please select a category.");
      return;
    }
    if (!date) {
      setError("Date is required.");
      return;
    }

    try {
      setSaving(true);
      const data: TransactionCreate = {
        description: description.trim(),
        amount: amountNum,
        type,
        category,
        date,
      };
      await api.createTransaction(data);
      setSuccess(true);
      setTimeout(() => {
        resetForm();
        onAdded();
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err.message || "Failed to add transaction.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Add Transaction
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setType("expense");
                  setCategory("");
                  setSuggestion(null);
                }}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors border ${
                  type === "expense"
                    ? "bg-danger text-white border-danger"
                    : "bg-white text-muted-foreground border-border hover:border-foreground/20"
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => {
                  setType("income");
                  setCategory("");
                  setSuggestion(null);
                }}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors border ${
                  type === "income"
                    ? "bg-success text-white border-success"
                    : "bg-white text-muted-foreground border-border hover:border-foreground/20"
                }`}
              >
                Income
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Lunch at college canteen"
              className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
            />
            {/* AI Suggestion */}
            {suggesting && (
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Suggesting category…</span>
              </div>
            )}
            {suggestion && !suggesting && (
              <button
                type="button"
                onClick={() => setCategory(suggestion.category)}
                className="flex items-center gap-1.5 mt-1.5 text-xs text-accent hover:text-accent-dark transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                <span>
                  AI suggests: <strong>{suggestion.category}</strong>{" "}
                  <span className="text-muted-foreground">
                    ({suggestion.confidence} confidence, rule-based)
                  </span>
                </span>
              </button>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Amount (₹)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="0.01"
              step="0.01"
              className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors bg-white"
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="px-3.5 py-2.5 bg-danger-light border border-danger/20 rounded-lg text-sm text-danger">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="px-3.5 py-2.5 bg-success-light border border-success/20 rounded-lg text-sm text-success">
              Transaction added successfully!
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || success}
            className="w-full py-2.5 px-4 bg-accent hover:bg-accent-dark text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : success ? (
              "Added ✓"
            ) : (
              "Add Transaction"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
