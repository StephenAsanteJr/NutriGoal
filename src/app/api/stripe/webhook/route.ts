import type Stripe from "stripe";
import { completeCheckout, stripe, stripeEnabled } from "@/lib/stripe";
import { db, newId, nowIso } from "@/lib/db";
import { notify } from "@/lib/data";
import { money } from "@/lib/domain";

/**
 * Stripe webhook. Point a Stripe webhook endpoint (or `stripe listen --forward-to
 * localhost:3000/api/stripe/webhook`) here and set STRIPE_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  if (!stripeEnabled() || !process.env.STRIPE_WEBHOOK_SECRET) return new Response("Stripe webhooks not configured", { status: 501 });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await completeCheckout(event.data.object.id);
      break;
    case "invoice.paid":
      recordRenewal(event.data.object);
      break;
  }
  return Response.json({ received: true });
}

/** Membership renewals: record proof of payment and extend the period. The first invoice is handled by checkout. */
function recordRenewal(invoice: Stripe.Invoice) {
  if (invoice.billing_reason !== "subscription_cycle") return;
  const sub = invoice.parent?.subscription_details?.subscription;
  const subId = typeof sub === "string" ? sub : sub?.id;
  if (!subId) return;
  const original = db()
    .prepare("SELECT user_id, kind, description FROM payments WHERE stripe_subscription_id = ? ORDER BY created_at ASC LIMIT 1")
    .get(subId) as { user_id: string; kind: string; description: string } | undefined;
  if (!original) return;
  if (db().prepare("SELECT 1 FROM payments WHERE stripe_session_id = ?").get(`inv:${invoice.id}`)) return;
  db()
    .prepare(
      `INSERT INTO payments (id, user_id, kind, description, amount_cents, status, created_at, provider, stripe_session_id, stripe_subscription_id, receipt_url)
       VALUES (?, ?, ?, ?, ?, 'succeeded', ?, 'stripe', ?, ?, ?)`,
    )
    .run(newId(), original.user_id, original.kind, `${original.description} · renewal`, invoice.amount_paid, nowIso(), `inv:${invoice.id}`, subId, invoice.hosted_invoice_url ?? null);
  if (original.kind.startsWith("subscription")) {
    const renews = new Date();
    if (original.kind === "subscription_yearly") renews.setFullYear(renews.getFullYear() + 1);
    else renews.setMonth(renews.getMonth() + 1);
    db().prepare("UPDATE subscriptions SET renews_at = ? WHERE user_id = ? AND status = 'active'").run(renews.toISOString(), original.user_id);
  }
  notify(original.user_id, "Payment received", `${original.description} renewed for ${money(invoice.amount_paid)}.`, "/membership");
}
