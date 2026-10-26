import { API_BASE } from "./utils";
import { supabase } from "./supabase";
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

export class AuthSessionError extends Error {
  constructor(message = "Invalid or expired session") {
    super(message);
    this.name = "AuthSessionError";
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

// Single-flight promise so concurrent requests share one refresh token call
let refreshPromise: Promise<string | null> | null = null;

export async function getValidAccessToken(forceRefresh = false): Promise<string | null> {
  if (!supabase) return null;

  // If a refresh is already underway, wait for it
  if (refreshPromise) {
    return refreshPromise;
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    // If we have a valid token that doesn't expire within the next 45s and not forcing, return it
    if (!forceRefresh && session.expires_at && session.expires_at > now + 45) {
      return session.access_token;
    }

    // Token is expired, expiring soon, or forceRefresh requested: perform single-flight refresh
    refreshPromise = (async () => {
      try {
        const { data, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !data.session) {
          // Refresh token expired or revoked. Clear local state cleanly.
          await supabase.auth.signOut().catch(() => {});
          return null;
        }
        return data.session.access_token;
      } catch {
        await supabase.auth.signOut().catch(() => {});
        return null;
      } finally {
        refreshPromise = null;
      }
    })();

    return await refreshPromise;
  } catch {
    return null;
  }
}

async function getAuthHeaders(includeContentType = true, forceRefresh = false): Promise<Record<string, string>> {
  const token = await getValidAccessToken(forceRefresh);
  const headers: Record<string, string> = {};
  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function fetchJSON<T>(url: string, options?: RequestInit, isRetry = false): Promise<T> {
  const authHeaders = await getAuthHeaders(true, false);
  const fullUrl = `${API_BASE}${url}`;
  
  let res: Response;
  try {
    res = await fetch(fullUrl, {
      ...options,
      headers: {
        ...authHeaders,
        ...options?.headers,
      },
    });
  } catch (error) {
    // Log diagnostic information
    console.error('[API Network Error]', {
      url: fullUrl,
      apiBase: API_BASE,
      isRetry,
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Throw structured network error
    throw new NetworkError(
      `Unable to connect to server. Please ensure the backend is running at ${API_BASE} and check your network connection.`,
      fullUrl,
      error
    );
  }

  // Handle 401 Unauthorized
  if (res.status === 401) {
    // Attempt single-flight session refresh once if this isn't already a retry
    if (!isRetry && supabase) {
      const freshToken = await getValidAccessToken(true);
      if (freshToken) {
        return fetchJSON<T>(url, options, true);
      }
    }

    // Refresh failed or retry still 401: clean up session
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    const errText = await res.text().catch(() => "");
    throw new AuthSessionError(errText || "Invalid or expired session");
  }

  if (!res.ok) {
    const error = await res.text().catch(() => "Unknown error");
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
    const mimeType = audioBlob.type.toLowerCase();
    const ext = mimeType.includes("wav")
      ? "wav"
      : mimeType.includes("mp4") || mimeType.includes("m4a")
        ? "mp4"
        : mimeType.includes("mpeg") || mimeType.includes("mp3")
          ? "mp3"
          : mimeType.includes("ogg")
            ? "ogg"
            : mimeType.includes("flac")
              ? "flac"
              : "webm";
    formData.append("file", audioBlob, `recording.${ext}`);

    let headers = await getAuthHeaders(false, false);
    const transcribeUrl = `${API_BASE}/api/voice/transcribe`;
    
    let res: Response;
    try {
      res = await fetch(transcribeUrl, {
        method: "POST",
        body: formData,
        headers,
      });
    } catch (error) {
      console.error('[API Network Error]', {
        url: transcribeUrl,
        apiBase: API_BASE,
        operation: 'transcribe',
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw new NetworkError(
        `Unable to connect to server. Please ensure the backend is running at ${API_BASE} and check your network connection.`,
        transcribeUrl,
        error
      );
    }

    if (res.status === 401 && supabase) {
      const freshToken = await getValidAccessToken(true);
      if (freshToken) {
        headers = await getAuthHeaders(false, false);
        try {
          res = await fetch(transcribeUrl, {
            method: "POST",
            body: formData,
            headers,
          });
        } catch (error) {
          console.error('[API Network Error]', {
            url: transcribeUrl,
            apiBase: API_BASE,
            operation: 'transcribe-retry',
            error: error instanceof Error ? error.message : String(error),
          });
          
          throw new NetworkError(
            `Unable to connect to server. Please ensure the backend is running at ${API_BASE} and check your network connection.`,
            transcribeUrl,
            error
          );
        }
      } else {
        await supabase.auth.signOut().catch(() => {});
        throw new AuthSessionError("Invalid or expired session");
      }
    }

    if (!res.ok) {
      let errorMsg = `Error ${res.status}`;
      try {
        const errJson = await res.json();
        errorMsg = errJson.detail || errorMsg;
      } catch {
        errorMsg = (await res.text().catch(() => "")) || errorMsg;
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
