import "server-only";
// Mock card processor. Validates the card like a real gateway would but never
// charges anything and never stores the full card number. Replace `charge`
// with a Stripe PaymentIntent / Checkout Session when going live.

import { db, newId, nowIso } from "./db";

export type CardInput = { name: string; number: string; exp: string; cvc: string; zip: string };
export type ChargeResult =
  | { ok: true; paymentId: string; brand: string; last4: string }
  | { ok: false; error: string };

export const TEST_CARDS = {
  success: "4242 4242 4242 4242",
  decline: "4000 0000 0000 0002",
};

function luhn(num: string) {
  let sum = 0;
  let dbl = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = +num[i];
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

function brandOf(num: string) {
  if (/^4/.test(num)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(num)) return "Mastercard";
  if (/^3[47]/.test(num)) return "Amex";
  if (/^6(011|5)/.test(num)) return "Discover";
  return "Card";
}

export function validateCard(card: CardInput): string | null {
  const num = card.number.replace(/\D/g, "");
  if (!card.name.trim()) return "Enter the name on the card.";
  if (num.length < 13 || num.length > 19 || !luhn(num)) return "That card number isn't valid.";
  const m = card.exp.match(/^\s*(\d{1,2})\s*\/\s*(\d{2})\s*$/);
  if (!m) return "Enter the expiry as MM/YY.";
  const month = +m[1];
  const year = 2000 + +m[2];
  if (month < 1 || month > 12) return "Enter the expiry as MM/YY.";
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);
  if (endOfMonth < new Date()) return "This card has expired.";
  if (!/^\d{3,4}$/.test(card.cvc.trim())) return "Enter the 3 or 4 digit security code.";
  if (!/^\d{5}$/.test(card.zip.trim())) return "Enter a 5-digit ZIP code.";
  return null;
}

export function charge(opts: {
  userId: string;
  card: CardInput;
  amountCents: number;
  kind: string;
  description: string;
  ticketId?: number | null;
  addonId?: string | null;
}): ChargeResult {
  const invalid = validateCard(opts.card);
  if (invalid) return { ok: false, error: invalid };
  const num = opts.card.number.replace(/\D/g, "");
  if (num === TEST_CARDS.decline.replace(/\s/g, "")) {
    return { ok: false, error: "Your card was declined. Try a different card." };
  }
  const brand = brandOf(num);
  const last4 = num.slice(-4);
  const paymentId = newId();
  db()
    .prepare(
      `INSERT INTO payments (id, user_id, kind, description, amount_cents, card_brand, card_last4, ticket_id, addon_id, status, provider, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'succeeded', 'demo', ?)`,
    )
    .run(paymentId, opts.userId, opts.kind, opts.description, opts.amountCents, brand, last4, opts.ticketId ?? null, opts.addonId ?? null, nowIso());
  return { ok: true, paymentId, brand, last4 };
}

export function cardFromForm(fd: FormData): CardInput {
  return {
    name: String(fd.get("card_name") ?? ""),
    number: String(fd.get("card_number") ?? ""),
    exp: String(fd.get("card_exp") ?? ""),
    cvc: String(fd.get("card_cvc") ?? ""),
    zip: String(fd.get("card_zip") ?? ""),
  };
}
