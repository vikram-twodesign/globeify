"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeMagicLinkSignIn, isMagicLinkUrl } from "@/lib/firebase/auth";

export default function LoginCompletePage() {
  const router = useRouter();
  const [status, setStatus] = useState<
    | { state: "loading" }
    | { state: "need-email" }
    | { state: "error"; message: string }
  >({ state: "loading" });
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    if (!isMagicLinkUrl(url)) {
      setStatus({
        state: "error",
        message: "This link isn't valid or has expired. Please request a new one.",
      });
      return;
    }
    (async () => {
      try {
        await completeMagicLinkSignIn(url);
        router.replace("/dashboard");
      } catch (err) {
        if (
          err instanceof Error &&
          /Missing email/i.test(err.message)
        ) {
          setStatus({ state: "need-email" });
          return;
        }
        setStatus({
          state: "error",
          message:
            err instanceof Error ? err.message : "Could not complete sign-in.",
        });
      }
    })();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setStatus({ state: "loading" });
      await completeMagicLinkSignIn(window.location.href, email.trim());
      router.replace("/dashboard");
    } catch (err) {
      setStatus({
        state: "error",
        message:
          err instanceof Error ? err.message : "Could not complete sign-in.",
      });
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-xs uppercase tracking-widest text-muted-foreground">
          ← Globeify
        </Link>
        {status.state === "loading" ? (
          <>
            <h1 className="font-display text-4xl text-white mb-2">Signing you in…</h1>
            <p className="text-sm text-muted-foreground">One moment.</p>
          </>
        ) : status.state === "need-email" ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <h1 className="font-display text-4xl text-white mb-2">Confirm your email</h1>
              <p className="text-sm text-muted-foreground">
                Re-enter the address that received the sign-in link.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full h-11">
              Continue
            </Button>
          </form>
        ) : (
          <div>
            <h1 className="font-display text-4xl text-white mb-2">Sign-in failed</h1>
            <p className="text-sm text-muted-foreground mb-6">{status.message}</p>
            <Link
              href="/login"
              className="inline-flex h-11 items-center rounded-md border border-border bg-transparent px-4 text-sm font-medium text-foreground transition-colors hover:border-ring hover:bg-secondary"
            >
              Back to login
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
