"use client";

import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ArrowRight,
  Bot,
  Zap,
  Sparkles,
  Wallet,
  Clock,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import SummaryCards from "@/components/SummaryCards";
import BudgetOverview from "@/components/BudgetOverview";
import InsightsPanel from "@/components/InsightsPanel";
import { formatINR } from "@/lib/utils";
import type {
  Transaction,
  FinancialSummary,
  Budget,
  Insight,
  AnomalyItem,
} from "@/types";

interface DashboardOverviewProps {
  summary: FinancialSummary | null;
  transactions: Transaction[];
  budgets: Budget[];
  insights: Insight[];
  anomalies: AnomalyItem[];
  loading: boolean;
  userName: string;
  onNavigate: (page: string) => void;
  onOpenVoiceEntry?: () => void;
  onOpenAddTransaction?: () => void;
}

export default function DashboardOverview({
  summary,
  transactions,
  budgets,
  insights,
  anomalies,
  loading,
  userName,
  onNavigate,
  onOpenVoiceEntry,
  onOpenAddTransaction,
}: DashboardOverviewProps) {
  const recentTransactions = transactions.slice(0, 6);
  const totalAnomalies = anomalies.filter((a) => a.is_anomaly).length;

  // Calculate quick metrics
  const savingsRate = summary?.savings_rate || 0;
  const balance = summary?.balance || 0;
  const totalExpenses = summary?.total_expenses || 1;
  const monthlyRunway = totalExpenses > 0 ? (balance / (totalExpenses / 30) / 30).toFixed(1) : "N/A";

  // Financial Health Score calculation (0 - 100)
  let healthScore = 50;
  if (savingsRate > 0) healthScore += Math.min(savingsRate * 0.4, 30);
  const overBudgetCount = budgets.filter((b) => b.spent > b.budget_limit).length;
  healthScore -= overBudgetCount * 10;
  if (totalAnomalies === 0) healthScore += 10;
  healthScore = Math.max(10, Math.min(98, Math.round(healthScore)));

  return (
    <div className="space-y-6">
      {/* Financial Health & Runway Executive Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 text-white rounded-2xl p-6 shadow-sm relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-accent/20 text-accent font-semibold text-xs tracking-wide">
                Executive Financial Dashboard
              </span>
              <span className="text-xs text-neutral-400">Live Status Overview</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Good day, {userName}
            </h2>
            <p className="text-xs text-neutral-300 mt-1 max-w-xl leading-relaxed">
              Your financial health score is currently{" "}
              <strong className="text-emerald-400 font-semibold">{healthScore}/100 ({healthScore >= 75 ? "Strong" : healthScore >= 50 ? "Stable" : "Needs Review"})</strong>.
              Estimated operational runway stands at{" "}
              <strong className="text-white font-semibold">{monthlyRunway} months</strong> based on current average burn rate.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate("assistant")}
              className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Bot className="w-4 h-4" />
              <span>Ask AI Assistant</span>
            </button>
            <button
              onClick={() => onNavigate("analytics")}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium transition-colors border border-white/10"
            >
              <span>Deep Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-white/10">
          <div>
            <span className="text-[11px] text-neutral-400 block">Health Rating</span>
            <span className="text-lg font-bold text-emerald-400">{healthScore} / 100</span>
          </div>
          <div>
            <span className="text-[11px] text-neutral-400 block">Estimated Runway</span>
            <span className="text-lg font-bold text-white">{monthlyRunway} mos</span>
          </div>
          <div>
            <span className="text-[11px] text-neutral-400 block">Category Budgets</span>
            <span className="text-lg font-bold text-white">
              {budgets.length - overBudgetCount}/{budgets.length} On Track
            </span>
          </div>
          <div>
            <span className="text-[11px] text-neutral-400 block">Anomaly Scans</span>
            <span className={totalAnomalies > 0 ? "text-lg font-bold text-amber-400" : "text-lg font-bold text-emerald-400"}>
              {totalAnomalies > 0 ? `${totalAnomalies} Flagged` : "All Clear"}
            </span>
          </div>
        </div>
      </div>

      {/* Top Core Metrics */}
      <SummaryCards summary={summary} loading={loading} />

      {/* Anomaly Notification if active */}
      {totalAnomalies > 0 && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900">
                {totalAnomalies} Unusual Outlier Transaction{totalAnomalies > 1 ? "s" : ""} Flagged
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Isolation Forest detected transactions that diverge significantly from your regular spending habits.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate("analytics")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-medium transition-colors"
          >
            <span>Review Outliers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Split Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Activity Feed & Cashflow Pulse */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Cashflow Pulse Bar */}
          <div className="bg-white rounded-2xl border border-border p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-semibold text-foreground">Cashflow Pulse</h3>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                Net Margin: {summary?.savings_rate || 0}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                <span className="text-[11px] text-emerald-800 font-medium block">Total Inflow</span>
                <span className="text-lg font-bold font-mono text-emerald-700">
                  {formatINR(summary?.total_income || 0)}
                </span>
              </div>
              <div className="p-3 bg-red-50/70 border border-red-100 rounded-xl">
                <span className="text-[11px] text-red-800 font-medium block">Total Outflow</span>
                <span className="text-lg font-bold font-mono text-red-700">
                  {formatINR(summary?.total_expenses || 0)}
                </span>
              </div>
            </div>

            {/* Inflow vs Outflow ratio bar */}
            <div className="w-full bg-neutral-100 rounded-full h-3 flex overflow-hidden">
              <div
                className="bg-emerald-500 h-3 transition-all"
                style={{
                  width: `${
                    (summary?.total_income || 0) + (summary?.total_expenses || 0) > 0
                      ? ((summary?.total_income || 0) /
                          ((summary?.total_income || 0) + (summary?.total_expenses || 0))) *
                        100
                      : 50
                  }%`,
                }}
                title="Income Share"
              />
              <div
                className="bg-red-500 h-3 transition-all"
                style={{
                  width: `${
                    (summary?.total_income || 0) + (summary?.total_expenses || 0) > 0
                      ? ((summary?.total_expenses || 0) /
                          ((summary?.total_income || 0) + (summary?.total_expenses || 0))) *
                        100
                      : 50
                  }%`,
                }}
                title="Expense Share"
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5 font-medium">
              <span className="text-emerald-700">Inflow</span>
              <span className="text-red-700">Outflow</span>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-white rounded-2xl border border-border p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
                <p className="text-xs text-muted-foreground">Latest transactions posted to account</p>
              </div>
              <button
                onClick={() => onNavigate("transactions")}
                className="flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-dark transition-colors"
              >
                <span>View All ({transactions.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-neutral-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : recentTransactions.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-xs">
                No transactions recorded yet. Click &quot;Add Transaction&quot; to get started.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {recentTransactions.map((t) => {
                  const isExp = t.type === "expense";
                  return (
                    <div
                      key={t.id}
                      className="py-3 flex items-center justify-between hover:bg-neutral-50/60 px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-semibold ${
                            isExp ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                          }`}
                        >
                          {isExp ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{t.description}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{t.date}</span>
                            <span className="text-[10px] px-2 py-0.2 bg-neutral-100 text-neutral-600 rounded-full font-medium">
                              {t.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-sm font-bold font-mono ${
                          isExp ? "text-foreground" : "text-emerald-600"
                        }`}
                      >
                        {isExp ? "-" : "+"}
                        {formatINR(t.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Budgets Tracker & AI Smart Insights */}
        <div className="space-y-6">
          <BudgetOverview budgets={budgets} loading={loading} />
          <InsightsPanel insights={insights} loading={loading} />
        </div>
      </div>
    </div>
  );
}
