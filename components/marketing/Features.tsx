import { Compass, Code2, RefreshCw, Palette } from "lucide-react";

const FEATURES = [
  {
    icon: Compass,
    title: "Genuine craft",
    body: "A default globe that looks better than anything you could build yourself in a day.",
  },
  {
    icon: Code2,
    title: "One-line embed",
    body: "Paste a script tag, done. Works with Webflow, Notion, WordPress, raw HTML.",
  },
  {
    icon: RefreshCw,
    title: "Edit anywhere, update everywhere",
    body: "Change a pin once; every embed updates live within seconds.",
  },
  {
    icon: Palette,
    title: "Aesthetics-first themes",
    body: "Six curated palettes. Or bring your own four colours.",
  },
];

export function Features() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <p className="mb-10 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        &sect; features
      </p>
      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="flex flex-col gap-4 bg-background p-8"
          >
            <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            <h3 className="font-display text-2xl leading-tight text-foreground">
              {title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Features;
