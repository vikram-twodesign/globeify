"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface EditorShellProps {
  left: React.ReactNode;
  right: React.ReactNode;
  children: React.ReactNode; // globe area
  topBar: React.ReactNode;
}

type MobileTab = "settings" | "globe" | "pins";

export function EditorShell({
  left,
  right,
  children,
  topBar,
}: EditorShellProps) {
  const [tab, setTab] = useState<MobileTab>("globe");

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <div className="shrink-0 border-b border-border">{topBar}</div>

      <div className="flex min-h-0 flex-1">
        {/* Desktop layout */}
        <aside className="hidden h-full w-[280px] shrink-0 overflow-y-auto border-r border-border lg:block">
          {left}
        </aside>
        <main className="hidden h-full min-w-0 flex-1 lg:block">
          {children}
        </main>
        <aside className="hidden h-full w-[320px] shrink-0 overflow-y-auto border-l border-border lg:block">
          {right}
        </aside>

        {/* Mobile/tablet layout */}
        <div className="flex h-full min-w-0 flex-1 flex-col lg:hidden">
          <div className="h-[48vh] min-h-[280px] shrink-0 border-b border-border">
            {children}
          </div>
          <div className="flex min-h-0 flex-1 overflow-y-auto">
            {tab === "settings" ? (
              <div className="w-full">{left}</div>
            ) : tab === "pins" ? (
              <div className="w-full">{right}</div>
            ) : (
              <div className="w-full p-8 text-center text-xs text-muted-foreground">
                Use the Settings or Pins tab below to edit this globe.
              </div>
            )}
          </div>
          <div className="flex shrink-0 border-t border-border bg-background">
            {(
              [
                { value: "settings", label: "Settings" },
                { value: "globe", label: "Globe" },
                { value: "pins", label: "Pins" },
              ] as { value: MobileTab; label: string }[]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTab(opt.value)}
                className={cn(
                  "flex-1 py-3 text-xs uppercase tracking-wider transition-colors",
                  tab === opt.value
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "inline-block border-b-2 pb-0.5",
                    tab === opt.value
                      ? "border-foreground"
                      : "border-transparent"
                  )}
                >
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
