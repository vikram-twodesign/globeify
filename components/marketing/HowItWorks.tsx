const STEPS = [
  { n: "01", title: "Pick a theme", body: "Graphite, Paper, Midnight, Ice, Sand, or Forest." },
  { n: "02", title: "Drop a few pins", body: "Search a city or paste coordinates. Add a note." },
  { n: "03", title: "Paste the embed", body: "One script tag. Works on any site, updates live." },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <p className="mb-10 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        &sect; how it works
      </p>
      <div className="grid gap-10 md:grid-cols-3 md:gap-8">
        {STEPS.map(({ n, title, body }) => (
          <div key={n} className="flex flex-col gap-3 border-t border-border pt-6">
            <span className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground">
              {n}
            </span>
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

export default HowItWorks;
