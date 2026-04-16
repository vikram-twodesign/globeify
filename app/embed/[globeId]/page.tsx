import EmbedRoute from "./EmbedRoute";

export function generateStaticParams() {
  return [{ globeId: "_placeholder_" }];
}

export const dynamicParams = false;

export default function EmbedGlobePage() {
  return <EmbedRoute />;
}
