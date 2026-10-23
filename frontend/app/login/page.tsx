"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("financeflow_token") : null;
    if (token) {
      router.push("/");
    }
  }, [router]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await api.login({ email, password });
      if (res.success && res.access_token) {
        localStorage.setItem("financeflow_token", res.access_token);
        localStorage.setItem("financeflow_user", JSON.stringify(res.user));
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Background radial ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Logo */}
        <div className="flex justify-center items-center gap-2.5 mb-6">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-md shadow-accent/20">
            <span className="text-white font-bold text-base">F</span>
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">
            FinanceFlow
          </span>
        </div>

        <h2 className="text-center text-2xl font-bold tracking-tight text-foreground">
          Welcome back
        </h2>
        <p className="mt-1.5 text-center text-xs text-muted-foreground">
          Enter your credentials to access your financial manager
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-neutral-200/50 rounded-2xl border border-border">


          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. abishek.joseph@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Password
                </label>
                <span className="text-[11px] text-accent hover:underline cursor-pointer">
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-accent hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent shadow-xs transition-colors disabled:opacity-50 mt-2"
            >
              <span>{loading ? "Signing in..." : "Sign in to Dashboard"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-semibold text-accent hover:text-accent-dark transition-colors"
              >
                Create an account &rarr;
              </Link>
            </p>
          </div>
        </div>

        {/* Feature Pills Footer */}
        <div className="mt-8 grid grid-cols-3 gap-2 text-center text-[10px] text-muted-foreground">
          <div className="p-2 bg-white/70 border border-border/80 rounded-xl">
            <span className="font-semibold text-foreground block">Groq LPU</span>
            <span>Ultra-fast AI</span>
          </div>
          <div className="p-2 bg-white/70 border border-border/80 rounded-xl">
            <span className="font-semibold text-foreground block">Voice STT</span>
            <span>Whisper Turbo</span>
          </div>
          <div className="p-2 bg-white/70 border border-border/80 rounded-xl">
            <span className="font-semibold text-foreground block">Isolation Forest</span>
            <span>Anomaly Scans</span>
          </div>
        </div>
      </div>
    </div>
  );
}
