"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { GlobeCard } from "@/components/dashboard/GlobeCard";
import {
  createGlobe,
  deleteGlobe,
  listPins,
  subscribeToOwnerGlobes,
  updateGlobe,
} from "@/lib/firebase/globes";
import { signOut } from "@/lib/firebase/auth";
import { FREE_TIER_GLOBE_LIMIT } from "@/lib/defaults";
import { buildEditorRoute } from "@/lib/globe-routes";
import type { Globe } from "@/lib/types";

export default function DashboardPage() {
  return (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [globes, setGlobes] = useState<Globe[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pinCounts, setPinCounts] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToOwnerGlobes(user.uid, (next) => {
      setGlobes(next);
      setLoaded(true);
      // Kick off pin count fetches for any new globes (best-effort, async).
      next.forEach((g) => {
        if (pinCounts[g.id] == null) {
          listPins(g.id)
            .then((pins) =>
              setPinCounts((prev) => ({ ...prev, [g.id]: pins.length }))
            )
            .catch(() => {});
        }
      });
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  async function onNew() {
    if (!user) return;
    if (globes.length >= FREE_TIER_GLOBE_LIMIT) {
      showToast(`Free tier allows up to ${FREE_TIER_GLOBE_LIMIT} globes.`);
      return;
    }
    setCreating(true);
    try {
      const id = await createGlobe(user.uid);
      router.push(buildEditorRoute(id));
    } finally {
      setCreating(false);
    }
  }

  async function onDelete(id: string) {
    try {
      await deleteGlobe(id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function onDuplicate(id: string) {
    if (!user) return;
    const source = globes.find((g) => g.id === id);
    if (!source) return;
    if (globes.length >= FREE_TIER_GLOBE_LIMIT) {
      showToast(`Free tier allows up to ${FREE_TIER_GLOBE_LIMIT} globes.`);
      return;
    }
    try {
      const newId = await createGlobe(user.uid, `${source.name} (copy)`);
      await updateGlobe(newId, {
        themePreset: source.themePreset,
        themeColors: source.themeColors,
        behaviour: source.behaviour,
        pinStyle: source.pinStyle,
        metadata: source.metadata,
      });
      router.push(buildEditorRoute(newId));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Duplicate failed");
    }
  }

  async function onCopyEmbed(id: string) {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const snippet = `<div id="globeify-${id}"></div>\n<script src="${origin}/embed.js" data-globe="${id}" async></script>`;
    try {
      await navigator.clipboard.writeText(snippet);
      showToast("Embed copied");
    } catch {
      showToast("Couldn't copy — please select manually");
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-display text-2xl text-white">
            Globeify
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-4xl text-white">Your globes</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {globes.length} of {FREE_TIER_GLOBE_LIMIT} on the free tier
            </p>
          </div>
          <Button onClick={onNew} disabled={creating} size="lg">
            <Plus className="h-4 w-4" />
            New Globe
          </Button>
        </div>

        {!loaded ? (
          <div className="mt-16 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : globes.length === 0 ? (
          <div className="mt-16 rounded-lg border border-dashed border-border bg-card/40 px-8 py-16 text-center">
            <div className="font-display text-2xl text-white">
              Let's make your first globe.
            </div>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Pick a theme, drop a few pins, copy the embed. Three minutes,
              tops.
            </p>
            <Button className="mt-6" onClick={onNew} disabled={creating}>
              <Plus className="h-4 w-4" />
              Create a globe
            </Button>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {globes.map((g) => (
              <GlobeCard
                key={g.id}
                globe={g}
                pinCount={pinCounts[g.id]}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onCopyEmbed={onCopyEmbed}
              />
            ))}
          </div>
        )}
      </main>

      {toast ? (
        <div className="pointer-events-none fixed bottom-8 left-1/2 -translate-x-1/2 rounded-md border border-border bg-card px-4 py-2 text-xs text-foreground shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
