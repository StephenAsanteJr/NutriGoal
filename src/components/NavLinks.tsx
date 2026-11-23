"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links, tone }: { links: { href: string; label: string }[]; tone: "dark" | "light" }) {
  const path = usePathname();
  return (
    <nav className="hidden items-stretch gap-6 self-stretch md:flex" aria-label="Main">
      {links.map((l) => {
        const active =
          l.href === "/staff" ? path === "/staff" || path.startsWith("/staff/tickets") : path === l.href || path.startsWith(l.href + "/");
        const base = "flex items-center border-b-2 text-sm font-bold transition-colors";
        const cls =
          tone === "dark"
            ? active
              ? "border-blue text-navy"
              : "border-transparent text-slate hover:text-navy"
            : active
              ? "border-cyan text-white"
              : "border-transparent text-white/70 hover:text-white";
        return (
          <Link key={l.href} href={l.href} className={`${base} ${cls}`} aria-current={active ? "page" : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
