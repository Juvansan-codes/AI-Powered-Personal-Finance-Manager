import { API_BASE } from "./utils";
import type {
  Transaction,
  TransactionCreate,
  FinancialSummary,
  CategorySpending,
  MonthlyTrend,
  Insight,
  Budget,
  CategorizeResult,
} from "@/types";

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API error ${res.status}: ${error}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Transactions
  getTransactions: () => fetchJSON<Transaction[]>("/api/transactions/"),
  createTransaction: (data: TransactionCreate) =>
    fetchJSON<Transaction>("/api/transactions/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteTransaction: (id: string) =>
    fetchJSON<void>(`/api/transactions/${id}`, { method: "DELETE" }),

  // Analytics
  getSummary: () => fetchJSON<FinancialSummary>("/api/analytics/summary"),
  getCategorySpending: () =>
    fetchJSON<CategorySpending[]>("/api/analytics/category-spending"),
  getMonthlyTrend: () => fetchJSON<MonthlyTrend[]>("/api/analytics/monthly-trend"),
  getInsights: () => fetchJSON<Insight[]>("/api/analytics/insights"),

  // Budgets
  getBudgets: () => fetchJSON<Budget[]>("/api/budgets/"),

  // AI Categorizer
  categorize: (description: string, type: string) =>
    fetchJSON<CategorizeResult>("/api/categorize/", {
      method: "POST",
      body: JSON.stringify({ description, transaction_type: type }),
    }),
};
