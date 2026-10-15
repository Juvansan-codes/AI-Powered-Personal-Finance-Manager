"use client";

import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  BarChart3,
  Bot,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", id: "overview", active: true },
  { icon: ArrowLeftRight, label: "Transactions", id: "transactions", active: true },
  { icon: Wallet, label: "Budgets", id: "budgets", active: true },
  { icon: BarChart3, label: "Analytics", id: "analytics", active: true },
  { icon: Bot, label: "AI Assistant", id: "assistant", coming: true },
  { icon: Settings, label: "Settings", id: "settings", coming: true },
];

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="w-64 bg-white border-r border-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            FinanceFlow
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => !item.coming && onNavigate(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent-light text-accent-dark"
                  : item.coming
                  ? "text-muted-foreground cursor-default opacity-50"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span>{item.label}</span>
              {item.coming && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground">
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
            <span className="text-xs font-semibold text-accent">JH</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              Juvansan H
            </p>
            <p className="text-xs text-muted-foreground">Student</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
