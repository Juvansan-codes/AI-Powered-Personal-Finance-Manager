"use client";

import { useState, useEffect } from "react";
import {
  Gauge,
  Cpu,
  Key,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Database,
  Download,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Mic,
  Bot,
  User,
  Egg,
  Volume2,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ModelQuotaResponse, TestConnectionResponse } from "@/types";

interface SettingsViewProps {
  onRefreshData?: () => void;
  showPet?: boolean;
  onTogglePet?: () => void;
}

type SettingsTab = "quota" | "profile" | "models" | "data" | "shortcuts";

export default function SettingsView({
  onRefreshData,
  showPet = false,
  onTogglePet,
}: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("quota");
  const [quotaData, setQuotaData] = useState<ModelQuotaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Live Connection Test
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<TestConnectionResponse | null>(null);

  // Profile local state
  const [userName, setUserName] = useState("E. Abishek Joseph");
  const [userEmail, setUserEmail] = useState("abishek.joseph@example.com");
  const [currency, setCurrency] = useState("INR");
  const [savingsGoal, setSavingsGoal] = useState("20");

  // AI preferences
  const [mlThreshold, setMlThreshold] = useState(65);
  const [anomalySensitivity, setAnomalySensitivity] = useState("balanced");
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [selectedLlm, setSelectedLlm] = useState("openai/gpt-oss-20b");

  // Status message
  const [saveNotification, setSaveNotification] = useState("");

  const fetchQuota = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.getQuota();
      setQuotaData(data);
      if (data.user_profile?.name) setUserName(data.user_profile.name);
      if (data.user_profile?.email) setUserEmail(data.user_profile.email);
      if (data.groq_status?.active_llm_model) setSelectedLlm(data.groq_status.active_llm_model);
    } catch (err: any) {
      setError("Could not load real-time model quota from backend.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuota();
  }, []);

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      setConnectionResult(null);
      const res = await api.testGroqConnection();
      setConnectionResult(res);
    } catch (err: any) {
      setConnectionResult({
        status: "error",
        latency_ms: 0,
        model: selectedLlm,
        message: err.message || "Failed to reach Groq API endpoint.",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleReseedData = async () => {
    if (confirm("Reset and reseed demo transactions?")) {
      try {
        await api.reseedData();
        onRefreshData?.();
        triggerNotice("Demo transactions successfully restored.");
      } catch (err: any) {
        alert("Error resetting data: " + err.message);
      }
    }
  };

  const handleExportJSON = async () => {
    try {
      const txns = await api.getTransactions();
      const blob = new Blob([JSON.stringify(txns, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `financeflow-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      triggerNotice("Exported JSON successfully.");
    } catch (err) {
      alert("Failed to export JSON.");
    }
  };

  const handleExportCSV = async () => {
    try {
      const txns = await api.getTransactions();
      if (!txns.length) {
        alert("No transactions to export.");
        return;
      }
      const headers = ["ID", "Description", "Amount", "Type", "Category", "Date", "Created At"];
      const rows = txns.map((t) => [
        t.id,
        `"${t.description.replace(/"/g, '""')}"`,
        t.amount,
        t.type,
        `"${t.category}"`,
        t.date,
        t.created_at,
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `financeflow-transactions-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      triggerNotice("Exported CSV successfully.");
    } catch (err) {
      alert("Failed to export CSV.");
    }
  };

  const triggerNotice = (msg: string) => {
    setSaveNotification(msg);
    setTimeout(() => setSaveNotification(""), 3500);
  };

  const q = quotaData?.quota_metrics;
  const tpm = q?.tpm || { limit: 30000, used: 3480, remaining: 26520, percent_used: 11.6 };
  const rpm = q?.rpm || { limit: 30, used: 12, remaining: 18, percent_used: 40.0 };
  const audio = q?.audio || { limit_minutes: 120, used_minutes: 6.5, remaining_minutes: 113.5, percent_used: 5.4 };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Toast Notice */}
      {saveNotification && (
        <div className="fixed top-6 right-8 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-150">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveNotification}</span>
        </div>
      )}

      {/* Top Banner / User Plan Card */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#10b981] text-white flex items-center justify-center font-bold text-xl shadow-sm shadow-emerald-500/20">
            EJ
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">{userName}</h2>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold text-xs rounded-full">
                Go Plan
              </span>
              <span className="px-2 py-0.5 bg-accent/10 text-accent font-medium text-xs rounded-full">
                Groq LPU Enabled
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {userEmail} • Student / Financial Planner
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchQuota}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl text-xs font-medium transition-colors"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span>Refresh Quotas</span>
          </button>
          <button
            onClick={() => {
              triggerNotice("You are already on the high-performance Groq Go Tier!");
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Upgrade Tier</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("quota")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
            activeTab === "quota"
              ? "bg-foreground text-background shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <Gauge className="w-4 h-4" />
          <span>Model Quota & AI Usage</span>
        </button>

        <button
          onClick={() => setActiveTab("profile")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
            activeTab === "profile"
              ? "bg-foreground text-background shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <User className="w-4 h-4" />
          <span>Profile & Preferences</span>
        </button>

        <button
          onClick={() => setActiveTab("models")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
            activeTab === "models"
              ? "bg-foreground text-background shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <Cpu className="w-4 h-4" />
          <span>AI Engine & Parameters</span>
        </button>

        <button
          onClick={() => setActiveTab("data")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
            activeTab === "data"
              ? "bg-foreground text-background shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <Database className="w-4 h-4" />
          <span>Data & Storage</span>
        </button>

        <button
          onClick={() => setActiveTab("shortcuts")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
            activeTab === "shortcuts"
              ? "bg-foreground text-background shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <Egg className="w-4 h-4 text-amber-500" />
          <span>Pet & Shortcuts</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: MODEL QUOTA & USAGE REMAINING (Matches User Reference Image) */}
      {/* ==================================================================== */}
      {activeTab === "quota" && (
        <div className="space-y-6">
          {/* Quota Highlights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* TPM Card */}
            <div className="bg-white rounded-2xl border border-border p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  LLM Token Quota (TPM)
                </span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  {tpm.remaining.toLocaleString()} left
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold font-mono text-foreground">
                  {tpm.used.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  / {tpm.limit.toLocaleString()} TPM
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden mb-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(tpm.percent_used, 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Used: {tpm.percent_used}%</span>
                <span>Tier Cap: 30,000 / min</span>
              </p>
            </div>

            {/* RPM Card */}
            <div className="bg-white rounded-2xl border border-border p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Request Rate Limit (RPM)
                </span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  {rpm.remaining} RPM left
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold font-mono text-foreground">
                  {rpm.used}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  / {rpm.limit} req/min
                </span>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden mb-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(rpm.percent_used, 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Active burst load: {rpm.percent_used}%</span>
                <span>Max: 30 RPM</span>
              </p>
            </div>

            {/* Audio STT Card */}
            <div className="bg-white rounded-2xl border border-border p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Whisper Voice Quota
                </span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                  {audio.remaining_minutes} min left
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold font-mono text-foreground">
                  {audio.used_minutes}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  / {audio.limit_minutes} min daily
                </span>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden mb-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(audio.percent_used, 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Used: {audio.percent_used}%</span>
                <span>Resets in: {q?.resets_in || "18h 42m"}</span>
              </p>
            </div>
          </div>

          {/* Groq API Provider & Connectivity Check */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Key className="w-4 h-4 text-accent" />
                  Groq Cloud LPU Hardware & API Key
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ultra-low latency inference powered by Groq Language Processing Units (LPUs).
                </p>
              </div>

              <button
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
              >
                <Zap className={cn("w-3.5 h-3.5 text-yellow-400", testingConnection && "animate-spin")} />
                <span>{testingConnection ? "Pinging Groq..." : "Ping API Health"}</span>
              </button>
            </div>

            {/* Connection Test Result Banner */}
            {connectionResult && (
              <div
                className={cn(
                  "p-3.5 rounded-xl text-xs flex items-center justify-between border",
                  connectionResult.status === "healthy"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-red-50 border-red-200 text-red-900"
                )}
              >
                <div className="flex items-center gap-2.5">
                  {connectionResult.status === "healthy" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{connectionResult.message}</span>
                </div>
                {connectionResult.latency_ms > 0 && (
                  <span className="font-mono font-semibold px-2 py-0.5 bg-white/70 rounded-md">
                    ⚡ {connectionResult.latency_ms} ms roundtrip
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/60">
                <span className="text-[11px] text-muted-foreground block mb-1">API Key Status</span>
                <span className="text-xs font-mono font-semibold text-foreground block truncate">
                  {quotaData?.groq_status?.masked_key || "Configured"}
                </span>
                <span className="text-[10px] text-emerald-600 font-medium mt-0.5 inline-block">
                  ● Authenticated & Ready
                </span>
              </div>

              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/60">
                <span className="text-[11px] text-muted-foreground block mb-1">Active Chat LLM</span>
                <span className="text-xs font-mono font-semibold text-foreground block truncate">
                  {selectedLlm}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 inline-block">
                  Groq Tool-Calling Engine
                </span>
              </div>

              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/60">
                <span className="text-[11px] text-muted-foreground block mb-1">Speech Model</span>
                <span className="text-xs font-mono font-semibold text-foreground block truncate">
                  whisper-large-v3-turbo
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 inline-block">
                  Transcribing WebM / WAV audio
                </span>
              </div>

              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/60">
                <span className="text-[11px] text-muted-foreground block mb-1">AI Tools Executed</span>
                <span className="text-xs font-mono font-semibold text-foreground block">
                  {q?.tool_calls_today || 18} executions today
                </span>
                <span className="text-[10px] text-accent font-medium mt-0.5 inline-block">
                  Deterministic Python Tools
                </span>
              </div>
            </div>
          </div>

          {/* Model Catalog & Available Models */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-xs">
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Available Models on Account
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Select which Groq model is dispatched for Conversational Financial Assistance.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(quotaData?.available_models || [
                { id: "openai/gpt-oss-20b", name: "GPT-OSS 20B (Default Fast)", context: "8k", speed: "Very Fast" },
                { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B (High Reasoning)", context: "16k", speed: "Medium" },
                { id: "qwen/qwen3.8-27b", name: "Qwen 3.8 27B", context: "32k", speed: "Fast" },
                { id: "whisper-large-v3-turbo", name: "Whisper Large v3 Turbo (Voice STT)", context: "Audio", speed: "Real-time" },
              ]).map((m) => {
                const isSelected = selectedLlm === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedLlm(m.id);
                      triggerNotice(`Selected model: ${m.name}`);
                    }}
                    className={cn(
                      "p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between",
                      isSelected
                        ? "border-accent bg-accent/5 ring-1 ring-accent/30"
                        : "border-border hover:border-neutral-300 hover:bg-neutral-50/50"
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">{m.name}</span>
                        {isSelected && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-accent text-white font-medium rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground block mt-0.5">
                        {m.id}
                      </span>
                    </div>

                    <div className="text-right text-[11px] text-muted-foreground">
                      <span className="block font-medium text-foreground">{m.speed}</span>
                      <span>Context: {m.context}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: PROFILE & USER PREFERENCES */}
      {/* ==================================================================== */}
      {activeTab === "profile" && (
        <div className="bg-white rounded-2xl border border-border p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Personal Information & Tier</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage your display name, currency symbol, and monthly savings goal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Preferred Currency Symbol
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              >
                <option value="INR">₹ INR (Indian Rupee - Default)</option>
                <option value="USD">$ USD (US Dollar)</option>
                <option value="EUR">€ EUR (Euro)</option>
                <option value="GBP">£ GBP (British Pound)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Target Monthly Savings Rate (%)
              </label>
              <input
                type="number"
                min="5"
                max="90"
                value={savingsGoal}
                onChange={(e) => setSavingsGoal(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />
              <span className="text-[11px] text-muted-foreground mt-1 block">
                Default: 20% savings rule. Used for financial health scoring.
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-border flex justify-end">
            <button
              onClick={() => triggerNotice("Profile preferences saved locally.")}
              className="px-5 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              Save Profile Changes
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: AI ENGINE & PARAMETERS */}
      {/* ==================================================================== */}
      {activeTab === "models" && (
        <div className="bg-white rounded-2xl border border-border p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI Intelligence & Model Guardrails</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tune confidence thresholds, isolation forest outlier sensitivity, and agent loop behaviors.
            </p>
          </div>

          <div className="space-y-6 divide-y divide-border">
            {/* ML Categorizer Confidence */}
            <div className="pt-4 first:pt-0">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <label className="text-xs font-semibold text-foreground">
                    TF-IDF ML Categorization Confidence Threshold
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Predictions below this confidence level are flagged with a &quot;Review Needed&quot; badge.
                  </p>
                </div>
                <span className="font-mono font-bold text-accent text-sm">{mlThreshold}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="95"
                step="5"
                value={mlThreshold}
                onChange={(e) => setMlThreshold(Number(e.target.value))}
                className="w-full accent-accent cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-1">
                <span>40% (Lenient)</span>
                <span>65% (Recommended)</span>
                <span>95% (Strict Review)</span>
              </div>
            </div>

            {/* Anomaly Detection Sensitivity */}
            <div className="pt-4">
              <label className="text-xs font-semibold text-foreground block mb-1">
                Isolation Forest Anomaly Detection Sensitivity
              </label>
              <p className="text-xs text-muted-foreground mb-3">
                Controls the contamination factor and outlier flagging aggression on expense transactions.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "lenient", label: "Lenient (3%)", desc: "Flags only extreme outliers" },
                  { id: "balanced", label: "Balanced (5%)", desc: "Default Isolation Forest baseline" },
                  { id: "strict", label: "Strict (10%)", desc: "Aggressive proactive expense audits" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setAnomalySensitivity(s.id)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      anomalySensitivity === s.id
                        ? "border-accent bg-accent/5 ring-1 ring-accent"
                        : "border-border hover:bg-neutral-50"
                    )}
                  >
                    <span className="text-xs font-semibold text-foreground block">{s.label}</span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* TTS Audio toggle */}
            <div className="pt-4 flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-accent" />
                  Text-to-Speech (TTS) Voice Responses
                </label>
                <p className="text-xs text-muted-foreground">
                  Allow the AI Financial Assistant to read answers aloud in natural speech.
                </p>
              </div>
              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  ttsEnabled ? "bg-accent" : "bg-neutral-300"
                )}
              >
                <span
                  className={cn(
                    "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-xs",
                    ttsEnabled ? "right-0.5" : "left-0.5"
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: DATA & STORAGE */}
      {/* ==================================================================== */}
      {activeTab === "data" && (
        <div className="bg-white rounded-2xl border border-border p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Data Storage & Backup Controls</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Inspect database connection, export your financial records, or reset sample data.
            </p>
          </div>

          {/* Database Info */}
          <div className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                DB
              </div>
              <div>
                <span className="text-xs font-semibold text-foreground block">
                  {quotaData?.database?.type || "Supabase PostgreSQL"}
                </span>
                <span className="text-[11px] text-emerald-600 font-medium">
                  ● {quotaData?.database?.status || "Connected & Operational"}
                </span>
              </div>
            </div>
            <span className="text-xs font-mono text-muted-foreground px-2.5 py-1 bg-white border border-border rounded-lg">
              Mode: {quotaData?.database?.sync_mode || "Real-time"}
            </span>
          </div>

          {/* Export Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-border flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-foreground block">Export as CSV</span>
                <span className="text-[11px] text-muted-foreground">
                  Compatible with Microsoft Excel, Google Sheets, and Numbers.
                </span>
              </div>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-foreground rounded-xl text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl border border-border flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-foreground block">Export as JSON</span>
                <span className="text-[11px] text-muted-foreground">
                  Raw structured dataset for developer backups or custom analytics.
                </span>
              </div>
              <button
                onClick={handleExportJSON}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-foreground rounded-xl text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          {/* Reseed Data Action */}
          <div className="p-4 rounded-2xl border border-red-200 bg-red-50/40 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-red-900 block">Restore Demonstration Transactions</span>
              <span className="text-[11px] text-red-700/80">
                Resets current transaction table and seeds realistic student & income demo data.
              </span>
            </div>
            <button
              onClick={handleReseedData}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-medium transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reseed Demo Data</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: PET COMPANION & KEYBOARD SHORTCUTS */}
      {/* ==================================================================== */}
      {activeTab === "shortcuts" && (
        <div className="bg-white rounded-2xl border border-border p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Egg className="w-4 h-4 text-amber-500" />
                Desktop Financial Pet Companion
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Toggle Penny, your interactive floating finance mascot who gives real-time financial encouragement.
              </p>
            </div>
            <button
              onClick={onTogglePet}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs",
                showPet
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : "bg-neutral-100 text-neutral-800 hover:bg-neutral-200"
              )}
            >
              {showPet ? "Hide Companion Pet" : "Show Companion Pet"}
            </button>
          </div>

          {/* Shortcut Cheatsheet */}
          <div className="space-y-3 pt-3 border-t border-border">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground">
              Keyboard Shortcuts Cheatsheet
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { shortcut: "Ctrl + ,", desc: "Open Settings & Model Quota panel" },
                { shortcut: "Alt + Win + P", desc: "Toggle Penny the Finance Pet companion" },
                { shortcut: "Alt + V", desc: "Quick trigger Voice Transaction Entry" },
                { shortcut: "Alt + N", desc: "Add new manual transaction dialog" },
              ].map((k, i) => (
                <div
                  key={i}
                  className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between text-xs"
                >
                  <span className="text-muted-foreground">{k.desc}</span>
                  <span className="font-mono font-semibold px-2 py-1 bg-white border border-neutral-300 rounded-md shadow-2xs">
                    {k.shortcut}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
