import Link from "next/link";

export function CTA() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <div className="flex flex-col items-center gap-6 border-y border-border py-20 text-center">
        <h2 className="font-display text-5xl leading-[1.05] text-foreground md:text-6xl">
          Ready when you are.
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Free to start. No credit card.
        </p>
        <Link
          href="/login"
          className="mt-2 inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-85"
        >
          Create your first globe
        </Link>
      </div>
    </section>
  );
}

export default CTA;
