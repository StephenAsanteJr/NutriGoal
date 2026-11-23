import "server-only";
// What happens after a successful payment, shared by the demo checkout and Stripe.
// Every function is idempotent so a Stripe webhook and the success redirect can
// both call it safely.

import { revalidatePath } from "next/cache";
import { db, newId, nowIso } from "./db";
import { getActiveSubscription, getAddon, notify } from "./data";
import { routeTicket } from "./routing";
import { ticketNumber } from "./domain";

export type PurchaseKind = "ticket" | "ticket_member_extra" | "subscription_monthly" | "subscription_yearly" | "addon";

/** Mark a draft ticket paid and route it to a clinician. No-op if it was already submitted. */
export function submitPaidTicket(userId: string, ticketId: number, method: string) {
  const draft = db()
    .prepare("SELECT id FROM tickets WHERE id = ? AND user_id = ? AND status = 'awaiting_payment'")
    .get(ticketId, userId);
  if (!draft) return false;
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
  return true;
}

/** Start a membership. If `ticketId` is given, that draft uses this month's included ticket. */
export function startMembership(opts: { userId: string; plan: "monthly" | "yearly"; priceCents: number; ticketId?: number | null }) {
  if (getActiveSubscription(opts.userId)) return;
  const now = new Date();
  const renews = new Date(now);
  if (opts.plan === "yearly") renews.setFullYear(renews.getFullYear() + 1);
  else renews.setMonth(renews.getMonth() + 1);
  const creditsReset = new Date(now);
  creditsReset.setMonth(creditsReset.getMonth() + 1);
  const usesCredit = !!opts.ticketId;
  db()
    .prepare(
      `INSERT INTO subscriptions (id, user_id, plan, status, price_cents, started_at, renews_at, ticket_credits, credits_reset_at)
       VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
    )
    .run(newId(), opts.userId, opts.plan, opts.priceCents, now.toISOString(), renews.toISOString(), usesCredit ? 0 : 1, creditsReset.toISOString());
  // Membership includes the Daily Support Pack.
  db().prepare("INSERT OR IGNORE INTO user_addons (user_id, addon_id, unlocked_at) VALUES (?, 'support_pack', ?)").run(opts.userId, nowIso());
  notify(opts.userId, "Welcome to NutriGoal Membership", `Your ${opts.plan} plan is active: 1 ticket a month plus the Daily Support Pack.`, "/membership");
  if (opts.ticketId) submitPaidTicket(opts.userId, opts.ticketId, "subscription");
  revalidatePath("/membership");
}

export function unlockAddonFor(userId: string, addonId: string) {
  const addon = getAddon(addonId);
  if (!addon) return;
  const r = db().prepare("INSERT OR IGNORE INTO user_addons (user_id, addon_id, unlocked_at) VALUES (?, ?, ?)").run(userId, addonId, nowIso());
  if (r.changes) notify(userId, `${addon.name} unlocked`, addon.description, "/marketplace#addons");
  revalidatePath("/marketplace");
}

/** Run the purchase's effect. */
export function fulfill(p: { userId: string; kind: PurchaseKind; amountCents: number; ticketId?: number | null; addonId?: string | null }) {
  switch (p.kind) {
    case "ticket":
      submitPaidTicket(p.userId, p.ticketId!, "one_time");
      break;
    case "ticket_member_extra":
      submitPaidTicket(p.userId, p.ticketId!, "member_extra");
      break;
    case "subscription_monthly":
    case "subscription_yearly":
      startMembership({ userId: p.userId, plan: p.kind === "subscription_yearly" ? "yearly" : "monthly", priceCents: p.amountCents, ticketId: p.ticketId });
      break;
    case "addon":
      if (p.addonId) unlockAddonFor(p.userId, p.addonId);
      break;
  }
}

/** Where to send the member after a purchase completes. */
export function nextUrlAfter(p: { kind: PurchaseKind; ticketId?: number | null }, paymentId: string) {
  if (p.ticketId) return `/tickets/${p.ticketId}?submitted=1${p.kind.startsWith("subscription") ? "&member=1" : ""}&receipt=${paymentId}`;
  if (p.kind.startsWith("subscription")) return `/payments/${paymentId}?new=1`;
  return `/payments/${paymentId}?new=1`;
}
