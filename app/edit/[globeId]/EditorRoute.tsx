"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AuthGate } from "@/components/auth/AuthGate";
import { Editor } from "@/components/editor/Editor";
import { extractGlobeIdFromRoute } from "@/lib/globe-routes";

export default function EditorRoute() {
  const pathname = usePathname();
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    setSearchParams(new URLSearchParams(window.location.search));
  }, []);

  const globeId = extractGlobeIdFromRoute("edit", pathname, searchParams);

  if (!globeId) {
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
