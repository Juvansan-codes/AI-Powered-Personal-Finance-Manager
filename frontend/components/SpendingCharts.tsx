"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { formatINR, formatMonth } from "@/lib/utils";
import type { CategorySpending, MonthlyTrend } from "@/types";

const COLORS = [
  "#f97316", "#0ea5e9", "#8b5cf6", "#22c55e", "#ef4444",
  "#eab308", "#ec4899", "#14b8a6", "#6366f1", "#f43f5e",
];

interface SpendingChartsProps {
  categorySpending: CategorySpending[];
  monthlyTrend: MonthlyTrend[];
  loading: boolean;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  return (
    <div className="bg-white border border-border rounded-lg px-3 py-2 shadow-md">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {formatINR(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function SpendingCharts({
  categorySpending,
  monthlyTrend,
  loading,
}: SpendingChartsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-border p-5 h-80 animate-pulse" />
        <div className="bg-white rounded-xl border border-border p-5 h-80 animate-pulse" />
      </div>
    );
  }

  const monthlyData = monthlyTrend.map((m) => ({
    ...m,
    name: formatMonth(m.month),
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Income vs Expenses Bar Chart */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Income vs Expenses
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthlyData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "#737373" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#737373" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category Spending Pie Chart */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Spending by Category
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={categorySpending}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={95}
              paddingAngle={2}
              dataKey="amount"
              nameKey="category"
            >
              {categorySpending.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  stroke="none"
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any) => formatINR(Number(value) || 0)}
              contentStyle={{
                background: "white",
                border: "1px solid #e5e5e5",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "12px" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
