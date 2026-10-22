"use client";

import { useState } from "react";
import {
  BarChart3,
  PieChart as PieIcon,
  ShieldAlert,
  Flame,
  TrendingDown,
  Layers,
  ArrowUpRight,
  Info,
} from "lucide-react";
import SpendingCharts from "@/components/SpendingCharts";
import { formatINR } from "@/lib/utils";
import type {
  CategorySpending,
  MonthlyTrend,
  FinancialSummary,
  Transaction,
  AnomalyItem,
} from "@/types";

interface AnalyticsViewProps {
  categorySpending: CategorySpending[];
  monthlyTrend: MonthlyTrend[];
  summary: FinancialSummary | null;
  transactions: Transaction[];
  anomalies: AnomalyItem[];
  loading: boolean;
}

export default function AnalyticsView({
  categorySpending,
  monthlyTrend,
  summary,
  transactions,
  anomalies,
  loading,
}: AnalyticsViewProps) {
  const [filterPeriod, setFilterPeriod] = useState("all");

  const totalExpense = summary?.total_expenses || 1;
  const flaggedAnomalies = anomalies.filter((a) => a.is_anomaly);

  // Compute category concentration metrics
  const categoryStats = categorySpending.map((c) => {
    const txnsInCat = transactions.filter(
      (t) => t.type === "expense" && t.category.toLowerCase() === c.category.toLowerCase()
    );
    const count = txnsInCat.length;
    const avg = count > 0 ? c.amount / count : c.amount;
    const share = (c.amount / totalExpense) * 100;
    return {
      category: c.category,
      amount: c.amount,
      share: Math.round(share * 10) / 10,
      count,
      avg: Math.round(avg),
    };
  });

  // Calculate daily burn rate
  const expenseTxns = transactions.filter((t) => t.type === "expense");
  const dailyBurnRate =
    expenseTxns.length > 0 ? summary?.total_expenses ? Math.round(summary.total_expenses / 30) : 0 : 0;

  return (
    <div className="space-y-6">
      {/* Analytics Header */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-accent" />
            <h2 className="text-xl font-bold text-foreground">
              Financial Intelligence & Deep Analytics
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Multi-period trend analysis, category concentration breakdown, and Isolation Forest anomaly tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {["All Time", "Last 6 Months", "This Quarter"].map((p, i) => (
            <button
              key={i}
              onClick={() => setFilterPeriod(p.toLowerCase().replace(/ /g, "-"))}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                (i === 0 && filterPeriod === "all") || filterPeriod === p.toLowerCase().replace(/ /g, "-")
                  ? "bg-foreground text-background font-semibold"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Burn Rate & Velocity KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-border p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Daily Burn Rate</span>
            <Flame className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">
            {formatINR(dailyBurnRate)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Average outflow per day (30d base)
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-border p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Top Category Concentration</span>
            <PieIcon className="w-4 h-4 text-accent" />
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">
            {categoryStats[0]?.share || 0}%
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block truncate">
            {categoryStats[0]?.category || "None"} claims largest spend share
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-border p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Outlier Contamination</span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">
            {flaggedAnomalies.length} Flagged
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            {transactions.length > 0
              ? `${Math.round((flaggedAnomalies.length / transactions.length) * 100)}% of total transaction pool`
              : "0%"}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-border p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Net Savings Velocity</span>
            <BarChart3 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-600">
            {summary?.savings_rate || 0}%
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Surplus saved after all debits
          </span>
        </div>
      </div>

      {/* Core Comparative Charts */}
      <SpendingCharts
        categorySpending={categorySpending}
        monthlyTrend={monthlyTrend}
        loading={loading}
      />

      {/* Category Concentration & Deep-Dive Table */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Expense Category Concentration Matrix
            </h3>
            <p className="text-xs text-muted-foreground">
              Granular breakdown of spending volume, volume share, and average transaction tickets.
            </p>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {categoryStats.length} Active Categories
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider text-left">
                <th className="pb-3 font-semibold">Category</th>
                <th className="pb-3 font-semibold text-right">Total Outflow</th>
                <th className="pb-3 font-semibold text-right">Expense Share</th>
                <th className="pb-3 font-semibold text-right">Txn Count</th>
                <th className="pb-3 font-semibold text-right">Avg Ticket</th>
                <th className="pb-3 font-semibold text-center">Share Bar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {categoryStats.map((c, i) => (
                <tr key={i} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3 font-semibold text-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent" />
                    <span>{c.category}</span>
                  </td>
                  <td className="py-3 text-right font-mono font-bold text-foreground">
                    {formatINR(c.amount)}
                  </td>
                  <td className="py-3 text-right font-mono text-muted-foreground">
                    {c.share}%
                  </td>
                  <td className="py-3 text-right font-mono text-muted-foreground">
                    {c.count} txns
                  </td>
                  <td className="py-3 text-right font-mono font-medium text-foreground">
                    {formatINR(c.avg)}
                  </td>
                  <td className="py-3 w-36 px-4">
                    <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-accent h-2 rounded-full"
                        style={{ width: `${Math.min(c.share, 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Isolation Forest Outlier Hub */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              Isolation Forest Anomaly & Outlier Registry
            </h3>
            <p className="text-xs text-muted-foreground">
              Unsupervised tree-based anomaly detector trained on historical category distributions.
            </p>
          </div>
          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-mono text-xs font-semibold rounded-lg">
            Contamination: 5%
          </span>
        </div>

        {flaggedAnomalies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs bg-neutral-50 rounded-xl border border-neutral-100">
            ✓ No anomalous transactions detected in current transaction set.
          </div>
        ) : (
          <div className="space-y-3">
            {flaggedAnomalies.map((anom) => (
              <div
                key={anom.transaction_id}
                className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">
                      {anom.description}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.2 uppercase rounded ${
                        anom.severity === "high"
                          ? "bg-red-600 text-white"
                          : "bg-amber-500 text-white"
                      }`}
                    >
                      {anom.severity} Risk
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {anom.category} • {anom.date}
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 mt-1">
                    {anom.explanation}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-base font-bold font-mono text-red-600 block">
                    {formatINR(anom.amount)}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Score: {anom.anomaly_score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
