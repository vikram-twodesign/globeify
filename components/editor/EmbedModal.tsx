"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmbedModalProps {
  open: boolean;
  onClose: () => void;
  globeId: string;
}

type Tab = "script" | "iframe" | "download";

export function EmbedModal({ open, onClose, globeId }: EmbedModalProps) {
  const [tab, setTab] = useState<Tab>("script");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const scriptSnippet = `<div id="globeify-${globeId}"></div>\n<script src="${origin}/embed.js" data-globe="${globeId}" async></script>`;
  const iframeSnippet = `<iframe src="${origin}/embed/${globeId}" width="100%" height="600" frameborder="0" style="border-radius:8px;"></iframe>`;
  const snippet =
    tab === "script"
      ? scriptSnippet
      : tab === "iframe"
      ? iframeSnippet
      : "";

  async function copy() {
    if (!snippet) return;
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-xl text-foreground">
            Embed this globe
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex border-b border-border px-5">
          {(
            [
              { value: "script", label: "Script" },
              { value: "iframe", label: "Iframe" },
              { value: "download", label: "Download" },
            ] as { value: Tab; label: string }[]
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTab(opt.value)}
              className={cn(
                "relative px-4 py-3 text-sm transition-colors",
                tab === opt.value
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
              {tab === opt.value ? (
                <span className="absolute bottom-0 left-2 right-2 h-px bg-foreground" />
              ) : null}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 p-5">
          {tab === "script" ? (
            <>
              <p className="text-xs text-muted-foreground">
                Recommended. Paste this one line into any website — the script
                injects a responsive iframe and keeps your globe live.
              </p>
              <SnippetBox snippet={scriptSnippet} />
              <CopyButton onClick={copy} copied={copied} />
            </>
          ) : tab === "iframe" ? (
            <>
              <p className="text-xs text-muted-foreground">
                Use this if your platform strips &lt;script&gt; tags (e.g. some
                Notion-style editors).
              </p>
              <SnippetBox snippet={iframeSnippet} />
              <CopyButton onClick={copy} copied={copied} />
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Get a self-contained HTML file that runs without any external
                dependencies. Note: a downloaded file won&apos;t receive live
                updates when you edit the globe.
              </p>
              <a
                href={`/download/${globeId}`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center justify-center gap-2 self-start rounded-md border border-border bg-transparent px-4 py-2 text-sm text-foreground transition-colors hover:border-ring hover:bg-secondary"
              >
                <Download className="h-4 w-4" />
                Download self-contained HTML
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SnippetBox({ snippet }: { snippet: string }) {
  return (
    <pre className="max-h-48 overflow-auto rounded-md border border-border bg-secondary/40 p-3 font-mono text-[11px] leading-relaxed text-foreground whitespace-pre-wrap break-all">
      {snippet}
    </pre>
  );
}

function CopyButton({
  onClick,
  copied,
}: {
  onClick: () => void;
  copied: boolean;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={copied ? "secondary" : "default"}
      onClick={onClick}
      className="self-start"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Copy
        </>
      )}
    </Button>
  );
}
