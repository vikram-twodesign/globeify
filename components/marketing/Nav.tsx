import Link from "next/link";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 h-14 border-b border-border/60 bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-display text-xl leading-none tracking-tight transition-opacity hover:opacity-80"
        >
          Globeify
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
          <Link
            href="/login"
            className="inline-flex h-8 items-center rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-85"
          >
            Start free
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default Nav;
