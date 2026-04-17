"use client";

import Link from "next/link";
import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildEditorRoute } from "@/lib/globe-routes";
import { cn } from "@/lib/utils";
import type { Globe } from "@/lib/types";

interface GlobeCardProps {
  globe: Globe;
  pinCount?: number;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onCopyEmbed: (id: string) => void;
}

export function GlobeCard({
  globe,
  pinCount,
  onDelete,
  onDuplicate,
  onCopyEmbed,
}: GlobeCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const updated = toRelativeDate(globe.updatedAt);

  return (
    <div className="group relative">
      <Link
        href={buildEditorRoute(globe.id)}
        className="block rounded-lg border border-border bg-card transition-colors hover:border-ring focus-visible:outline-none focus-visible:border-ring"
      >
        <div
          className="aspect-[4/3] w-full overflow-hidden rounded-t-lg"
          style={{
            background: `radial-gradient(circle at 50% 55%, ${globe.themeColors.land} 0%, ${globe.themeColors.background} 70%)`,
          }}
        >
          <div
            className="h-full w-full"
            style={{
              background: `radial-gradient(circle at 50% 55%, ${globe.themeColors.land}44 0%, transparent 60%)`,
            }}
          />
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">
                {globe.name}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {pinCount != null ? `${pinCount} pin${pinCount === 1 ? "" : "s"} · ` : ""}
                {updated}
              </div>
            </div>
            <div
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                globe.isPublished ? "bg-emerald-400/70" : "bg-muted-foreground/30"
              )}
              title={globe.isPublished ? "Published" : "Private"}
            />
          </div>
        </div>
      </Link>
      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8 bg-card"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen((v) => { if (v) setConfirmDelete(false); return !v; });
          }}
          aria-label="Actions"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
        {menuOpen ? (
          <div
            className="absolute right-0 top-10 z-20 min-w-[140px] overflow-hidden rounded-md border border-border bg-card shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {[
              { label: "Copy embed", action: () => onCopyEmbed(globe.id) },
              { label: "Duplicate", action: () => onDuplicate(globe.id) },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                className="block w-full px-3 py-2 text-left text-xs transition-colors hover:bg-secondary text-foreground"
                onClick={() => {
                  setMenuOpen(false);
                  item.action();
                }}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-xs transition-colors hover:bg-secondary text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </button>
            {confirmDelete ? (
              <div className="border-t border-border px-3 py-2">
                <p className="mb-2 text-[11px] text-muted-foreground">Delete "{globe.name}"?</p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    className="flex-1 rounded bg-destructive px-2 py-1 text-[11px] text-white transition-opacity hover:opacity-80"
                    onClick={() => { setConfirmDelete(false); setMenuOpen(false); onDelete(globe.id); }}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded border border-border px-2 py-1 text-[11px] text-foreground transition-colors hover:bg-secondary"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function toRelativeDate(ts: unknown): string {
  try {
    const raw = ts as { toDate?: () => Date; seconds?: number } | Date | undefined;
    let d: Date | null = null;
    if (raw instanceof Date) d = raw;
    else if (raw && typeof (raw as { toDate?: () => Date }).toDate === "function") {
      d = (raw as { toDate: () => Date }).toDate();
    } else if (raw && typeof (raw as { seconds?: number }).seconds === "number") {
      d = new Date((raw as { seconds: number }).seconds * 1000);
    }
    if (!d) return "recently";
    const diff = Date.now() - d.getTime();
    const minutes = Math.round(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days}d ago`;
    return d.toLocaleDateString();
  } catch {
    return "recently";
  }
}
