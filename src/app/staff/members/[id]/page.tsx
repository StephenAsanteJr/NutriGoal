import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { getActiveSubscription, getProfile, getUserById, listReports, listStaffNotes, listTicketsForMember, toBuildInput, getSettings } from "@/lib/data";
import { goalLabel, ticketNumber } from "@/lib/domain";
import { BuildPanel, lookFrom, memberCode } from "@/components/BuildPanel";
import { NotesCard } from "@/components/NotesCard";
import { StaffDataPanel } from "@/components/StaffDataPanel";
import { Alert, StatusPill, shortDate, timeAgo } from "@/components/ui";

export const metadata: Metadata = { title: "Member build" };

export default async function MemberDetail(props: PageProps<"/staff/members/[id]">) {
  await requireStaff();
  const { id } = await props.params;
  const member = getUserById(id);
  if (!member || member.role !== "member") notFound();
  const profile = getProfile(id);
  const input = toBuildInput(profile);
  const tickets = listTicketsForMember(id).filter((t) => t.status !== "awaiting_payment");
  const reports = listReports(id);
  const sub = getActiveSubscription(id);

  return (
    <div className="space-y-6">
      <Link href="/staff/members" className="btn-ghost -ml-3">← All member builds</Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">{memberCode(id)} · joined {new Date(member.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</div>
          <h1 className="font-display text-4xl">{member.name}</h1>
          <p className="mt-1 text-sm text-slate">
            {member.email} · {sub ? `Member (${sub.plan})` : "Pay-per-ticket"} · {tickets.length} ticket{tickets.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {input ? (
        <BuildPanel name={member.name} memberId={memberCode(id)} input={input} units={profile!.unit_system} medicationStage={profile!.medication_stage} source={profile!.source} updatedAt={profile!.updated_at} look={lookFrom(getSettings(id))} />
      ) : (
        <Alert tone="warn">This member hasn&apos;t completed their build yet.</Alert>
      )}
      {profile?.conditions && (
        <div className="card px-6 py-4 text-sm">
          <span className="font-bold">Conditions, allergies, medicines: </span>
          {profile.conditions}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="border-b border-line px-6 py-3 text-sm font-bold">Ticket history</h2>
          {tickets.length === 0 ? (
            <p className="px-6 py-5 text-sm text-slate">No tickets yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {tickets.map((t) => (
                <li key={t.id}>
                  <Link href={`/staff/tickets/${t.id}`} className="flex items-center gap-4 px-6 py-3 hover:bg-mist">
                    <span className="font-mono text-xs text-muted">{ticketNumber(t.id)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">{t.goal_statement}</div>
                      <div className="text-xs text-slate">
                        {goalLabel(t.goal_type)} · {t.clinician_name} · {shortDate(t.paid_at ?? t.created_at)}
                      </div>
                    </div>
                    <StatusPill status={t.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card">
          <h2 className="border-b border-line px-6 py-3 text-sm font-bold">Medical reports</h2>
          {reports.length === 0 ? (
            <p className="px-6 py-5 text-sm text-slate">No reports uploaded.</p>
          ) : (
            <ul className="divide-y divide-line">
              {reports.map((r) => (
                <li key={r.id} className="px-6 py-3 text-sm">
                  <a href={`/api/reports/${r.id}`} target="_blank" rel="noreferrer" className="link">{r.original_name}</a>
                  <div className="text-xs text-muted">
                    {r.extraction_note} · {timeAgo(r.uploaded_at)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <StaffDataPanel memberId={id} />
      <NotesCard memberId={id} back={`/staff/members/${id}`} notes={listStaffNotes(id)} />
    </div>
  );
}
