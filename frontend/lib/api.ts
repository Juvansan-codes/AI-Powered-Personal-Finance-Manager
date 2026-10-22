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
  TranscriptionResponse,
  VoiceExtractResponse,
  AnomalyReport,
  AnomalyCheckResponse,
  AssistantChatResponse,
  AssistantSuggestionItem,
  ModelQuotaResponse,
  TestConnectionResponse,
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
  getAnomalies: () => fetchJSON<AnomalyReport>("/api/analytics/anomalies"),
  checkAnomaly: (amount: number, category: string, description?: string) =>
    fetchJSON<AnomalyCheckResponse>("/api/analytics/anomalies/check", {
      method: "POST",
      body: JSON.stringify({ amount, category, type: "expense", description }),
    }),

  // Budgets
  getBudgets: () => fetchJSON<Budget[]>("/api/budgets/"),

  // AI Categorizer
  categorize: (description: string, type: string) =>
    fetchJSON<CategorizeResult>("/api/categorize/", {
      method: "POST",
      body: JSON.stringify({ description, transaction_type: type }),
    }),

  // Voice-Powered Transactions
  transcribeAudio: async (audioBlob: Blob): Promise<TranscriptionResponse> => {
    const formData = new FormData();
    const ext = audioBlob.type.includes("wav") ? "wav" : "webm";
    formData.append("file", audioBlob, `recording.${ext}`);

    const res = await fetch(`${API_BASE}/api/voice/transcribe`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      let errorMsg = `Error ${res.status}`;
      try {
        const errJson = await res.json();
        errorMsg = errJson.detail || errorMsg;
      } catch {
        errorMsg = await res.text() || errorMsg;
      }
      throw new Error(errorMsg);
    }
    return res.json();
  },

  extractVoice: (text: string, currentDate?: string) =>
    fetchJSON<VoiceExtractResponse>("/api/voice/extract", {
      method: "POST",
      body: JSON.stringify({ text, current_date: currentDate }),
    }),

  // AI Conversational Assistant
  askAssistant: (
    message: string,
    history?: { role: string; content: string }[]
  ) =>
    fetchJSON<AssistantChatResponse>("/api/assistant/chat", {
      method: "POST",
      body: JSON.stringify({ message, history }),
    }),

  getAssistantSuggestions: () =>
    fetchJSON<AssistantSuggestionItem[]>("/api/assistant/suggestions"),

  // Settings & Model Quota
  getQuota: () => fetchJSON<ModelQuotaResponse>("/api/settings/quota"),
  testGroqConnection: () =>
    fetchJSON<TestConnectionResponse>("/api/settings/test-connection", {
      method: "POST",
    }),
  reseedData: () =>
    fetchJSON<{ status: string; message: string }>("/api/settings/reseed-data", {
      method: "POST",
    }),
};
