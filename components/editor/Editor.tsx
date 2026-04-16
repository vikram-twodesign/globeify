"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Share2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Globe } from "@/components/globe/Globe";
import {
  addPin,
  deletePin,
  subscribeToGlobe,
  subscribeToPins,
  updateGlobe,
  updatePin,
} from "@/lib/firebase/globes";
import { debounce } from "@/lib/debounce";
import type {
  Globe as GlobeType,
  GlobeInput,
  Pin,
  PinInput,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { EditorShell } from "./EditorShell";
import { SettingsPanel } from "./SettingsPanel";
import { PinsPanel } from "./PinsPanel";
import { EmbedModal } from "./EmbedModal";

interface EditorProps {
  globeId: string;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "not-found" }
  | { kind: "forbidden" }
  | { kind: "error"; message: string }
  | { kind: "ready"; globe: GlobeType };

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function Editor({ globeId }: EditorProps) {
  const { user } = useAuth();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [pins, setPins] = useState<Pin[]>([]);
  const [localGlobe, setLocalGlobe] = useState<GlobeType | null>(null);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const dirtyRef = useRef(false);

  // Subscribe to globe doc.
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToGlobe(
      globeId,
      (g) => {
        if (!g) {
          setState({ kind: "not-found" });
          return;
        }
        if (g.ownerId !== user.uid) {
          setState({ kind: "forbidden" });
          return;
        }
        setState({ kind: "ready", globe: g });
        // Only adopt remote snapshot when we have no unsaved local edit.
        setLocalGlobe((prev) => {
          if (!prev) return g;
          if (dirtyRef.current) return prev;
          return g;
        });
      },
      (err) => setState({ kind: "error", message: err.message })
    );
    return () => unsub();
  }, [globeId, user]);

  // Subscribe to pins subcollection.
  useEffect(() => {
    if (!user) return;
    if (state.kind !== "ready") return;
    const unsub = subscribeToPins(
      globeId,
      (next) => setPins(next),
      () => {}
    );
    return () => unsub();
  }, [globeId, user, state.kind]);

  // Debounced saver keyed to the current globe id.
  const flushSave = useMemo(
    () =>
      debounce((patch: Partial<GlobeInput>) => {
        setSaveStatus("saving");
        updateGlobe(globeId, patch)
          .then(() => {
            dirtyRef.current = false;
            setSaveStatus("saved");
          })
          .catch(() => setSaveStatus("error"));
      }, 800),
    [globeId]
  );

  useEffect(() => {
    return () => {
      flushSave.flush();
    };
  }, [flushSave]);

  const onChange = useCallback(
    (patch: Partial<GlobeInput>) => {
      setLocalGlobe((prev) => (prev ? { ...prev, ...patch } : prev));
      dirtyRef.current = true;
      setSaveStatus("saving");
      flushSave(patch);
    },
    [flushSave]
  );

  // Status label after a save lands — reset to idle after a moment.
  useEffect(() => {
    if (saveStatus !== "saved") return;
    const t = setTimeout(() => setSaveStatus("idle"), 1500);
    return () => clearTimeout(t);
  }, [saveStatus]);

  // ─── Pin actions ────────────────────────────────────────────

  const onAddPin = useCallback(
    async (input: PinInput) => {
      await addPin(globeId, input);
    },
    [globeId]
  );

  const onUpdatePin = useCallback(
    async (id: string, patch: Partial<PinInput>) => {
      await updatePin(globeId, id, patch);
    },
    [globeId]
  );

  const onDeletePin = useCallback(
    async (id: string) => {
      await deletePin(globeId, id);
      setSelectedPinId((v) => (v === id ? null : v));
    },
    [globeId]
  );

  const onFocusPin = useCallback((pin: Pin) => {
    // Toggle so clicking the same pin again still focuses.
    setSelectedPinId(null);
    requestAnimationFrame(() => setSelectedPinId(pin.id));
  }, []);

  // ─── Render ──────────────────────────────────────────────────

  if (state.kind === "loading" || !localGlobe) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading editor…
      </div>
    );
  }

  if (state.kind === "not-found") {
    return (
      <ErrorScreen
        title="Globe not found"
        message="This globe may have been deleted or never existed."
      />
    );
  }

  if (state.kind === "forbidden") {
    return (
      <ErrorScreen
        title="You don't have access"
        message="This globe belongs to someone else."
      />
    );
  }

  if (state.kind === "error") {
    return <ErrorScreen title="Something went wrong" message={state.message} />;
  }

  const topBar = (
    <div className="flex items-center justify-between gap-3 px-5 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>
        <span className="text-muted-foreground/50">·</span>
        <div className="min-w-0 truncate text-sm text-foreground">
          {localGlobe.name || "Untitled Globe"}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <SaveIndicator status={saveStatus} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEmbedOpen(true)}
        >
          <Share2 className="h-3.5 w-3.5" />
          Embed
        </Button>
        <a
          href={`/embed/${globeId}`}
          target="_blank"
          rel="noopener"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-transparent px-3 text-xs text-foreground transition-colors hover:border-ring hover:bg-secondary"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View
        </a>
      </div>
    </div>
  );

  return (
    <>
      <EditorShell
        topBar={topBar}
        left={<SettingsPanel globe={localGlobe} onChange={onChange} />}
        right={
          <PinsPanel
            pins={pins}
            selectedPinId={selectedPinId}
            onFocus={onFocusPin}
            onAdd={onAddPin}
            onUpdate={onUpdatePin}
            onDelete={onDeletePin}
          />
        }
      >
        <div className="h-full w-full">
          <Globe
            colors={localGlobe.themeColors}
            behaviour={localGlobe.behaviour}
            pinStyle={localGlobe.pinStyle}
            pins={pins}
            selectedPinId={selectedPinId}
            onPinSelect={(pin) => setSelectedPinId(pin ? pin.id : null)}
            className="h-full w-full"
          />
        </div>
      </EditorShell>

      <EmbedModal
        open={embedOpen}
        onClose={() => setEmbedOpen(false)}
        globeId={globeId}
      />
    </>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const label =
    status === "saving"
      ? "Saving…"
      : status === "saved"
      ? "Saved"
      : status === "error"
      ? "Save failed"
      : "Saved";
  const dotColor =
    status === "saving"
      ? "bg-amber-400/80"
      : status === "error"
      ? "bg-destructive"
      : "bg-emerald-400/70";
  return (
    <div className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:inline-flex">
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full transition-colors",
          dotColor
        )}
      />
      {label}
    </div>
  );
}

function ErrorScreen({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div>
        <h1 className="font-display text-3xl text-foreground">{title}</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {message}
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-transparent px-4 py-2 text-sm text-foreground transition-colors hover:border-ring hover:bg-secondary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to dashboard
      </Link>
    </div>
  );
}
