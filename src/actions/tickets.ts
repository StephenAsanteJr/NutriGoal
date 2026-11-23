"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db, nowIso } from "@/lib/db";
import { fulfill, nextUrlAfter, submitPaidTicket, type PurchaseKind } from "@/lib/fulfillment";
import { createCheckout, stripeEnabled } from "@/lib/stripe";
import { requireMember } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/data";
import { cardFromForm, charge } from "@/lib/payments";
import { GOAL_TYPES, PRICES, money, ticketNumber } from "@/lib/domain";

export type TicketFormState = { error?: string; fieldErrors?: Record<string, string> } | undefined;
export type PayState = { error?: string } | undefined;

const ticketSchema = z.object({
  goal_type: z.enum(GOAL_TYPES.map((g) => g.id) as [string, ...string[]], { message: "Pick the goal type." }),
  goal_statement: z.string().trim().min(10, "Describe your goal in a sentence (10+ characters).").max(200),
  typical_diet: z.string().trim().min(10, "Tell us what a typical day of eating looks like.").max(1200),
  setbacks: z.string().trim().min(5, "Share at least one setback, even a small one.").max(1200),
  specific_target: z.string().trim().min(5, "Name the specific target you want to hit.").max(300),
  extra_context: z.string().trim().max(800).optional(),
});

export async function saveTicketDraft(_: TicketFormState, fd: FormData): Promise<TicketFormState> {
  const user = await requireMember();
  const parsed = ticketSchema.safeParse({
    goal_type: fd.get("goal_type"),
    goal_statement: fd.get("goal_statement"),
    typical_diet: fd.get("typical_diet"),
    setbacks: fd.get("setbacks"),
    specific_target: fd.get("specific_target"),
    extra_context: fd.get("extra_context") || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { fieldErrors, error: "Please complete the highlighted fields." };
  }
  const t = parsed.data;
  const draftId = Number(fd.get("draft_id") || 0);
  let id: number;
  const owned = draftId
    ? db().prepare("SELECT id FROM tickets WHERE id = ? AND user_id = ? AND status = 'awaiting_payment'").get(draftId, user.id)
    : null;
  if (owned) {
    db()
      .prepare(
        `UPDATE tickets SET goal_type = ?, goal_statement = ?, typical_diet = ?, setbacks = ?, specific_target = ?, extra_context = ? WHERE id = ?`,
      )
      .run(t.goal_type, t.goal_statement, t.typical_diet, t.setbacks, t.specific_target, t.extra_context ?? null, draftId);
    id = draftId;
  } else {
    const res = db()
      .prepare(
        `INSERT INTO tickets (user_id, goal_type, goal_statement, typical_diet, setbacks, specific_target, extra_context, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'awaiting_payment', ?)`,
      )
      .run(user.id, t.goal_type, t.goal_statement, t.typical_diet, t.setbacks, t.specific_target, t.extra_context ?? null, nowIso());
    id = Number(res.lastInsertRowid);
  }
  redirect(`/tickets/new?draft=${id}`);
}

function loadDraft(userId: string, ticketId: number) {
  return db()
    .prepare("SELECT * FROM tickets WHERE id = ? AND user_id = ? AND status = 'awaiting_payment'")
    .get(ticketId, userId) as { id: number; goal_statement: string } | undefined;
}

/**
 * Take payment for a purchase: Stripe Checkout when configured (redirects away),
 * otherwise the demo card form. On success, fulfils and redirects to proof of payment.
 */
async function takePayment(
  user: { id: string; email: string },
  fd: FormData,
  p: { kind: PurchaseKind; amountCents: number; description: string; ticketId?: number | null; cancelPath: string },
): Promise<PayState> {
  if (stripeEnabled()) {
    let url: string;
    try {
      url = await createCheckout({ userId: user.id, email: user.email, ...p });
    } catch {
      return { error: "We couldn't start a secure Stripe checkout. Please try again." };
    }
    redirect(url);
  }
  const res = charge({ userId: user.id, card: cardFromForm(fd), amountCents: p.amountCents, kind: p.kind, description: p.description, ticketId: p.ticketId ?? null });
  if (!res.ok) return { error: res.error };
  fulfill({ userId: user.id, kind: p.kind, amountCents: p.amountCents, ticketId: p.ticketId });
  redirect(nextUrlAfter(p, res.paymentId));
}

/** Option 1: one-time $19.99 ticket. */
export async function payTicketOnce(_: PayState, fd: FormData): Promise<PayState> {
  const user = await requireMember();
  const ticketId = Number(fd.get("ticket_id"));
  if (!loadDraft(user.id, ticketId)) return { error: "This ticket was already submitted or can't be found." };
  return takePayment(user, fd, {
    kind: "ticket",
    amountCents: PRICES.ticketOneTime,
    description: `NutriGoal goal ticket ${ticketNumber(ticketId)}`,
    ticketId,
    cancelPath: `/tickets/new?draft=${ticketId}&canceled=1`,
  });
}

/** Option 2: join the membership (monthly or yearly); a draft ticket uses this month's included ticket. */
export async function subscribeAndSubmit(_: PayState, fd: FormData): Promise<PayState> {
  const user = await requireMember();
  const ticketId = Number(fd.get("ticket_id") || 0);
  const plan = fd.get("plan") === "yearly" ? "yearly" : "monthly";
  if (getActiveSubscription(user.id)) return { error: "You're already a member. Use your included ticket instead." };
  if (ticketId && !loadDraft(user.id, ticketId)) return { error: "This ticket was already submitted or can't be found." };
  return takePayment(user, fd, {
    kind: plan === "yearly" ? "subscription_yearly" : "subscription_monthly",
    amountCents: plan === "yearly" ? PRICES.subscriptionYearly : PRICES.subscriptionMonthly,
    description: `NutriGoal Membership · ${plan}`,
    ticketId: ticketId || null,
    cancelPath: ticketId ? `/tickets/new?draft=${ticketId}&canceled=1` : "/membership?canceled=1",
  });
}

/** Members: use the included monthly ticket. */
export async function redeemIncludedTicket(_: PayState, fd: FormData): Promise<PayState> {
  const user = await requireMember();
  const ticketId = Number(fd.get("ticket_id"));
  if (!loadDraft(user.id, ticketId)) return { error: "This ticket was already submitted or can't be found." };
  const sub = getActiveSubscription(user.id);
  if (!sub) return { error: "You don't have an active membership." };
  if (sub.ticket_credits < 1) return { error: "You've used this month's included ticket." };
  db().prepare("UPDATE subscriptions SET ticket_credits = ticket_credits - 1 WHERE id = ?").run(sub.id);
  submitPaidTicket(user.id, ticketId, "subscription");
  redirect(`/tickets/${ticketId}?submitted=1`);
}

/** Members who've used this month's ticket: extra ticket at the member price. */
export async function payExtraTicket(_: PayState, fd: FormData): Promise<PayState> {
  const user = await requireMember();
  const ticketId = Number(fd.get("ticket_id"));
  if (!loadDraft(user.id, ticketId)) return { error: "This ticket was already submitted or can't be found." };
  if (!getActiveSubscription(user.id)) return { error: "Member pricing needs an active membership." };
  return takePayment(user, fd, {
    kind: "ticket_member_extra",
    amountCents: PRICES.extraTicketMember,
    description: `Extra goal ticket ${ticketNumber(ticketId)} (member price ${money(PRICES.extraTicketMember)})`,
    ticketId,
    cancelPath: `/tickets/new?draft=${ticketId}&canceled=1`,
  });
}

export async function discardDraft(fd: FormData) {
  const user = await requireMember();
  const ticketId = Number(fd.get("ticket_id"));
  db().prepare("DELETE FROM tickets WHERE id = ? AND user_id = ? AND status = 'awaiting_payment'").run(ticketId, user.id);
  redirect("/tickets");
}

export async function markResponseSeen(ticketId: number) {
  const user = await requireMember();
  db()
    .prepare("UPDATE tickets SET member_seen_at = COALESCE(member_seen_at, ?) WHERE id = ? AND user_id = ? AND status = 'responded'")
    .run(nowIso(), ticketId, user.id);
  db()
    .prepare("UPDATE notifications SET read_at = COALESCE(read_at, ?) WHERE user_id = ? AND link = ?")
    .run(nowIso(), user.id, `/tickets/${ticketId}`);
}
