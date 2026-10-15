"use client";

import {
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ShieldCheck,
} from "lucide-react";
import type { Insight } from "@/types";

const SEVERITY_STYLES = {
  success: {
    bg: "bg-success-light",
    border: "border-success/20",
    icon: ShieldCheck,
    iconColor: "text-success",
  },
  warning: {
    bg: "bg-warning-light",
    border: "border-warning/20",
    icon: AlertTriangle,
    iconColor: "text-warning",
  },
  danger: {
    bg: "bg-danger-light",
    border: "border-danger/20",
    icon: AlertTriangle,
    iconColor: "text-danger",
  },
  info: {
    bg: "bg-info-light",
    border: "border-info/20",
    icon: Lightbulb,
    iconColor: "text-info",
  },
};

interface InsightsPanelProps {
  insights: Insight[];
  loading: boolean;
}

export default function InsightsPanel({ insights, loading }: InsightsPanelProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">AI Insights</h3>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">
            Financial Insights
          </h3>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Calculated from your transaction data
        </p>
      </div>
      <div className="p-5 space-y-3">
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Add more transactions to generate insights.
          </p>
        ) : (
          insights.map((insight, i) => {
            const style = SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.info;
            const Icon = style.icon;
            return (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg border ${style.bg} ${style.border}`}
              >
                <Icon className={`w-4 h-4 mt-0.5 ${style.iconColor} shrink-0`} />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {insight.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {insight.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
