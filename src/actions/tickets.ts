"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, newId, nowIso } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { getActiveSubscription, notify } from "@/lib/data";
import { routeTicket } from "@/lib/routing";
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

function submitPaidTicket(userId: string, ticketId: number, method: string) {
  db().prepare("UPDATE tickets SET paid_at = ?, payment_method = ? WHERE id = ?").run(nowIso(), method, ticketId);
  const clinician = routeTicket(ticketId);
  notify(
    userId,
    `Ticket ${ticketNumber(ticketId)} submitted`,
    `${clinician.name}, ${clinician.credential} will send your response ticket within 48 hours.`,
    `/tickets/${ticketId}`,
  );
  revalidatePath("/dashboard");
  revalidatePath("/tickets");
}

/** Option 1: one-time $19.99 ticket. */
export async function payTicketOnce(_: PayState, fd: FormData): Promise<PayState> {
  const user = await requireMember();
  const ticketId = Number(fd.get("ticket_id"));
  const draft = loadDraft(user.id, ticketId);
  if (!draft) return { error: "This ticket was already submitted or can't be found." };
  const res = charge({
    userId: user.id,
    card: cardFromForm(fd),
    amountCents: PRICES.ticketOneTime,
    kind: "ticket",
    description: `Goal ticket ${ticketNumber(ticketId)}`,
    ticketId,
  });
  if (!res.ok) return { error: res.error };
  submitPaidTicket(user.id, ticketId, "one_time");
  redirect(`/tickets/${ticketId}?submitted=1`);
}

/** Option 2: join the membership (monthly or yearly); this ticket uses the included monthly ticket. */
export async function subscribeAndSubmit(_: PayState, fd: FormData): Promise<PayState> {
  const user = await requireMember();
  const ticketId = Number(fd.get("ticket_id") || 0);
  const plan = fd.get("plan") === "yearly" ? "yearly" : "monthly";
  if (getActiveSubscription(user.id)) return { error: "You're already a member. Use your included ticket instead." };
  const draft = ticketId ? loadDraft(user.id, ticketId) : null;
  if (ticketId && !draft) return { error: "This ticket was already submitted or can't be found." };

  const price = plan === "yearly" ? PRICES.subscriptionYearly : PRICES.subscriptionMonthly;
  const res = charge({
    userId: user.id,
    card: cardFromForm(fd),
    amountCents: price,
    kind: plan === "yearly" ? "subscription_yearly" : "subscription_monthly",
    description: `NutriGoal Membership · ${plan}`,
    ticketId: ticketId || null,
  });
  if (!res.ok) return { error: res.error };

  const now = new Date();
  const renews = new Date(now);
  if (plan === "yearly") renews.setFullYear(renews.getFullYear() + 1);
  else renews.setMonth(renews.getMonth() + 1);
  const creditsReset = new Date(now);
  creditsReset.setMonth(creditsReset.getMonth() + 1);
  db()
    .prepare(
      `INSERT INTO subscriptions (id, user_id, plan, status, price_cents, started_at, renews_at, ticket_credits, credits_reset_at)
       VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
    )
    .run(newId(), user.id, plan, price, now.toISOString(), renews.toISOString(), draft ? 0 : 1, creditsReset.toISOString());
  // Membership includes the Daily Support Pack.
  db().prepare("INSERT OR IGNORE INTO user_addons (user_id, addon_id, unlocked_at) VALUES (?, 'support_pack', ?)").run(user.id, nowIso());
  notify(user.id, "Welcome to NutriGoal Membership", `Your ${plan} plan is active: 1 ticket a month plus the Daily Support Pack.`, "/membership");

  if (draft) {
    submitPaidTicket(user.id, ticketId, "subscription");
    redirect(`/tickets/${ticketId}?submitted=1&member=1`);
  }
  revalidatePath("/membership");
  redirect("/membership?welcome=1");
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
  const res = charge({
    userId: user.id,
    card: cardFromForm(fd),
    amountCents: PRICES.extraTicketMember,
    kind: "ticket_member_extra",
    description: `Extra goal ticket ${ticketNumber(ticketId)} (member price ${money(PRICES.extraTicketMember)})`,
    ticketId,
  });
  if (!res.ok) return { error: res.error };
  submitPaidTicket(user.id, ticketId, "member_extra");
  redirect(`/tickets/${ticketId}?submitted=1`);
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
