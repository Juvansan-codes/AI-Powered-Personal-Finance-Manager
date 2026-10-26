"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    try {
      let token: string | null = null;

      // 1. Check URL hash (Supabase default: #access_token=...&refresh_token=...)
      if (typeof window !== "undefined" && window.location.hash) {
        const hash = window.location.hash.replace(/^#/, "");
        const params = new URLSearchParams(hash);
        token = params.get("access_token");
      }

      // 2. Check query params (?token=... or ?access_token=...)
      if (!token) {
        token = searchParams.get("token") || searchParams.get("access_token");
      }

      if (token) {
        localStorage.setItem("financeflow_token", token);
        setStatus("success");
        setTimeout(() => {
          router.push("/");
        }, 800);
      } else {
        // Fallback: check if already logged in or redirect
        const existingToken = localStorage.getItem("financeflow_token");
        if (existingToken) {
          router.push("/");
        } else {
          setStatus("error");
          setErrorMessage("No authentication token found in confirmation link.");
        }
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "Failed to process magic link confirmation.");
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center items-center p-6 text-center">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl shadow-neutral-200/50 border border-border">
        {status === "verifying" && (
          <div className="space-y-4">
            <Loader2 className="w-10 h-10 text-accent animate-spin mx-auto" />
            <h2 className="text-lg font-bold text-foreground">Confirming your magic link...</h2>
            <p className="text-xs text-muted-foreground">Setting up your secure session</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Confirmed!</h2>
            <p className="text-xs text-muted-foreground">Redirecting to your dashboard...</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Verification failed</h2>
            <p className="text-xs text-red-600">{errorMessage}</p>
            <button
              onClick={() => router.push("/login")}
              className="mt-4 w-full py-2 px-4 rounded-xl text-xs font-semibold text-white bg-accent hover:bg-accent-dark transition-colors"
            >
              Return to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center text-xs text-muted-foreground">
        Loading confirmation...
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
