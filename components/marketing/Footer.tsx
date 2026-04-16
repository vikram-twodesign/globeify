import Link from "next/link";

const LINKS = [
  { href: "#", label: "Privacy" },
  { href: "#", label: "Terms" },
  { href: "#", label: "GitHub" },
];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-8 sm:flex-row sm:items-center">
        <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground">
          Globeify &middot; 2026
        </p>
        <nav className="flex items-center gap-6">
          {LINKS.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

export default Footer;
