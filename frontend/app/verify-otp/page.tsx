"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Mail,
} from "lucide-react";
import { api } from "@/lib/api";

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(45);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");


  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize email from query or sessionStorage
  useEffect(() => {
    const qEmail = searchParams.get("email");
    const storedEmail = typeof window !== "undefined" ? sessionStorage.getItem("signup_email") : null;
    const finalEmail = qEmail || storedEmail || "";
    setEmail(finalEmail);

    // Focus first input box
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 150);
  }, [searchParams]);

  // Resend countdown timer
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  // Handle individual digit input
  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric digit
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) {
      const newDigits = [...digits];
      newDigits[index] = "";
      setDigits(newDigits);
      return;
    }

    // Take the last entered character if multiple typed
    const char = cleaned.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    // Auto-advance to next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Backspace navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  // Handle Paste of full 6-digit code
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setDigits(newDigits);

    // Focus on the next empty or last
    const nextIdx = Math.min(pasted.length, 5);
    inputRefs.current[nextIdx]?.focus();
  };



  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = digits.join("");
    if (fullOtp.length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await api.verifyOtp({ email, otp: fullOtp });
      if (res.success && res.access_token) {
        setSuccessMessage("Verification successful! Redirecting to dashboard...");
        localStorage.setItem("financeflow_token", res.access_token);
        localStorage.setItem("financeflow_user", JSON.stringify(res.user));

        setTimeout(() => {
          router.push("/");
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || "Invalid or expired OTP code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    try {
      setResending(true);
      setError("");
      const res = await api.resendOtp(email);
      setTimer(45);
      setCanResend(false);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      setSuccessMessage(`A new verification code has been sent to ${email}.`);
    } catch (err: any) {
      setError(err.message || "Could not resend OTP. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="flex justify-center items-center gap-2.5 mb-6">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-md shadow-accent/20">
            <span className="text-white font-bold text-base">F</span>
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">
            FinanceFlow
          </span>
        </div>

        {/* Shield Icon Visual */}
        <div className="mx-auto w-14 h-14 bg-emerald-100 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center shadow-xs mb-3">
          <ShieldCheck className="w-7 h-7" />
        </div>

        <h2 className="text-center text-2xl font-bold tracking-tight text-foreground">
          Enter verification code
        </h2>
        <p className="mt-1 text-center text-xs text-muted-foreground max-w-xs mx-auto">
          We&apos;ve dispatched a 6-digit one-time code to{" "}
          <strong className="text-foreground font-semibold">{email}</strong>
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-neutral-200/50 rounded-2xl border border-border">
          {/* Info banner — check email for OTP */}
          <div className="mb-6 p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl flex items-center gap-2 text-xs">
            <Mail className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-blue-900">
              Check your email inbox or server logs for the 6-digit verification code.
            </span>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-6">
            {!email && (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  required
                />
              </div>
            )}

            {/* 6 Digit Input Boxes */}
            <div>
              <label className="block text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                6-Digit Security Code
              </label>

              <div
                className="flex items-center justify-center gap-2.5 sm:gap-3"
                onPaste={handlePaste}
              >
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-11 h-13 sm:w-12 sm:h-14 text-center font-mono text-xl sm:text-2xl font-bold text-foreground bg-neutral-50/70 rounded-xl border border-border focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20 focus:outline-none transition-all shadow-2xs"
                  />
                ))}
              </div>
            </div>

            {/* Verify CTA */}
            <button
              type="submit"
              disabled={loading || digits.join("").length < 6}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-accent hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent shadow-xs transition-all disabled:opacity-50"
            >
              <span>{loading ? "Verifying..." : "Verify & Complete Signup"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Resend OTP Section */}
          <div className="mt-6 pt-5 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Didn&apos;t get the code?</span>
            {canResend ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="font-semibold text-accent hover:text-accent-dark transition-colors flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                <span>{resending ? "Sending..." : "Resend Code"}</span>
              </button>
            ) : (
              <span className="font-mono text-muted-foreground font-medium">
                Resend in {timer}s
              </span>
            )}
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/signup"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              &larr; Entered the wrong email address?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-muted-foreground">Loading verification...</div>}>
      <VerifyOtpContent />
    </Suspense>
  );
}
