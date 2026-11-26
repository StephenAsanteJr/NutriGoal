import Link from "next/link";
import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { listTicketsForMember } from "@/lib/data";
import { PageHeader, StatusPill, shortDate } from "@/components/ui";
import { goalLabel, ticketNumber } from "@/lib/domain";

export const metadata: Metadata = { title: "Tickets" };

export default async function TicketsPage() {
  const user = await requireMember();
  const all = listTicketsForMember(user.id);
  const drafts = all.filter((t) => t.status === "awaiting_payment");
  const tickets = all.filter((t) => t.status !== "awaiting_payment");

  return (
    <div>
      <PageHeader eyebrow="Goal tickets" title="Your tickets" actions={<Link href="/tickets/new" className="btn-primary">New goal ticket</Link>}>
        One goal per ticket. Each answer comes back as a response ticket with a recommendation and 5–6 timed steps.
      </PageHeader>

      {drafts.length > 0 && (
        <section className="card mb-6">
          <h2 className="border-b border-line px-6 py-3 text-sm font-bold">Drafts not yet sent</h2>
          <ul>
            {drafts.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 border-b border-line px-6 py-3 last:border-0">
                <span className="truncate">{t.goal_statement}</span>
                <Link href={`/tickets/new?draft=${t.id}`} className="link whitespace-nowrap text-sm">Finish and send →</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line bg-mist text-left text-[11px] uppercase tracking-wider text-muted">
              <th className="px-6 py-3 font-bold">Ticket</th>
              <th className="px-3 py-3 font-bold">Goal</th>
              <th className="px-3 py-3 font-bold">Clinician</th>
              <th className="px-3 py-3 font-bold">Submitted</th>
              <th className="px-6 py-3 text-right font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate">
                  No tickets yet. <Link href="/tickets/new" className="link">Open your first one</Link>.
                </td>
              </tr>
            )}
            {tickets.map((t) => (
              <tr key={t.id} className="border-b border-line last:border-0 hover:bg-mist/70">
                <td className="px-6 py-4 font-mono text-xs">
                  <Link href={`/tickets/${t.id}`} className="link">{ticketNumber(t.id)}</Link>
                </td>
                <td className="max-w-sm px-3 py-4">
                  <Link href={`/tickets/${t.id}`} className="block truncate font-bold hover:text-bain">{t.goal_statement}</Link>
                  <div className="text-xs text-slate">{goalLabel(t.goal_type)}</div>
                </td>
                <td className="px-3 py-4">
                  {t.clinician_name ? (
                    <>
                      <div>{t.clinician_name}</div>
                      <div className="text-xs text-muted">{t.clinician_credential}</div>
                    </>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-4 text-slate">{shortDate(t.paid_at ?? t.created_at)}</td>
                <td className="px-6 py-4 text-right">
                  <StatusPill status={t.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
