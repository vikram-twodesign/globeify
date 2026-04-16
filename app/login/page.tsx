"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/AuthProvider";
import { sendMagicLink, signInWithGoogle } from "@/lib/firebase/auth";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    { state: "idle" } | { state: "sending" } | { state: "sent" } | { state: "error"; message: string }
  >({ state: "idle" });
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setStatus({ state: "error", message: "Please enter a valid email." });
      return;
    }
    try {
      setStatus({ state: "sending" });
      await sendMagicLink(email.trim());
      setStatus({ state: "sent" });
    } catch (err) {
      setStatus({
        state: "error",
        message:
          err instanceof Error
            ? err.message
            : "Could not send the magic link. Please try again.",
      });
    }
  }

  async function onGoogleClick() {
    try {
      setGoogleBusy(true);
      await signInWithGoogle();
      router.replace("/dashboard");
    } catch (err) {
      setStatus({
        state: "error",
        message:
          err instanceof Error ? err.message : "Google sign-in failed.",
      });
    } finally {
      setGoogleBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-xs uppercase tracking-widest text-muted-foreground">
          ← Globeify
        </Link>
        <h1 className="font-display text-4xl text-white mb-2">Sign in</h1>
        <p className="text-sm text-muted-foreground mb-8">
          A secure link to your inbox, or use Google.
        </p>

        <Button
          type="button"
          variant="outline"
          className="w-full h-11"
          onClick={onGoogleClick}
          disabled={googleBusy}
        >
          {googleBusy ? "Opening Google…" : "Continue with Google"}
        </Button>

        <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          or
          <div className="h-px flex-1 bg-border" />
        </div>

        {status.state === "sent" ? (
          <div className="rounded-md border border-border bg-card px-4 py-5 text-sm">
            <div className="font-medium text-foreground">Check your email</div>
            <div className="mt-1 text-muted-foreground">
              We sent a sign-in link to <span className="text-foreground">{email}</span>.
              Open it on this device to continue.
            </div>
            <button
              className="mt-3 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              onClick={() => setStatus({ state: "idle" })}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status.state === "sending"}
                className="h-11"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11"
              disabled={status.state === "sending"}
            >
              {status.state === "sending" ? "Sending link…" : "Send magic link"}
            </Button>
            {status.state === "error" ? (
              <p className="text-xs text-destructive">{status.message}</p>
            ) : null}
          </form>
        )}
      </div>
    </main>
  );
}
