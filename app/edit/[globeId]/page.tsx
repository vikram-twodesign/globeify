import EditorRoute from "./EditorRoute";

export function generateStaticParams() {
  return [{ globeId: "_placeholder_" }];
}

export const dynamicParams = false;

export default function EditGlobePage() {
  return <EditorRoute />;
}
