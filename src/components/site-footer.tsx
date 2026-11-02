import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-display text-lg font-bold text-primary-foreground">
              F
            </span>
            <span className="font-display text-lg font-bold tracking-tight">
              Fitness<span className="text-primary">Pro</span>
            </span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Train with expert coaches, join high-energy group classes and track every rep —
            your entire fitness journey in one app.
          </p>
        </div>
        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
            Explore
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>
              <Link to="/" className="transition-colors hover:text-primary">
                Home
              </Link>
            </li>
            <li>
              <Link to="/classes" className="transition-colors hover:text-primary">
                Classes
              </Link>
            </li>
            <li>
              <Link to="/membership" className="transition-colors hover:text-primary">
                Membership
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className="transition-colors hover:text-primary">
                My dashboard
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
            Visit us
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>Open daily · 5:00 AM – 11:00 PM</li>
            <li>12 Park Street, Kolkata</li>
            <li>hello@fitnesspro.fit</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Fitness Pro. Built to make you stronger.
      </div>
    </footer>
  );
}
