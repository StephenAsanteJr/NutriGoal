import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { getProfile, getResponse, getTicket, getUserById, listClinicians, listNudges, listReports, listStaffNotes, toBuildInput, getSettings } from "@/lib/data";
import { goalLabel, stageLabel, ticketNumber } from "@/lib/domain";
import { BuildPanel, lookFrom, memberCode } from "@/components/BuildPanel";
import { ResponseTicket } from "@/components/ResponseTicket";
import { ListenButton } from "@/components/Voice";
import { Alert, StatusPill, shortDate, timeAgo } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { managerNudge, reassignTicket, startReview } from "@/actions/staff";
import { NotesCard } from "@/components/NotesCard";
import { StaffDataPanel } from "@/components/StaffDataPanel";
import { ResponseComposer } from "./ResponseComposer";

export const metadata: Metadata = { title: "Review ticket" };

export default async function StaffTicket(props: PageProps<"/staff/tickets/[id]">) {
  const user = await requireStaff();
  const { id } = await props.params;
  const sp = await props.searchParams;
  const t = getTicket(Number(id));
  if (!t || t.status === "awaiting_payment") notFound();
  const manager = user.role === "manager";
  const mine = t.assigned_clinician_id === user.id;
  const member = getUserById(t.user_id)!;
  const profile = getProfile(t.user_id);
  const input = toBuildInput(profile);
  const reports = listReports(t.user_id);
  const notes = listStaffNotes(t.user_id);
  const response = getResponse(t.id);
  const clinicians = manager ? listClinicians() : [];
  const canWrite = mine && t.status !== "responded";
  const nudges = listNudges(t.id);

  return (
    <div className="space-y-6">
      <Link href="/staff" className="btn-ghost -ml-3">← Back to queue</Link>
      {sp.sent && (
        <Alert tone="good">
          <strong>Response ticket sent.</strong> {member.name} has been notified and can read it now.
        </Alert>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">
            {ticketNumber(t.id)} · {goalLabel(t.goal_type)} · goal group <span className="font-mono normal-case">{t.goal_group}</span>
          </div>
          <h1 className="font-display max-w-3xl text-4xl leading-tight">{t.goal_statement}</h1>
          <p className="mt-2 text-sm text-slate">
            {member.name} · paid {t.paid_at ? shortDate(t.paid_at) : "—"} via {t.payment_method?.replace("_", " ")} · assigned to{" "}
            <strong className="text-navy">{t.clinician_name}</strong>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusPill status={t.status} />
          {t.status !== "responded" && t.due_at && <span className="text-xs text-slate">Due {timeAgo(t.due_at)} · {shortDate(t.due_at)}</span>}
        </div>
      </div>

      {t.status !== "responded" && nudges.length > 0 && (
        <div className="card flex flex-wrap items-center gap-3 border-warn/40 bg-warn-tint/50 px-5 py-3 text-sm">
          <span className="font-bold text-warn">⚑ Nudged {nudges.length}×</span>
          <span className="text-slate">
            Latest {timeAgo(nudges[0].created_at)} via {nudges[0].source === "assistant" ? "NutriGoal Assistant" : nudges[0].source}
            {nudges[0].message ? ` · “${nudges[0].message}”` : ""}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
        {/* Ticket detail */}
        <section className="card">
          <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-3">
            <h2 className="text-sm font-bold">Member&apos;s ticket</h2>
            <ListenButton size="sm" label="Listen to ticket" title={`${ticketNumber(t.id)}: ${t.goal_statement}`} text={`Goal: ${t.goal_statement}. What they typically eat: ${t.typical_diet}. Setbacks: ${t.setbacks}. Target: ${t.specific_target}.${t.extra_context ? ` Other context: ${t.extra_context}` : ""}`} />
          </div>
          <dl className="divide-y divide-line">
            {[
              ["Nutritional goal", t.goal_statement],
              ["What they typically eat", t.typical_diet],
              ["Setbacks", t.setbacks],
              ["Specific target", t.specific_target],
              ["Other context", t.extra_context || "—"],
              ["Medication stage", stageLabel(profile?.medication_stage)],
              ["Conditions / allergies", profile?.conditions || "—"],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[170px_1fr] gap-4 px-6 py-3">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">{k}</dt>
                <dd className="whitespace-pre-line text-sm">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="border-t border-line bg-mist px-6 py-3 text-xs text-slate">
            <strong className="text-navy">Routing (rules, no AI):</strong> {t.routing_reason}
          </div>
        </section>

        {/* Work area */}
        <div className="space-y-6">
          {manager && t.status !== "responded" && (
            <form action={reassignTicket} className="card flex flex-wrap items-end gap-3 p-5">
              <input type="hidden" name="ticket_id" value={t.id} />
              <div className="flex-1">
                <label htmlFor="clinician_id" className="label">Reassign clinician</label>
                <select id="clinician_id" name="clinician_id" defaultValue={t.assigned_clinician_id ?? ""} className="input">
                  {clinicians.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.credential}) · {c.open_count} open
                    </option>
                  ))}
                </select>
              </div>
              <SubmitButton className="btn-outline" pendingText="Moving…">Reassign</SubmitButton>
            </form>
          )}
          {manager && t.status !== "responded" && (
            <form action={managerNudge} className="card flex flex-wrap items-center justify-between gap-3 p-5">
              <input type="hidden" name="ticket_id" value={t.id} />
              <div className="text-sm">
                <div className="font-bold">Nudge {t.clinician_name}</div>
                <div className="text-xs text-slate">Sends an in-app reminder to review this ticket.</div>
              </div>
              <SubmitButton className="btn-dark" pendingText="Sending…">Send nudge</SubmitButton>
            </form>
          )}

          {response ? (
            <ResponseTicket
              ticketId={t.id}
              goalType={t.goal_type}
              goalStatement={t.goal_statement}
              recommendation={response.recommendation}
              steps={response.steps}
              clinicianName={response.clinician_name}
              clinicianCredential={response.clinician_credential}
              aiAssist={response.ai_assist}
              respondedAt={response.created_at}
          foods={response.foods}
            />
          ) : canWrite ? (
            t.status === "assigned" ? (
              <form action={startReview} className="card flex flex-col items-start gap-3 p-6">
                <input type="hidden" name="ticket_id" value={t.id} />
                <div className="eyebrow">Ready when you are</div>
                <p className="text-sm text-slate">
                  Starting the review tells {member.name.split(" ")[0]} their ticket is being read and opens the response composer.
                </p>
                <SubmitButton className="btn-primary" pendingText="Opening…">Start review</SubmitButton>
              </form>
            ) : (
              <ResponseComposer ticketId={t.id} signer={{ name: user.name, credential: user.credential }} />
            )
          ) : (
            <div className="card p-6 text-sm text-slate">This ticket is assigned to {t.clinician_name}. Only the assigned clinician writes and signs the response{manager ? "; reassign it above if needed" : ""}.</div>
          )}
        </div>
      </div>

      {/* The member's build */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <div className="eyebrow">Member build</div>
            <h2 className="font-display text-2xl">{member.name}</h2>
          </div>
          <Link href={`/staff/members/${member.id}`} className="link text-sm">Full profile →</Link>
        </div>
        {input ? (
          <BuildPanel name={member.name} memberId={memberCode(member.id)} input={input} units={profile!.unit_system} medicationStage={profile!.medication_stage} source={profile!.source} updatedAt={profile!.updated_at} look={lookFrom(getSettings(member.id))} />
        ) : (
          <Alert tone="warn">This member hasn&apos;t completed their build.</Alert>
        )}
      </section>

      <StaffDataPanel memberId={member.id} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="border-b border-line px-6 py-3 text-sm font-bold">Medical reports</h2>
          {reports.length === 0 ? (
            <p className="px-6 py-5 text-sm text-slate">No reports uploaded. Values are self-reported.</p>
          ) : (
            <ul className="divide-y divide-line">
              {reports.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-6 py-3 text-sm">
                  <div>
                    <a href={`/api/reports/${r.id}`} target="_blank" rel="noreferrer" className="link">{r.original_name}</a>
                    <div className="text-xs text-muted">{r.extraction_note}</div>
                  </div>
                  <span className="whitespace-nowrap text-xs text-muted">{timeAgo(r.uploaded_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <NotesCard memberId={member.id} back={`/staff/tickets/${t.id}`} notes={notes} />
      </div>
    </div>
  );
}
