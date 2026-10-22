"use client";

import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  BarChart3,
  Bot,
  Settings,
  Gauge,
  Sparkles,
  ExternalLink,
  LifeBuoy,
  LogOut,
  ChevronRight,
  Egg,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", id: "overview", active: true },
  { icon: ArrowLeftRight, label: "Transactions", id: "transactions", active: true },
  { icon: Wallet, label: "Budgets", id: "budgets", active: true },
  { icon: BarChart3, label: "Analytics", id: "analytics", active: true },
  { icon: Bot, label: "AI Assistant", id: "assistant", active: true },
  { icon: Settings, label: "Settings", id: "settings", active: true },
];

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  showPet?: boolean;
  onTogglePet?: () => void;
}

export default function Sidebar({
  currentPage,
  onNavigate,
  showPet = false,
  onTogglePet,
}: SidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  // Global keyboard shortcuts (Ctrl+, for Settings, Alt+Win+P for Pet)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        onNavigate("settings");
        setMenuOpen(false);
      }
      if (e.altKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        onTogglePet?.();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNavigate, onTogglePet]);

  return (
    <aside className="w-64 bg-white border-r border-border flex flex-col h-screen sticky top-0 select-none">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shadow-sm shadow-accent/20">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          <div>
            <span className="text-lg font-semibold tracking-tight text-foreground block leading-tight">
              FinanceFlow
            </span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              AI Manager
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                isActive
                  ? "bg-accent-light text-accent-dark font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon
                className={cn(
                  "w-[18px] h-[18px] transition-transform group-hover:scale-105",
                  isActive ? "text-accent" : "text-muted-foreground"
                )}
              />
              <span>{item.label}</span>
              {item.id === "settings" && (
                <span className="ml-auto text-[10px] px-1.5 py-0.2 font-mono text-muted-foreground/80 opacity-60 group-hover:opacity-100">
                  Ctrl+,
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Profile & Floating Menu Reference */}
      <div className="relative px-3 py-3 border-t border-border" ref={menuRef}>
        {/* Dark Popover Menu (Matching User Reference Image) */}
        {menuOpen && (
          <div className="absolute bottom-[calc(100%+8px)] left-2 right-2 z-50 bg-[#1c1c1f] text-neutral-200 border border-neutral-800 rounded-xl shadow-2xl p-1.5 text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
            {/* Header / User Info */}
            <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-neutral-800/60 transition-colors cursor-pointer"
                 onClick={() => {
                   onNavigate("settings");
                   setMenuOpen(false);
                 }}>
              <div className="w-8 h-8 rounded-full bg-[#10b981] flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-sm">
                EJ
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-neutral-100 truncate text-[13px] leading-tight">
                  E. Abishek Joseph
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block px-1.5 py-0.2 bg-[#10b981]/20 text-[#34d399] font-medium rounded text-[10px]">
                    Go
                  </span>
                  <span className="text-[11px] text-neutral-400">Owner</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-neutral-800 my-1.5 mx-1" />

            {/* Menu Options */}
            <div className="space-y-0.5">
              {/* Usage Remaining */}
              <button
                onClick={() => {
                  onNavigate("settings");
                  setMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-neutral-800 text-neutral-200 hover:text-white transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Gauge className="w-4 h-4 text-neutral-400" />
                  <span className="font-medium text-[12px]">Usage remaining</span>
                </div>
                <div className="flex items-center gap-1 text-neutral-400 text-[11px]">
                  <span className="text-[#10b981] font-mono">88.4%</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>

              {/* Show Pet */}
              <button
                onClick={() => {
                  onTogglePet?.();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-neutral-800 text-neutral-200 hover:text-white transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Egg className="w-4 h-4 text-amber-400" />
                  <span className="font-medium text-[12px]">
                    {showPet ? "Hide Pet" : "Show Pet"}
                  </span>
                </div>
                <span className="text-[10px] text-neutral-400 font-mono bg-neutral-800/80 px-1.5 py-0.5 rounded border border-neutral-700/60">
                  Alt+Win+P
                </span>
              </button>

              {/* Upgrade for higher limits */}
              <button
                onClick={() => {
                  onNavigate("settings");
                  setMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-neutral-800 text-neutral-200 hover:text-white transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="font-medium text-[12px]">Upgrade for higher limits</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
              </button>

              {/* Settings */}
              <button
                onClick={() => {
                  onNavigate("settings");
                  setMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-neutral-800 text-neutral-200 hover:text-white transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-neutral-400" />
                  <span className="font-medium text-[12px]">Settings</span>
                </div>
                <span className="text-[10px] text-neutral-400 font-mono bg-neutral-800/80 px-1.5 py-0.5 rounded border border-neutral-700/60">
                  Ctrl+,
                </span>
              </button>

              {/* Help */}
              <button
                onClick={() => {
                  alert("FinanceFlow AI Help:\n\n• Press Ctrl+, for Settings & Model Quotas\n• Press Alt+Win+P to toggle your Financial Pet Companion\n• Click Voice Entry to speak transactions naturally in Indian Rupees\n• Ask FinanceFlow AI in AI Assistant for simulations and savings plans");
                  setMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-neutral-800 text-neutral-200 hover:text-white transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <LifeBuoy className="w-4 h-4 text-neutral-400" />
                  <span className="font-medium text-[12px]">Help</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
              </button>

              <div className="h-px bg-neutral-800 my-1 mx-1" />

              {/* Log out */}
              <button
                onClick={() => {
                  alert("Session active as E. Abishek Joseph (Go Tier). Settings and preferences saved locally.");
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-red-500/10 text-neutral-300 hover:text-red-400 transition-colors text-left"
              >
                <LogOut className="w-4 h-4 text-red-400" />
                <span className="font-medium text-[12px]">Log out</span>
              </button>
            </div>
          </div>
        )}

        {/* Profile Button Pill */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={cn(
            "w-full flex items-center gap-3 p-2 rounded-xl transition-all border text-left",
            menuOpen
              ? "bg-neutral-100 border-neutral-300 shadow-sm"
              : "border-transparent hover:bg-neutral-50 hover:border-neutral-200"
          )}
        >
          <div className="w-8 h-8 rounded-full bg-[#10b981] flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs">
            EJ
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground truncate">
                E. Abishek Joseph
              </p>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-[#10b981]/15 text-[#059669] rounded">
                Go
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              Groq Go Tier • Remaining: 88%
            </p>
          </div>
        </button>
      </div>
    </aside>
  );
}
