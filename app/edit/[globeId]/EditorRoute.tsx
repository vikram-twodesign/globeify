"use client";

import { usePathname } from "next/navigation";
import { AuthGate } from "@/components/auth/AuthGate";
import { Editor } from "@/components/editor/Editor";

const PLACEHOLDER = "_placeholder_";

function extractGlobeId(pathname: string | null): string | null {
  if (!pathname) return null;
  // Matches /edit/<id> or /edit/<id>/ with optional trailing slash.
  const match = pathname.match(/^\/edit\/([^/]+)\/?$/);
  return match ? match[1] : null;
}

export default function EditorRoute() {
  const pathname = usePathname();
  const globeId = extractGlobeId(pathname);

  if (!globeId || globeId === PLACEHOLDER) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <AuthGate>
      <Editor globeId={globeId} />
    </AuthGate>
  );
}
