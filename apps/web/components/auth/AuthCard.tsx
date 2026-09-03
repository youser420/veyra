"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { OtpInput } from "@/components/auth/OtpInput";

type Mode = "signin" | "signup";

export function AuthCard({ initialMode = "signin" }: { initialMode?: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [useOtp, setUseOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createBrowserSupabase();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      setLoading(false);
      if (error) {
        console.error("Signup error:", error);
        return toast.error(error.message || "Signup failed — check Supabase Auth logs");
      }
      if (data.user && !data.session) {
        toast.success("Check your email to confirm your account, then sign in.");
        setMode("signin");
        return;
      }
      toast.success("Account created");
      router.refresh();
      router.push("/dashboard");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      console.error("Sign in error:", error);
      if (error.message.toLowerCase().includes("email not confirmed")) {
        return toast.error("Confirm your email first, or disable Confirm email in Supabase → Auth → Email.");
      }
      return toast.error(error.message);
    }
    if (!data.session) {
      return toast.error("Signed in but no session — try Magic OTP or check Supabase email settings.");
    }
    router.refresh();
    router.push("/dashboard");
  }

  async function sendOtp() {
    if (!email) return toast.error("Enter your email");
    setLoading(true);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (error) return toast.error(error.message);
    setOtpSent(true);
    toast.success("Check your email for the code");
  }

  async function verifyOtp() {
    const token = otp.join("");
    if (token.length !== 6) return toast.error("Enter the 6-digit code");
    setLoading(true);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    setLoading(false);
    if (error) return toast.error(error.message);
    router.refresh();
    router.push("/dashboard");
  }

  return (
    <main className="grid min-h-screen place-items-center grid-noise px-4">
      <div className="card-industrial w-full max-w-md space-y-5 p-6">
        <h1 className="font-display text-4xl">{mode === "signup" ? "Sign Up" : "Sign In"}</h1>

        <div className="flex rounded-md border border-border p-1">
          <button
            type="button"
            className={`flex-1 rounded px-3 py-2 text-sm ${mode === "signin" ? "bg-gold text-black" : "text-text-2"}`}
            onClick={() => setMode("signin")}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`flex-1 rounded px-3 py-2 text-sm ${mode === "signup" ? "bg-gold text-black" : "text-text-2"}`}
            onClick={() => setMode("signup")}
          >
            Sign Up
          </button>
        </div>

        {!useOtp ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {mode === "signup" && (
              <input
                className="w-full rounded border border-border bg-bg-3 p-2 font-mono focus:border-gold focus:outline-none"
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            )}
            <input
              className="w-full rounded border border-border bg-bg-3 p-2 font-mono focus:border-gold focus:outline-none"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="w-full rounded border border-border bg-bg-3 p-2 font-mono focus:border-gold focus:outline-none"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-gold px-4 py-2 text-black disabled:opacity-60"
            >
              {mode === "signup" ? "Create Account" : "Sign In"}
            </button>
          </form>
        ) : !otpSent ? (
          <div className="space-y-4">
            <input
              className="w-full rounded border border-border bg-bg-3 p-2 font-mono focus:border-gold focus:outline-none"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              type="button"
              disabled={loading}
              onClick={sendOtp}
              className="w-full rounded bg-gold px-4 py-2 text-black disabled:opacity-60"
            >
              Send Magic Code
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-center text-sm text-text-2">Enter the 6-digit code sent to {email}</p>
            <OtpInput value={otp} onChange={setOtp} />
            <button
              type="button"
              disabled={loading}
              onClick={verifyOtp}
              className="w-full rounded bg-gold px-4 py-2 text-black disabled:opacity-60"
            >
              Verify Code
            </button>
          </div>
        )}

        <button
          type="button"
          className="w-full text-sm text-teal hover:underline"
          onClick={() => {
            setUseOtp(!useOtp);
            setOtpSent(false);
            setOtp(Array(6).fill(""));
          }}
        >
          {useOtp ? "Use email & password instead" : "Use Magic OTP"}
        </button>

        <p className="text-center text-sm text-text-2">
          {mode === "signin" ? (
            <>
              No account?{" "}
              <Link href="/signup" className="text-gold">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="text-gold">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
