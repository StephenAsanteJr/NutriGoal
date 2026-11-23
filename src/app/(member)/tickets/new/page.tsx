import Link from "next/link";
import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveSubscription, getProfile, type TicketRow } from "@/lib/data";
import { goalLabel, ticketNumber } from "@/lib/domain";
import { TicketForm } from "./TicketForm";
import { PaymentOptions } from "./PaymentOptions";
import { discardDraft } from "@/actions/tickets";

export const metadata: Metadata = { title: "New goal ticket" };

export default async function NewTicketPage(props: PageProps<"/tickets/new">) {
  const user = await requireMember();
  const sp = await props.searchParams;
  const draftId = Number(sp.draft || 0);
  const draft = draftId
    ? ((db().prepare("SELECT * FROM tickets WHERE id = ? AND user_id = ? AND status = 'awaiting_payment'").get(draftId, user.id) as TicketRow | undefined) ?? null)
    : null;
  const editing = !!draft && sp.edit === "1";
  const showOptions = !!draft && !editing;
  const sub = getActiveSubscription(user.id);
  const stage = getProfile(user.id)?.medication_stage ?? "none";

  return (
    <div>
      <div className="mb-8">
        <div className="eyebrow mb-2">New goal ticket</div>
        <h1 className="font-display text-4xl">{showOptions ? "Choose how to submit your ticket" : "Describe your nutrition goal"}</h1>
        <ol className="mt-5 flex items-center gap-3 text-sm" aria-label="Progress">
          <StepDot n={1} label="Describe your goal" state={showOptions ? "done" : "current"} />
          <span className="h-px w-10 bg-line" aria-hidden />
          <StepDot n={2} label="Submit and pay" state={showOptions ? "current" : "todo"} />
          <span className="h-px w-10 bg-line" aria-hidden />
          <StepDot n={3} label="Clinician responds in 48 hrs" state="todo" />
        </ol>
      </div>

      {!showOptions ? (
        <TicketForm
          draft={
            draft
              ? {
                  id: draft.id,
                  goal_type: draft.goal_type,
                  goal_statement: draft.goal_statement,
                  typical_diet: draft.typical_diet,
                  setbacks: draft.setbacks,
                  specific_target: draft.specific_target,
                  extra_context: draft.extra_context ?? "",
                }
              : null
          }
          onGlp1={stage !== "none" && stage !== "considering"}
        />
      ) : (
        <div className="space-y-6">
          {/* The ticket, collapsed into a summary strip */}
          <section className="card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-3">
              <div className="flex items-center gap-3">
                <span className="pill bg-good-tint text-good">✓ Ticket ready</span>
                <span className="font-mono text-xs text-muted">{ticketNumber(draft.id)} · draft</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <Link href={`/tickets/new?draft=${draft.id}&edit=1`} className="link">Edit ticket</Link>
                <form action={discardDraft}>
                  <input type="hidden" name="ticket_id" value={draft.id} />
                  <button className="text-xs font-bold text-muted hover:text-alert">Discard</button>
                </form>
              </div>
            </div>
            <dl className="grid gap-px bg-line md:grid-cols-4">
              <SummaryItem label="Goal" value={`${goalLabel(draft.goal_type)} — ${draft.goal_statement}`} />
              <SummaryItem label="What I typically eat" value={draft.typical_diet} />
              <SummaryItem label="Setbacks" value={draft.setbacks} />
              <SummaryItem label="Specific target" value={draft.specific_target} />
            </dl>
          </section>

          <PaymentOptions
            ticketId={draft.id}
            membership={sub ? { plan: sub.plan, credits: sub.ticket_credits, nextCredit: sub.credits_reset_at } : null}
          />
        </div>
      )}
    </div>
  );
}

function StepDot({ n, label, state }: { n: number; label: string; state: "done" | "current" | "todo" }) {
  const dot =
    state === "done" ? "bg-good text-white" : state === "current" ? "bg-blue text-white" : "border border-line bg-white text-muted";
  return (
    <li className="flex items-center gap-2" aria-current={state === "current" ? "step" : undefined}>
      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${dot}`}>{state === "done" ? "✓" : n}</span>
      <span className={state === "todo" ? "text-muted" : "font-bold"}>{label}</span>
    </li>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-6 py-4">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-1 line-clamp-3 text-sm">{value}</dd>
    </div>
  );
}
