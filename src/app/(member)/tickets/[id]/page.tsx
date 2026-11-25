import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { getResponse, getTicket } from "@/lib/data";
import { db, nowIso } from "@/lib/db";
import { goalLabel, money, ticketNumber } from "@/lib/domain";
import { ResponseTicket } from "@/components/ResponseTicket";
import { ListenButton } from "@/components/Voice";
import { Alert, StatusPill, shortDate, timeAgo } from "@/components/ui";

export const metadata: Metadata = { title: "Ticket" };

export default async function TicketPage(props: PageProps<"/tickets/[id]">) {
  const user = await requireMember();
  const { id } = await props.params;
  const sp = await props.searchParams;
  const ticket = getTicket(Number(id));
  if (!ticket || ticket.user_id !== user.id) notFound();
  if (ticket.status === "awaiting_payment") redirect(`/tickets/new?draft=${ticket.id}`);
  const response = getResponse(ticket.id);
  const payment = db()
    .prepare("SELECT id, amount_cents, provider, card_brand, card_last4, created_at FROM payments WHERE ticket_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(ticket.id, user.id) as { id: string; amount_cents: number; provider: string; card_brand: string | null; card_last4: string | null; created_at: string } | undefined;

  if (response && !ticket.member_seen_at) {
    db().prepare("UPDATE tickets SET member_seen_at = ? WHERE id = ?").run(nowIso(), ticket.id);
    db().prepare("UPDATE notifications SET read_at = COALESCE(read_at, ?) WHERE user_id = ? AND link = ?").run(nowIso(), user.id, `/tickets/${ticket.id}`);
  }

  const steps = [
    { label: "Submitted & paid", at: ticket.paid_at, done: true },
    { label: `Matched to ${ticket.clinician_name ?? "a clinician"}`, at: ticket.assigned_at, done: !!ticket.assigned_at },
    { label: "Clinician reviewing", at: null, done: ticket.status === "in_review" || ticket.status === "responded" },
    { label: "Response ticket sent", at: ticket.responded_at, done: ticket.status === "responded" },
  ];

  return (
    <div className="space-y-6">
      <Link href="/tickets" className="btn-ghost -ml-3">← All tickets</Link>
      {sp.submitted && (
        <Alert tone="good">
          <strong>Ticket submitted.</strong> {sp.member ? "Welcome to NutriGoal Membership — your Daily Support Pack is active. " : ""}
          {ticket.clinician_name} will send your response ticket by {ticket.due_at ? shortDate(ticket.due_at) : "within 48 hours"}.
        </Alert>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">
            {ticketNumber(ticket.id)} · {goalLabel(ticket.goal_type)}
          </div>
          <h1 className="font-display max-w-3xl text-4xl leading-tight">{ticket.goal_statement}</h1>
        </div>
        <StatusPill status={ticket.status} />
      </div>

      <ol className="card grid grid-cols-1 gap-px overflow-hidden bg-line sm:grid-cols-4" aria-label="Ticket progress">
        {steps.map((s, i) => (
          <li key={s.label} className="flex items-start gap-3 bg-white px-5 py-4">
            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${s.done ? "bg-navy text-white" : "border border-line text-muted"}`}>
              {s.done ? "✓" : i + 1}
            </span>
            <div>
              <div className={`text-sm font-bold ${s.done ? "" : "text-muted"}`}>{s.label}</div>
              {s.at && <div className="text-xs text-muted">{shortDate(s.at)}</div>}
            </div>
          </li>
        ))}
      </ol>

      {response ? (
        <ResponseTicket
          ticketId={ticket.id}
          goalType={ticket.goal_type}
          goalStatement={ticket.goal_statement}
          recommendation={response.recommendation}
          steps={response.steps}
          clinicianName={response.clinician_name}
          clinicianCredential={response.clinician_credential}
          aiAssist={response.ai_assist}
          respondedAt={response.created_at}
          foods={response.foods}
        />
      ) : (
        <section className="card flex flex-wrap items-center gap-6 p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-tint font-display text-xl text-blue">
            {(ticket.clinician_name ?? "?").replace("Dr. ", "").split(" ").map((w) => w[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1">
            <div className="text-sm text-slate">Your clinician</div>
            <div className="text-lg font-bold">
              {ticket.clinician_name}
              <span className="font-normal text-slate">, {ticket.clinician_credential}</span>
            </div>
            <p className="mt-1 text-sm text-slate">
              {ticket.status === "in_review" ? "is reviewing your ticket and build now." : "has your ticket in their queue."} Your response ticket is due{" "}
              <strong className="text-navy">{ticket.due_at ? timeAgo(ticket.due_at) : "within 48 hours"}</strong>.
            </p>
          </div>
          <Link href="/marketplace" className="btn-outline">Explore partners while you wait</Link>
        </section>
      )}

      <section className="card flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="flex items-center gap-3 text-sm">
          <span className="pill bg-good-tint text-good">✓ Paid</span>
          {payment ? (
            <span className="text-slate">
              {money(payment.amount_cents)} · {payment.card_brand ? `${payment.card_brand} ·· ${payment.card_last4}` : payment.provider === "stripe" ? "Card via Stripe" : "Card"} ·{" "}
              {payment.provider === "stripe" ? "processed by Stripe" : "demo checkout"}
            </span>
          ) : (
            <span className="text-slate">Covered by your membership&apos;s included ticket</span>
          )}
        </div>
        {payment && (
          <Link href={`/payments/${payment.id}`} className="link text-sm">
            Proof of payment →
          </Link>
        )}
      </section>

      <section className="card">
        <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-3">
          <h2 className="text-sm font-bold">What you sent</h2>
          <ListenButton size="sm" title={`${ticketNumber(ticket.id)}: ${ticket.goal_statement}`} text={`Your goal: ${ticket.goal_statement}. What you typically eat: ${ticket.typical_diet}. Setbacks: ${ticket.setbacks}. Target: ${ticket.specific_target}.${ticket.extra_context ? ` Other context: ${ticket.extra_context}` : ""}`} />
        </div>
        <dl className="grid grid-cols-1 gap-px bg-line md:grid-cols-2">
          {[
            ["What I typically eat", ticket.typical_diet],
            ["Setbacks I face", ticket.setbacks],
            ["Specific target", ticket.specific_target],
            ["Other context", ticket.extra_context || "—"],
          ].map(([k, v]) => (
            <div key={k} className="bg-white px-6 py-4">
              <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">{k}</dt>
              <dd className="mt-1 whitespace-pre-line text-sm">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {response && (
        <section className="card flex flex-wrap items-center justify-between gap-4 bg-navy p-6 text-white">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan">Keep the momentum</div>
            <div className="font-display mt-1 text-2xl">Ready for your next goal?</div>
            <p className="text-sm text-white/70">Most members follow a first plan with a second goal in the same month.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/marketplace" className="btn !border !border-white/40 text-white hover:bg-white/10">Shop your plan</Link>
            <Link href="/tickets/new" className="btn-primary">Open goal 2</Link>
          </div>
        </section>
      )}
    </div>
  );
}
