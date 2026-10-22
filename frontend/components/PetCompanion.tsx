"use client";

import { useState, useEffect } from "react";
import { Sparkles, X, Heart, MessageCircle } from "lucide-react";

interface PetCompanionProps {
  visible: boolean;
  onClose: () => void;
  savingsRate?: number;
  balance?: number;
}

const PET_TIPS = [
  "🎉 Looking sharp! Your net balance is healthy.",
  "💡 Tip: Reviewing category budgets weekly prevents end-of-month surprises!",
  "✨ Groq LLM Assistant is ready in the sidebar for what-if simulations.",
  "🐾 Fun fact: Automating a 20% savings rule can build 6 months of runway in 2 years!",
  "🎙️ Did you know? You can speak transactions like 'Dinner 350' using Voice Entry!",
];

export default function PetCompanion({
  visible,
  onClose,
  savingsRate = 75,
  balance = 0,
}: PetCompanionProps) {
  const [tipIndex, setTipIndex] = useState(0);
  const [happy, setHappy] = useState(false);
  const [mood, setMood] = useState("Happy");

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % PET_TIPS.length);
    }, 12000);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  const handlePetClick = () => {
    setHappy(true);
    setTipIndex((prev) => (prev + 1) % PET_TIPS.length);
    setTimeout(() => setHappy(false), 1200);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-end gap-3 select-none animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Speech / Tip Bubble */}
      <div className="bg-white/95 backdrop-blur-md border border-amber-200 shadow-xl rounded-2xl p-3.5 max-w-xs text-xs text-neutral-800 relative">
        <div className="flex items-center justify-between gap-2 mb-1.5 border-b border-amber-100 pb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-amber-700 tracking-tight text-[11px]">
              Penny • Finance Pet
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 p-0.5 rounded transition-colors"
            title="Hide Pet (Alt+Win+P)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[12px] leading-relaxed text-neutral-700 font-medium">
          {PET_TIPS[tipIndex]}
        </p>
        <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-400 font-mono pt-1">
          <span>Savings Rate: {savingsRate}%</span>
          <span className="text-amber-600 font-semibold cursor-pointer hover:underline" onClick={handlePetClick}>
            Pet me! ✨
          </span>
        </div>
        {/* Triangle arrow pointer */}
        <div className="absolute -right-2 bottom-4 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-white" />
      </div>

      {/* Pet Avatar Character */}
      <div
        onClick={handlePetClick}
        className={`relative group cursor-pointer transition-transform ${
          happy ? "scale-110 -translate-y-2" : "hover:scale-105"
        }`}
        title="Click to interact with Penny!"
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-200 shadow-lg border-2 border-white flex items-center justify-center text-2xl relative overflow-hidden">
          {/* Animated glow */}
          <div className="absolute inset-0 bg-radial from-white/40 to-transparent pointer-events-none" />
          <span className="select-none animate-bounce" style={{ animationDuration: happy ? "0.4s" : "2.5s" }}>
            {happy ? "😻" : "🐱"}
          </span>
        </div>
        {happy && (
          <div className="absolute -top-3 -right-1 text-red-500 animate-ping">
            <Heart className="w-4 h-4 fill-current" />
          </div>
        )}
      </div>
    </div>
  );
}
