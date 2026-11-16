"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { OtpInput } from "@/components/auth/OtpInput";
import { safeNextPath, type OAuthProvider } from "@/lib/auth-redirect";

type Step = "start" | "sent" | "password";

const RESEND_SECONDS = 60;
const LAST_EMAIL_KEY = "veyra:last-email";
// Must match Supabase → Auth → Email → "Email OTP length" (this project: 8).
const CODE_LENGTH = Number(process.env.NEXT_PUBLIC_AUTH_CODE_LENGTH ?? 8);
const EMPTY_CODE: string[] = Array(CODE_LENGTH).fill("");

const PROVIDER_LABEL: Record<OAuthProvider, string> = { google: "Google", github: "GitHub" };

const inputClass =
  "w-full rounded border border-border bg-bg-3 p-2.5 font-mono focus:border-gold focus:outline-none";
const primaryButton = "w-full rounded bg-gold px-4 py-2.5 text-black disabled:opacity-60";
const linkButton = "text-sm text-teal hover:underline disabled:opacity-60";

/** Sign in and sign up are the same flow: a new email or OAuth identity creates the account. */
export function AuthCard({ providers }: { providers: OAuthProvider[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));

  const [step, setStep] = useState<Step>("start");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState<string[]>(EMPTY_CODE);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    params.get("error") === "link"
      ? "That sign-in link didn't work — it may have expired or been opened in another browser. Request a new one, or use the code from the email."
      : null
  );
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const saved = window.localStorage.getItem(LAST_EMAIL_KEY);
    if (saved) setEmail(saved);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const callbackUrl = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  function finish() {
    window.localStorage.setItem(LAST_EMAIL_KEY, email);
    router.refresh();
    router.push(next);
  }

  async function oauth(provider: OAuthProvider) {
    setError(null);
    setBusy(provider);
    const { error } = await createBrowserSupabase().auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl() },
    });
    // On success the browser is already navigating to the provider.
    if (error) {
      setBusy(null);
      setError(`${PROVIDER_LABEL[provider]} sign-in isn't available right now. Use email instead.`);
    }
  }

  async function sendEmail(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email) return;
    setError(null);
    setBusy("email");
    const { error } = await createBrowserSupabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl(), shouldCreateUser: true },
    });
    setBusy(null);
    if (error) {
      return setError(
        error.status === 429
          ? "Too many emails requested. Wait a minute and try again."
          : error.message
      );
    }
    window.localStorage.setItem(LAST_EMAIL_KEY, email);
    setCode(EMPTY_CODE);
    setCooldown(RESEND_SECONDS);
    setStep("sent");
  }

  async function verifyCode(digits: string[]) {
    setError(null);
    setBusy("code");
    const { error } = await createBrowserSupabase().auth.verifyOtp({
      email,
      token: digits.join(""),
      type: "email",
    });
    setBusy(null);
    if (error) {
      setCode(EMPTY_CODE);
      return setError("That code didn't work. Check the latest email, or send a new code.");
    }
    finish();
  }

  async function passwordSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("password");
    const { error } = await createBrowserSupabase().auth.signInWithPassword({ email, password });
    setBusy(null);
    if (error) return setError("Wrong email or password. You can also get a sign-in link by email.");
    finish();
  }

  function onCodeChange(digits: string[]) {
    setCode(digits);
    if (digits.every((d) => d) && busy !== "code") verifyCode(digits);
  }

  return (
    <main className="grid min-h-screen place-items-center grid-noise px-4">
      <div className="card-industrial w-full max-w-md space-y-6 p-7">
        {step === "sent" ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <h1 className="font-display text-3xl">Check your email</h1>
              <p className="text-sm text-text-2">
                We sent a sign-in link and a {CODE_LENGTH}-digit code to{" "}
                <span className="text-foreground">{email}</span>.
                Click the link, or enter the code here.
              </p>
            </div>
            <OtpInput value={code} onChange={onCodeChange} />
            {busy === "code" && <p className="text-center text-sm text-text-2">Signing you in…</p>}
            {error && <ErrorText message={error} />}
            <div className="flex items-center justify-between">
              <button
                type="button"
                className={linkButton}
                onClick={() => {
                  setStep("start");
                  setError(null);
                }}
              >
                Use a different email
              </button>
              <button
                type="button"
                className={linkButton}
                disabled={cooldown > 0 || busy === "email"}
                onClick={() => sendEmail()}
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <h1 className="font-display text-3xl">Sign in to Veyra</h1>
              <p className="text-sm text-text-2">New here? The same steps create your account.</p>
            </div>

            {providers.length > 0 && (
              <>
                <div className="space-y-2">
                  {providers.map((p) => (
                    <button
                      key={p}
                      type="button"
                      disabled={busy !== null}
                      onClick={() => oauth(p)}
                      className="flex w-full items-center justify-center gap-3 rounded border border-border bg-bg-3 px-4 py-2.5 hover:border-gold disabled:opacity-60"
                    >
                      <ProviderIcon provider={p} />
                      {busy === p ? "Redirecting…" : `Continue with ${PROVIDER_LABEL[p]}`}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-text-2">
                  <span className="h-px flex-1 bg-border" />
                  or
                  <span className="h-px flex-1 bg-border" />
                </div>
              </>
            )}

            {step === "start" ? (
              <form onSubmit={sendEmail} className="space-y-3">
                <input
                  className={inputClass}
                  placeholder="you@company.com"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button type="submit" disabled={busy !== null} className={primaryButton}>
                  {busy === "email" ? "Sending…" : "Continue with email"}
                </button>
              </form>
            ) : (
              <form onSubmit={passwordSignIn} className="space-y-3">
                <input
                  className={inputClass}
                  placeholder="you@company.com"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  className={inputClass}
                  placeholder="Password"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="submit" disabled={busy !== null} className={primaryButton}>
                  {busy === "password" ? "Signing in…" : "Sign in"}
                </button>
              </form>
            )}

            {error && <ErrorText message={error} />}

            <button
              type="button"
              className={`${linkButton} w-full`}
              onClick={() => {
                setStep(step === "start" ? "password" : "start");
                setError(null);
              }}
            >
              {step === "start" ? "Sign in with a password instead" : "Email me a sign-in link instead"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}

function ErrorText({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded border border-red-500/40 bg-red-500/10 p-2.5 text-sm text-red-300">
      {message}
    </p>
  );
}

function ProviderIcon({ provider }: { provider: OAuthProvider }) {
  if (provider === "google") {
    return (
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 23.5 12C23.5 5.7 18.3.5 12 .5z" />
    </svg>
  );
}
