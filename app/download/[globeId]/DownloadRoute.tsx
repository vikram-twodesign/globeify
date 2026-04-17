"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/components/auth/AuthProvider";
import { getGlobe, listPins } from "@/lib/firebase/globes";
import {
  buildEditorRoute,
  extractGlobeIdFromRoute,
} from "@/lib/globe-routes";
import { buildStandaloneHtml } from "@/lib/standalone-html";
import type { Globe, Pin } from "@/lib/types";

export default function DownloadRoute() {
  const pathname = usePathname();
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    setSearchParams(new URLSearchParams(window.location.search));
  }, []);

  const globeId = extractGlobeIdFromRoute("download", pathname, searchParams);

  if (!globeId) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <AuthGate>
      <DownloadBody globeId={globeId} />
    </AuthGate>
  );
}

function DownloadBody({ globeId }: { globeId: string }) {
  const { user } = useAuth();
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "not-owner" }
    | { kind: "missing" }
    | { kind: "error"; message: string }
    | { kind: "ready"; globe: Globe; pins: Pin[]; filename: string }
  >({ kind: "loading" });
  const hasAutoDownloadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const globe = await getGlobe(globeId);
        if (cancelled) return;
        if (!globe) {
          setState({ kind: "missing" });
          return;
        }
        if (!user || globe.ownerId !== user.uid) {
          setState({ kind: "not-owner" });
          return;
        }
        const pins = await listPins(globeId);
        if (cancelled) return;
        const filename = slugify(globe.name) + ".html";
        setState({ kind: "ready", globe, pins, filename });
      } catch (err) {
        if (cancelled) return;
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [globeId, user]);

  const triggerDownload = useCallback(
    (globe: Globe, pins: Pin[], filename: string) => {
      const html = buildStandaloneHtml(globe, pins);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    []
  );

  useEffect(() => {
    if (state.kind === "ready" && !hasAutoDownloadedRef.current) {
      hasAutoDownloadedRef.current = true;
      triggerDownload(state.globe, state.pins, state.filename);
    }
  }, [state, triggerDownload]);

  if (state.kind === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Preparing your download…
      </div>
    );
  }

  if (state.kind === "not-owner") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <p className="mb-3 text-sm text-foreground">
            You can only download your own globes.
          </p>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (state.kind === "missing") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <p className="mb-3 text-sm text-foreground">Globe not found.</p>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <p className="mb-3 text-sm text-foreground">
            Couldn&rsquo;t prepare download.
          </p>
          <p className="mb-3 text-xs text-muted-foreground">{state.message}</p>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="mb-2 text-base text-foreground">Downloaded!</p>
        <p className="mb-6 text-sm text-muted-foreground">
          Your file: <span className="font-mono">{state.filename}</span>
        </p>
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() =>
              triggerDownload(state.globe, state.pins, state.filename)
            }
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm text-foreground transition hover:bg-accent"
          >
            Download again
          </button>
          <Link
            href={buildEditorRoute(state.globe.id)}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Back to editor
          </Link>
        </div>
      </div>
    </div>
  );
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "globe";
}
