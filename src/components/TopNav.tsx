import Link from "next/link";
import { Logo } from "./Logo";
import { logout } from "@/actions/auth";
import { unreadCount } from "@/lib/data";
import type { User } from "@/lib/auth";
import { NavLinks } from "./NavLinks";

const MEMBER_LINKS = [
  { href: "/dashboard", label: "My build" },
  { href: "/tickets", label: "Tickets" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/data", label: "Data" },
  { href: "/membership", label: "Membership" },
];

export function TopNav({ user }: { user: User }) {
  const staff = user.role !== "member";
  const links = staff
    ? [
        ...(user.role === "manager"
          ? [{ href: "/staff/ops", label: "Ops dashboard" }, { href: "/staff/finance", label: "Finance" }, { href: "/staff", label: "Tickets" }]
          : [{ href: "/staff/dashboard", label: "My dashboard" }, { href: "/staff", label: "My queue" }]),
        { href: "/staff/members", label: "Member builds" },
        ...(user.role === "manager" ? [{ href: "/staff/team", label: "Clinicians" }, { href: "/staff/marketplace", label: "Marketplace" }] : []),
      ]
    : user.onboarding_complete
      ? MEMBER_LINKS
      : [];
  const unread = unreadCount(user.id);

  return (
    <header className={staff ? "bg-navy text-white" : "border-b border-line bg-white"}>
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:h-16 sm:gap-8 sm:px-6">
        <Logo href={staff ? "/staff" : "/dashboard"} tone={staff ? "light" : "dark"} suffix={staff ? "Clinician portal" : undefined} />
        <NavLinks links={links} tone={staff ? "light" : "dark"} />
        <div className="ml-auto flex items-center gap-3 text-sm sm:gap-4">
          <Link
            href="/notifications"
            className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full ${staff ? "hover:bg-white/10" : "hover:bg-mist"}`}
            aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
              <path d="M10.3 20a1.9 1.9 0 0 0 3.4 0" />
            </svg>
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-bain px-1 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </Link>
          <div className="hidden text-right leading-tight sm:block">
            <div className="font-bold">{user.name}</div>
            <div className={`text-xs ${staff ? "text-white/60" : "text-muted"}`}>
              {staff ? user.credential : user.email}
            </div>
          </div>
          <form action={logout}>
            <button className={`text-xs font-bold underline-offset-4 hover:underline ${staff ? "text-bcg-fresh" : "text-bain"}`}>
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
