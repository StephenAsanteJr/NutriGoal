import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { listNotifications } from "@/lib/data";
import { markAllNotificationsRead } from "@/actions/marketplace";
import { TopNav } from "@/components/TopNav";
import { MobileNav } from "@/components/MobileNav";
import { PageHeader, timeAgo } from "@/components/ui";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const items = listNotifications(user.id, 50);
  return (
    <div className="flex min-h-screen flex-col bg-mist/60">
      <TopNav user={user} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-10 md:pt-10">
        <PageHeader
          title="Notifications"
          actions={
            items.some((n) => !n.read_at) ? (
              <form action={markAllNotificationsRead}>
                <button className="btn-ghost">Mark all as read</button>
              </form>
            ) : undefined
          }
        />
        <ul className="card">
          {items.length === 0 && <li className="px-6 py-10 text-center text-sm text-slate">You&apos;re all caught up.</li>}
          {items.map((n) => (
            <li key={n.id} className="border-b border-line last:border-0">
              <Link href={n.link ?? "#"} className="flex gap-4 px-6 py-4 hover:bg-mist">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-cyan"}`} aria-label={n.read_at ? undefined : "Unread"} />
                <div className="flex-1">
                  <div className="font-bold">{n.title}</div>
                  <div className="text-sm text-slate">{n.body}</div>
                </div>
                <span className="whitespace-nowrap text-xs text-muted">{timeAgo(n.created_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <MobileNav role={user.role} />
    </div>
  );
}
