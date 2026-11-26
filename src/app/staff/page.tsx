import Link from "next/link";
import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { listClinicians, listTicketsForStaff, nudgeCounts, type TicketWithPeople } from "@/lib/data";
import { goalLabel, money, ticketNumber } from "@/lib/domain";
import { PageHeader, StatusPill, hoursUntil, isoDaysAgo, timeAgo } from "@/components/ui";

export const metadata: Metadata = { title: "Clinician portal" };

export default async function StaffHome(props: PageProps<"/staff">) {
  const user = await requireStaff();
  const sp = await props.searchParams;
  const manager = user.role === "manager";
  const filter = typeof sp.status === "string" ? sp.status : "open";
  const statuses = filter === "open" ? ["assigned", "in_review"] : filter === "responded" ? ["responded"] : [];
  const tickets = listTicketsForStaff({ clinicianId: manager ? undefined : user.id, status: statuses });
  const all = listTicketsForStaff({ clinicianId: manager ? undefined : user.id });
  const open = all.filter((t) => t.status !== "responded");
  const dueSoon = open.filter((t) => t.due_at && hoursUntil(t.due_at) < 12);
  const responded = all.filter((t) => t.status === "responded" && t.responded_at && t.paid_at);
  const avgHrs = responded.length
    ? responded.reduce((s, t) => s + (new Date(t.responded_at!).getTime() - new Date(t.paid_at!).getTime()) / 3600_000, 0) / responded.length
    : 0;
  const within48 = responded.length ? responded.filter((t) => new Date(t.responded_at!).getTime() <= new Date(t.due_at!).getTime()).length / responded.length : 1;

  const revenue = manager
    ? (db().prepare("SELECT COALESCE(SUM(amount_cents),0) AS c FROM payments WHERE created_at >= ?").get(isoDaysAgo(30)) as { c: number }).c
    : 0;
  const members = manager ? (db().prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'member'").get() as { n: number }).n : 0;
  const clinicians = manager ? listClinicians() : [];

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={manager ? "Operations" : "My queue"} title={manager ? "Ticket operations" : `Good to see you, ${user.name.replace("Dr. ", "Dr. ").split(" ").slice(0, 2).join(" ")}`}>
        {manager
          ? "Every paid ticket is routed by plain rules to a matched clinician. Watch the 48-hour promise and rebalance queues here."
          : "Tickets routed to you by goal group. Review the member's build, then write a concise recommendation and 5–6 timed steps."}
      </PageHeader>

      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[3px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={manager ? "Open tickets" : "In my queue"} value={String(open.length)} />
        <Kpi label="Due within 12 hrs" value={String(dueSoon.length)} tone={dueSoon.length ? "alert" : undefined} />
        <Kpi label="Avg. time to response" value={responded.length ? `${avgHrs.toFixed(1)} hrs` : "—"} sub={responded.length ? `${Math.round(within48 * 100)}% within 48 hrs` : "No responses yet"} />
        {manager ? (
          <Kpi label="Revenue · last 30 days" value={money(revenue)} sub={`${members} members · simulated payments`} />
        ) : (
          <Kpi label="Responses sent" value={String(responded.length)} />
        )}
      </div>

      {manager && (
        <section className="card overflow-x-auto">
          <div className="flex items-center justify-between border-b border-line px-6 py-3">
            <h2 className="text-sm font-bold">Clinician load</h2>
            <Link href="/staff/team" className="link text-xs">Roster →</Link>
          </div>
          <table className="w-full min-w-[640px] text-sm">
            <tbody>
              {clinicians.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <td className="px-6 py-3 font-bold">{c.name}</td>
                  <td className="px-3 py-3 text-slate">{c.credential}</td>
                  <td className="w-1/3 px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-mist">
                        <div className="h-full bg-bcg" style={{ width: `${Math.min(100, c.open_count * 20)}%` }} />
                      </div>
                      <span className="w-14 text-xs text-slate">{c.open_count} open</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right text-xs text-muted">{c.done_count} answered</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="card overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-3">
          <h2 className="text-sm font-bold">{manager ? "All tickets" : "My tickets"}</h2>
          <nav className="flex gap-1 text-xs font-bold" aria-label="Filter tickets">
            {[
              ["open", "Open"],
              ["responded", "Responded"],
              ["all", "All"],
            ].map(([k, l]) => (
              <Link key={k} href={`/staff?status=${k}`} className={`rounded-[2px] px-3 py-1.5 ${filter === k ? "bg-navy text-white" : "text-slate hover:bg-mist"}`}>
                {l}
              </Link>
            ))}
          </nav>
        </div>
        <QueueTable tickets={tickets} showClinician={manager} />
      </section>
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "warn" | "alert" }) {
  return (
    <div className="bg-white px-6 py-5">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</div>
      <div className={`font-display mt-1 text-4xl ${tone === "warn" ? "text-warn" : tone === "alert" ? "text-alert" : ""}`}>{value}</div>
      {sub && <div className="text-xs text-slate">{sub}</div>}
    </div>
  );
}

function QueueTable({ tickets, showClinician }: { tickets: TicketWithPeople[]; showClinician: boolean }) {
  const nudges = nudgeCounts();
  if (!tickets.length) return <p className="px-6 py-10 text-center text-sm text-slate">Nothing here right now.</p>;
  return (
    <table className="w-full min-w-[820px] text-sm">
      <thead>
        <tr className="border-b border-line bg-mist text-left text-[11px] uppercase tracking-wider text-muted">
          <th className="px-6 py-2.5 font-bold">Ticket</th>
          <th className="px-3 py-2.5 font-bold">Member · goal</th>
          <th className="px-3 py-2.5 font-bold">Goal group</th>
          {showClinician && <th className="px-3 py-2.5 font-bold">Clinician</th>}
          <th className="px-3 py-2.5 font-bold">Due</th>
          <th className="px-6 py-2.5 text-right font-bold">Status</th>
        </tr>
      </thead>
      <tbody>
        {tickets.map((t) => {
          const left = t.status !== "responded" && t.due_at ? hoursUntil(t.due_at) : null;
          const overdue = left != null && left < 0;
          const soon = left != null && left < 12;
          return (
            <tr key={t.id} className="border-b border-line last:border-0 hover:bg-mist/70">
              <td className="px-6 py-3 font-mono text-xs">
                <Link href={`/staff/tickets/${t.id}`} className="link">{ticketNumber(t.id)}</Link>
              </td>
              <td className="max-w-xs px-3 py-3">
                <Link href={`/staff/tickets/${t.id}`} className="block font-bold hover:text-bain">{t.member_name}</Link>
                <div className="truncate text-xs text-slate">{goalLabel(t.goal_type)} — {t.goal_statement}</div>
              </td>
              <td className="px-3 py-3 font-mono text-xs text-slate">{t.goal_group}</td>
              {showClinician && <td className="px-3 py-3">{t.clinician_name}</td>}
              <td className={`px-3 py-3 text-xs ${overdue ? "font-bold text-alert" : soon ? "font-bold text-warn" : "text-slate"}`}>
                {t.status === "responded" ? `Sent ${timeAgo(t.responded_at!)}` : t.due_at ? (overdue ? `Overdue ${timeAgo(t.due_at)}` : timeAgo(t.due_at)) : "—"}
              </td>
              <td className="px-6 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  {t.status !== "responded" && nudges.get(t.id) && (
                    <span className="pill bg-warn-tint text-warn" title={`Last nudge ${timeAgo(nudges.get(t.id)!.last)}`}>
                      ⚑ Nudged ×{nudges.get(t.id)!.n}
                    </span>
                  )}
                  <StatusPill status={t.status} />
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
