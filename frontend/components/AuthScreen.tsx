"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    const result = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (result.error) {
      setMessage(result.error.message);
    } else if (mode === "signup") {
      setMessage("Account created. Check your email to confirm it, then sign in.");
    }
  };

  if (!supabase) {
    return <main className="auth-shell"><section className="auth-card"><h1>Oria</h1><p>Authentication needs Supabase configuration.</p><code>Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to frontend/.env.local.</code></section></main>;
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-mark">F</div>
        <h1>Oria</h1>
        <p>{mode === "signin" ? "Sign in to your private finance workspace." : "Create your private finance workspace."}</p>
        <form onSubmit={submit} className="auth-form">
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} /></label>
          {message && <p className="auth-message">{message}</p>}
          <button disabled={busy} type="submit">{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
        </form>
        <button className="auth-switch" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }}>
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </section>
    </main>
  );
}
