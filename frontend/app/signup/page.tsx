"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Lock,
  Phone,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Send,
  ExternalLink,
} from "lucide-react";
import { api } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Confirmation state
  const [isSent, setIsSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [timer, setTimer] = useState(45);
  const [canResend, setCanResend] = useState(false);

  // Timer countdown for resending
  useEffect(() => {
    if (isSent && timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (timer === 0) {
      setCanResend(true);
    }
  }, [isSent, timer]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setError("Please fill in your name and email address.");
      return;
    }

    if (password && password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (!agreed) {
      setError("Please accept the terms and conditions.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await api.signup({
        name,
        email,
        password: password || undefined,
        phone: phone || undefined,
      });

      if (res.access_token) {
        localStorage.setItem("financeflow_token", res.access_token);
        if (res.user) {
          localStorage.setItem("financeflow_user", JSON.stringify(res.user));
        }
        router.push("/");
        return;
      }

      // Magic link has been dispatched
      setSubmittedEmail(res.email || email);
      setIsSent(true);
      setTimer(45);
      setCanResend(false);
    } catch (err: any) {
      setError(err.message || "Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendMagicLink = async () => {
    if (!canResend || !submittedEmail) return;
    try {
      setResending(true);
      setResendMessage("");
      setError("");
      await api.resendMagicLink(submittedEmail);
      setTimer(45);
      setCanResend(false);
      setResendMessage(`A fresh magic link has been sent to ${submittedEmail}.`);
    } catch (err: any) {
      setError(err.message || "Could not resend magic link. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Ambient background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center items-center gap-2.5 mb-6">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-md shadow-accent/20">
            <span className="text-white font-bold text-base">F</span>
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">
            FinanceFlow
          </span>
        </div>

        {!isSent ? (
          <>
            <h2 className="text-center text-2xl font-bold tracking-tight text-foreground">
              Create your account
            </h2>
            <p className="mt-1.5 text-center text-xs text-muted-foreground">
              Instant setup &bull; Magic link passwordless authentication
            </p>
          </>
        ) : null}
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-neutral-200/50 rounded-2xl border border-border">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isSent ? (
            /* Magic link confirmation view */
            <div className="text-center py-2 space-y-5">
              <div className="mx-auto w-16 h-16 bg-emerald-100/80 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center shadow-xs">
                <Send className="w-8 h-8 text-emerald-600 animate-pulse" />
              </div>

              <div>
                <h3 className="text-xl font-bold tracking-tight text-foreground">
                  Magic link is sent for confirmation!
                </h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  We&apos;ve sent a secure confirmation magic link to{" "}
                  <strong className="text-foreground font-semibold block mt-0.5 text-sm">
                    {submittedEmail}
                  </strong>
                </p>
              </div>

              <div className="p-4 bg-emerald-50/60 border border-emerald-200/70 rounded-xl text-left space-y-2">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-xs text-emerald-950 font-medium">
                    Click the link in your email to instantly confirm your account and sign in.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-xs text-emerald-800">
                    No OTP code or password required &bull; 1-click verification.
                  </span>
                </div>
              </div>

              {resendMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{resendMessage}</span>
                </div>
              )}

              {/* Resend section */}
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
                      ? "Sending magic link..."
                      : canResend
                      ? "Resend Magic Link"
                      : `Resend link in ${timer}s`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSent(false);
                    setError("");
                    setResendMessage("");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  &larr; Entered wrong email address?
                </button>
              </div>

              <div className="pt-4 border-t border-border">
                <Link
                  href="/login"
                  className="text-xs font-semibold text-accent hover:text-accent-dark transition-colors"
                >
                  Already confirmed? Sign in &rarr;
                </Link>
              </div>
            </div>
          ) : (
            /* Signup form */
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Full name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. E. Abishek Joseph"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                  />
                </div>
              </div>

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
                  Password <span className="text-muted-foreground font-normal">(Optional for Magic Link)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password (optional)"
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

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Mobile number <span className="text-muted-foreground font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="terms"
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-4 h-4 accent-accent rounded"
                />
                <label htmlFor="terms" className="text-xs text-muted-foreground">
                  I agree to the Terms of Service &bull; Free Go Plan
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-accent hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent shadow-xs transition-colors disabled:opacity-50 mt-3"
              >
                <span>{loading ? "Sending Magic Link..." : "Create Account & Send Magic Link"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {!isSent && (
            <div className="mt-6 pt-5 border-t border-border text-center">
              <p className="text-xs text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-accent hover:text-accent-dark transition-colors"
                >
                  Log in &rarr;
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
