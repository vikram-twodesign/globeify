import DownloadRoute from "./DownloadRoute";

export function generateStaticParams() {
  return [{ globeId: "_placeholder_" }];
}

export const dynamicParams = false;

export default function DownloadGlobePage() {
  return <DownloadRoute />;
}
