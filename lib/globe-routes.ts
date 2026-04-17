const PLACEHOLDER_GLOBE_ID = "_placeholder_";

function buildPlaceholderRoute(
  section: "edit" | "embed" | "download",
  globeId: string
) {
  return `/${section}/${PLACEHOLDER_GLOBE_ID}?globeId=${encodeURIComponent(globeId)}`;
}

export function buildEditorRoute(globeId: string) {
  return buildPlaceholderRoute("edit", globeId);
}

export function buildEmbedAppRoute(globeId: string) {
  return buildPlaceholderRoute("embed", globeId);
}

export function buildDownloadRoute(globeId: string) {
  return buildPlaceholderRoute("download", globeId);
}

export function buildEmbedPublicRoute(globeId: string) {
  return `/embed/${globeId}`;
}

export function extractGlobeIdFromRoute(
  section: "edit" | "embed" | "download",
  pathname: string | null,
  searchParams: { get(name: string): string | null } | null
) {
  const queryGlobeId = searchParams?.get("globeId");
  if (queryGlobeId) return queryGlobeId;
  if (!pathname) return null;

  const match = pathname.match(new RegExp(`^/${section}/([^/]+)/?$`));
  if (!match) return null;

  return match[1] === PLACEHOLDER_GLOBE_ID ? null : match[1];
}
