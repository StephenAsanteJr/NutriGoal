"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS: Record<string, React.ReactNode> = {
  build: <path d="M12 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM7 21v-6l-2-1 2-5h10l2 5-2 1v6" />,
  tickets: <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4zM10 5v12" />,
  plus: <path d="M12 5v14M5 12h14" />,
  market: <path d="M4 9l1.5-5h13L20 9M4 9h16v11H4zM9 20v-6h6v6" />,
  member: <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z" />,
  queue: <path d="M4 6h16M4 12h16M4 18h10" />,
  people: <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3.3 2.7-5 6-5s6 1.7 6 5M17 11a2.5 2.5 0 1 0 0-5M21 20c0-2.5-1.5-4-4-4.5" />,
  bell: <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10.3 20a1.9 1.9 0 0 0 3.4 0" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  org: <path d="M4 21V5l8-3 8 3v16M9 21v-4h6v4M8 8h2M14 8h2M8 12h2M14 12h2" />,
};

/** Bottom tab bar for phones (hidden from md up, where the top navigation shows). */
export function MobileNav({ role }: { role: "member" | "clinician" | "manager" | "org_manager" }) {
  const path = usePathname();
  const tabs =
    role === "member"
      ? [
          { href: "/dashboard", label: "Build", icon: "build" },
          { href: "/tickets", label: "Tickets", icon: "tickets" },
          { href: "/tickets/new", label: "New", icon: "plus", primary: true },
          { href: "/marketplace", label: "Market", icon: "market" },
          { href: "/membership", label: "Member", icon: "member" },
        ]
      : role === "org_manager"
        ? [
            { href: "/org", label: "Wellness", icon: "chart" },
            { href: "/org/plan", label: "Plan", icon: "member" },
            { href: "/org/settings", label: "Invite", icon: "people" },
            { href: "/notifications", label: "Alerts", icon: "bell" },
          ]
        : role === "manager"
          ? [
              { href: "/staff/ops", label: "Ops", icon: "chart" },
              { href: "/staff/finance", label: "Finance", icon: "chart" },
              { href: "/staff", label: "Tickets", icon: "queue" },
              { href: "/staff/team", label: "Team", icon: "people" },
              { href: "/staff/organizations", label: "Orgs", icon: "org" },
              { href: "/staff/marketplace", label: "Partners", icon: "market" },
              { href: "/notifications", label: "Alerts", icon: "bell" },
            ]
          : [
              { href: "/staff/dashboard", label: "Dashboard", icon: "chart" },
              { href: "/staff", label: "Queue", icon: "queue" },
              { href: "/staff/members", label: "Members", icon: "people" },
              { href: "/notifications", label: "Alerts", icon: "bell" },
            ];
  const isActive = (href: string) =>
    href === "/tickets" ? path === "/tickets" || (path.startsWith("/tickets/") && path !== "/tickets/new") : href === "/staff" ? path === "/staff" || path.startsWith("/staff/tickets") : href === "/org" ? path === "/org" : path === href || path.startsWith(href + "/");

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden"
      aria-label="Main"
    >
      <ul className="flex items-stretch justify-around">
        {tabs.map((t) => {
          const active = isActive(t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold ${active ? "text-bain" : "text-slate"}`}
              >
                {"primary" in t && t.primary ? (
                  <span className="-mt-5 flex h-11 w-11 items-center justify-center rounded-full bg-bcg-deep text-white shadow-lg">
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                      {ICONS[t.icon]}
                    </svg>
                  </span>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden>
                    {ICONS[t.icon]}
                  </svg>
                )}
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
