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
  Sparkles,
  Send,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"magic_link" | "password">("magic_link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Magic link confirmation state
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(45);
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState("");

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("financeflow_token") : null;
    if (token) {
      router.push("/");
    }
  }, [router]);

  // Resend countdown timer
  useEffect(() => {
    if (magicLinkSent && resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
  }, [magicLinkSent, resendTimer]);

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResendSuccess("");
      await api.sendMagicLink({ email });
      setMagicLinkSent(true);
      setResendTimer(45);
      setCanResend(false);
    } catch (err: any) {
      setError(err.message || "Could not send magic link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendMagicLink = async () => {
    if (!canResend || !email) return;
    try {
      setResending(true);
      setError("");
      setResendSuccess("");
      await api.resendMagicLink(email);
      setResendTimer(45);
      setCanResend(false);
      setResendSuccess(`A fresh magic link has been sent to ${email}.`);
    } catch (err: any) {
      setError(err.message || "Failed to resend magic link. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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

        {!magicLinkSent && (
          <>
            <h2 className="text-center text-2xl font-bold tracking-tight text-foreground">
              Welcome back
            </h2>
            <p className="mt-1.5 text-center text-xs text-muted-foreground">
              Sign in with a passwordless magic link or your password
            </p>
          </>
        )}
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-neutral-200/50 rounded-2xl border border-border">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {magicLinkSent ? (
            /* Magic Link Sent Confirmation */
            <div className="text-center py-2 space-y-5">
              <div className="mx-auto w-16 h-16 bg-emerald-100/80 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center shadow-xs">
                <Send className="w-8 h-8 text-emerald-600 animate-pulse" />
              </div>

              <div>
                <h3 className="text-xl font-bold tracking-tight text-foreground">
                  Magic link is sent for confirmation in email!
                </h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  We&apos;ve sent a sign-in magic link to{" "}
                  <strong className="text-foreground font-semibold block mt-0.5 text-sm">
                    {email}
                  </strong>
                </p>
              </div>

              <div className="p-4 bg-emerald-50/60 border border-emerald-200/70 rounded-xl text-left space-y-2">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-xs text-emerald-950 font-medium">
                    Click the link in your email to immediately access your dashboard.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-xs text-emerald-800">
                    No OTP verification code or password needed.
                  </span>
                </div>
              </div>

              {resendSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{resendSuccess}</span>
                </div>
              )}

              <div className="pt-2 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={handleResendMagicLink}
                  disabled={!canResend || resending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-foreground bg-neutral-100 hover:bg-neutral-200 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                  <span>
                    {resending
                      ? "Sending..."
                      : canResend
                      ? "Resend Magic Link"
                      : `Resend link in ${resendTimer}s`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMagicLinkSent(false);
                    setError("");
                    setResendSuccess("");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  &larr; Try another email or password
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Auth Mode Toggle Tabs */}
              <div className="flex rounded-xl bg-neutral-100 p-1 mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("magic_link");
                    setError("");
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    authMode === "magic_link"
                      ? "bg-white text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                  <span>Magic Link</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("password");
                    setError("");
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    authMode === "password"
                      ? "bg-white text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Password</span>
                </button>
              </div>

              {authMode === "magic_link" ? (
                /* Magic Link Sign In Form */
                <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
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
                        placeholder="e.g. yourname@example.com"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    We&apos;ll email you a secure link that logs you in instantly. No passwords or verification codes needed.
                  </p>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-accent hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent shadow-xs transition-colors disabled:opacity-50 mt-2"
                  >
                    <span>{loading ? "Sending Magic Link..." : "Send Magic Link"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                /* Password Sign In Form */
                <form onSubmit={handlePasswordLogin} className="space-y-4">
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
                        placeholder="e.g. yourname@example.com"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Password
                    </label>
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
                    <span>{loading ? "Signing in..." : "Sign in with Password"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

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
            </>
          )}
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
