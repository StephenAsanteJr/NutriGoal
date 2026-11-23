import "server-only";
// Stripe Checkout integration. Enabled when STRIPE_SECRET_KEY is set; otherwise the
// app uses the built-in demo checkout. Fulfillment is idempotent and runs from
// both the success redirect (/payments/complete) and the webhook (/api/stripe/webhook).

import Stripe from "stripe";
import { headers } from "next/headers";
import { db, newId, nowIso } from "./db";
import { fulfill, type PurchaseKind } from "./fulfillment";

export function stripeEnabled() {
  return !!process.env.STRIPE_SECRET_KEY;
}

let _stripe: Stripe | null = null;
export function stripe() {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return _stripe;
}

async function origin() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Create a hosted Checkout Session and return its URL. */
export async function createCheckout(opts: {
  userId: string;
  email: string;
  kind: PurchaseKind;
  description: string;
  amountCents: number;
  cancelPath: string;
  ticketId?: number | null;
  addonId?: string | null;
  /** For monthly add-ons: bill as a Stripe subscription. */
  interval?: "month" | "year";
}) {
  const base = await origin();
  const recurring =
    opts.kind === "subscription_monthly"
      ? { interval: "month" as const }
      : opts.kind === "subscription_yearly"
        ? { interval: "year" as const }
        : opts.interval
          ? { interval: opts.interval }
          : null;
  const metadata = {
    user_id: opts.userId,
    kind: opts.kind,
    ticket_id: opts.ticketId ? String(opts.ticketId) : "",
    addon_id: opts.addonId ?? "",
  };
  const session = await stripe().checkout.sessions.create({
    mode: recurring ? "subscription" : "payment",
    customer_email: opts.email,
    client_reference_id: opts.userId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: opts.amountCents,
          product_data: { name: opts.description },
          ...(recurring ? { recurring } : {}),
        },
      },
    ],
    metadata,
    ...(recurring ? { subscription_data: { metadata } } : { payment_intent_data: { metadata } }),
    success_url: `${base}/payments/complete?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}${opts.cancelPath}`,
  });
  db()
    .prepare(
      `INSERT INTO checkout_sessions (id, user_id, kind, description, amount_cents, ticket_id, addon_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
    )
    .run(session.id, opts.userId, opts.kind, opts.description, opts.amountCents, opts.ticketId ?? null, opts.addonId ?? null, nowIso());
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}

type CheckoutRow = {
  id: string;
  user_id: string;
  kind: PurchaseKind;
  description: string;
  amount_cents: number;
  ticket_id: number | null;
  addon_id: string | null;
  status: string;
  payment_id: string | null;
};

/**
 * Verify a Checkout Session with Stripe and, if paid, record the payment (proof of payment)
 * and fulfil the purchase. Safe to call more than once.
 */
export async function completeCheckout(sessionId: string, expectUserId?: string) {
  const row = db().prepare("SELECT * FROM checkout_sessions WHERE id = ?").get(sessionId) as CheckoutRow | undefined;
  if (!row) return { ok: false as const, error: "We couldn't find that checkout." };
  if (expectUserId && row.user_id !== expectUserId) return { ok: false as const, error: "We couldn't find that checkout." };
  if (row.payment_id) return { ok: true as const, paymentId: row.payment_id, row };

  const session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["payment_intent.latest_charge", "invoice"] });
  if (session.payment_status !== "paid") return { ok: false as const, error: "This payment hasn't completed yet." };

  let brand: string | null = null;
  let last4: string | null = null;
  let receiptUrl: string | null = null;
  let paymentIntentId: string | null = null;
  const pi = session.payment_intent;
  if (pi && typeof pi !== "string") {
    paymentIntentId = pi.id;
    const charge = pi.latest_charge;
    if (charge && typeof charge !== "string") {
      receiptUrl = charge.receipt_url ?? null;
      brand = charge.payment_method_details?.card?.brand ?? null;
      last4 = charge.payment_method_details?.card?.last4 ?? null;
    }
  }
  const invoice = session.invoice;
  if (!receiptUrl && invoice && typeof invoice !== "string") receiptUrl = invoice.hosted_invoice_url ?? null;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : (session.subscription?.id ?? null);

  const paymentId = newId();
  const inserted = db().transaction(() => {
    const again = db().prepare("SELECT payment_id FROM checkout_sessions WHERE id = ?").get(sessionId) as { payment_id: string | null };
    if (again.payment_id) return again.payment_id;
    db()
      .prepare(
        `INSERT INTO payments (id, user_id, kind, description, amount_cents, card_brand, card_last4, ticket_id, status, created_at,
           provider, stripe_session_id, stripe_payment_intent, stripe_subscription_id, receipt_url, addon_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'succeeded', ?, 'stripe', ?, ?, ?, ?, ?)`,
      )
      .run(
        paymentId,
        row.user_id,
        row.kind,
        row.description,
        session.amount_total ?? row.amount_cents,
        brand ? brand[0].toUpperCase() + brand.slice(1) : null,
        last4,
        row.ticket_id,
        nowIso(),
        sessionId,
        paymentIntentId,
        subscriptionId,
        receiptUrl,
        row.addon_id,
      );
    db().prepare("UPDATE checkout_sessions SET status = 'paid', payment_id = ?, fulfilled_at = ? WHERE id = ?").run(paymentId, nowIso(), sessionId);
    return paymentId;
  })();

  if (inserted === paymentId) {
    fulfill({ userId: row.user_id, kind: row.kind, amountCents: row.amount_cents, ticketId: row.ticket_id, addonId: row.addon_id });
  }
  return { ok: true as const, paymentId: inserted, row };
}
