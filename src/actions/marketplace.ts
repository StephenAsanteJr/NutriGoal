"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, nowIso } from "@/lib/db";
import { getCurrentUser, requireMember } from "@/lib/auth";
import { getActiveSubscription, getAddon } from "@/lib/data";
import { unlockAddonFor } from "@/lib/fulfillment";
import { createCheckout, stripeEnabled } from "@/lib/stripe";
import { cardFromForm, charge } from "@/lib/payments";

export type UnlockState = { error?: string; ok?: boolean; paymentId?: string } | undefined;

export async function togglePartner(fd: FormData) {
  const user = await requireMember();
  const partnerId = String(fd.get("partner_id") ?? "");
  const exists = db().prepare("SELECT 1 FROM partner_connections WHERE user_id = ? AND partner_id = ?").get(user.id, partnerId);
  if (exists) {
    db().prepare("DELETE FROM partner_connections WHERE user_id = ? AND partner_id = ?").run(user.id, partnerId);
  } else if (db().prepare("SELECT 1 FROM partners WHERE id = ?").get(partnerId)) {
    db().prepare("INSERT INTO partner_connections (user_id, partner_id, connected_at) VALUES (?, ?, ?)").run(user.id, partnerId, nowIso());
  }
  revalidatePath("/marketplace");
}

export async function unlockAddon(_: UnlockState, fd: FormData): Promise<UnlockState> {
  const user = await requireMember();
  const addon = getAddon(String(fd.get("addon_id") ?? ""));
  if (!addon) return { error: "Add-on not found." };
  const already = db().prepare("SELECT 1 FROM user_addons WHERE user_id = ? AND addon_id = ?").get(user.id, addon.id);
  if (already) return { ok: true };

  const member = getActiveSubscription(user.id);
  if (addon.included_with_membership && member) {
    unlockAddonFor(user.id, addon.id);
    return { ok: true };
  }
  const description = `${addon.name}${addon.interval === "month" ? " · monthly" : ""}`;
  if (stripeEnabled()) {
    let url: string;
    try {
      url = await createCheckout({
        userId: user.id,
        email: user.email,
        kind: "addon",
        description,
        amountCents: addon.price_cents,
        addonId: addon.id,
        interval: addon.interval === "month" ? "month" : undefined,
        cancelPath: "/marketplace?canceled=1#addons",
      });
    } catch {
      return { error: "We couldn't start a secure Stripe checkout. Please try again." };
    }
    redirect(url);
  }
  const res = charge({ userId: user.id, card: cardFromForm(fd), amountCents: addon.price_cents, kind: "addon", description, addonId: addon.id });
  if (!res.ok) return { error: res.error };
  unlockAddonFor(user.id, addon.id);
  return { ok: true, paymentId: res.paymentId };
}

export async function markAllNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) return;
  db().prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL").run(nowIso(), user.id);
  revalidatePath("/", "layout");
}
